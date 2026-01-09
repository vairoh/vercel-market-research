
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import buttonStyles from "../styles/buttons.module.css";

type ReserveResult = {
  company_key: string;
  company_name: string;
  reserved_by: string;
  reserved_at: string;
  last_activity_at: string;
  reservation_status: string;
  reservation_expires_at: string;
};

const normalizeCompanyName = (name: string) => {
  const lower = name.toLowerCase();
  const noPunct = lower.replace(/[^a-z0-9\s]/g, " ");
  const noSuffix = noPunct.replace(/\b(inc|incorporated|llc|ltd|limited|gmbh|ag|plc|corp|corporation|co|company|sa|sarl|bv|kg|oy|srl|spa|pte|pty|ab|as|nv|llp)\b/g, " ");
  return noSuffix.replace(/\s+/g, " ").trim();
};

export default function ReservePage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [reserved, setReserved] = useState<ReserveResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkActiveReservation = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Check if this user already has an active, non-expired reservation
      const { data, error } = await supabase
        .from("company_registry")
        .select("company_key, company_name, last_activity_at")
        .eq("reserved_by", session.user.id)
        .gt("last_activity_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!error && data) {
        setInfoMsg(`RESTORING SESSION FOR ${data.company_name.toUpperCase()}...`);
        navigate(`/research?company_key=${data.company_key}`, { replace: true });
      } else {
        setLoading(false);
      }
    };
    checkActiveReservation();
  }, [navigate]);

  // keep-alive every 60s once reserved
  useEffect(() => {
    if (!reserved?.company_key) return;

    const interval = window.setInterval(async () => {
      const { error } = await supabase.rpc("keep_alive_company", {
        p_company_key: reserved.company_key,
      });

      if (error) {
        console.error("keep_alive_company error:", error);
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [reserved?.company_key]);

  const onReserve = async () => {
    setErrorMsg(null);
    setInfoMsg(null);

    const name = companyName.trim();
    if (!name) {
      setErrorMsg("Target company name is required.");
      return;
    }

    const normalizedName = normalizeCompanyName(name);
    setLoading(true);
    try {
      // 1. First, check if the current user already has an active reservation for this company
      const { data: existing, error: checkError } = await supabase
        .from("company_registry")
        .select("company_key, reserved_by")
        .eq("company_name_normalized", normalizedName)
        .maybeSingle();

      const { data: legacyExisting, error: legacyError } = await supabase
        .from("company_registry")
        .select("company_key, reserved_by")
        .eq("company_name", name)
        .maybeSingle();

      const resolvedExisting = existing || legacyExisting;

      if (resolvedExisting && resolvedExisting.reserved_by === (await supabase.auth.getUser()).data.user?.id) {
        navigate(`/research?company_key=${resolvedExisting.company_key}`, { replace: true });
        return;
      }

      // 2. If not already owned, attempt to reserve
      const { data, error } = await supabase.rpc("reserve_company", {
        p_company_name: name,
      });

      if (error) {
        // Handle the specific error message from our SQL function
        if (error.message.includes('currently reserved')) {
          setErrorMsg("This company is already taken. Please search for a different company.");
        } else {
          setErrorMsg(error.message);
        }
        setReserved(null);
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.company_key) {
        setErrorMsg("Reservation failed. Please try again.");
        setReserved(null);
        return;
      }

      navigate(`/research?company_key=${row.company_key}`, { replace: true });
    } catch (e: any) {
      console.error(e);
      setErrorMsg("An unexpected error occurred. Please try again.");
      setReserved(null);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading && !reserved) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontFamily: 'JetBrains Mono',
        color: '#000000'
      }}>
        {infoMsg || "INITIALIZING_SYSTEM..."}
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '0 auto', 
      padding: '20px',
      minHeight: '100vh'
    }} className="animate-fade-in">
      <div className="logo-container">
        <h1>ATOMITY</h1>
        <div className="tagline">Market & Competitive Intelligence</div>
      </div>

      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: '4rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #000000'
      }}>
        <h2 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Company Research Assignment</h2>
        <button 
          className={buttonStyles.text}
          onClick={onLogout}
          style={{ 
            background: 'transparent', 
            color: '#71717a',
            border: 'none',
            fontSize: '0.7rem',
            padding: 0,
            textDecoration: 'none',
            minWidth: 'auto',
            width: 'auto',
            letterSpacing: '0.05em',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </header>

      <div className="card" style={{ borderRadius: '16px' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: '#000000' }}>
            Select Research Company
          </h3>
          <p style={{ fontSize: '0.85rem', letterSpacing: '0.01em', fontWeight: 400, lineHeight: 1.6, color: '#3f3f46' }}>
            To begin your analysis, please specify the company you will be researching. 
            Your reservation ensures exclusive access to this data stream for the next 24 hours. 
            Please note that if no progress is detected within this timeframe, the system will 
            automatically release the company for other researchers to acquire.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontSize: '0.65rem', 
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#71717a'
            }}>
              Target Company
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Name of the company you will research"
              style={{ width: '100%', borderRadius: '8px' }}
              disabled={loading || !!reserved}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className={`${buttonStyles.primary} ${buttonStyles.pill}`}
              onClick={onReserve}
              disabled={loading || !!reserved}
              style={{ width: 'auto', height: '42px' }}
            >
              {loading ? "Assigning..." : "Reserve Company"}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ 
            marginTop: 32, 
            padding: '1.25rem', 
            border: "1px solid #fee2e2",
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            fontSize: '0.85rem',
            fontWeight: 500,
            borderRadius: '12px',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.2rem' }}>•</span>
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div style={{ 
            marginTop: 32, 
            padding: 16, 
            border: "1px solid #000000",
            fontSize: '0.7rem',
            fontFamily: 'JetBrains Mono',
            textTransform: 'uppercase',
            borderRadius: '8px'
          }}>
            SYSTEM_STATUS: {infoMsg}
          </div>
        )}

        {reserved && (
          <div style={{ 
            marginTop: '5rem', 
            padding: '3rem', 
            border: "2px solid #000000",
            position: 'relative',
            borderRadius: '16px'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '-12px', 
              left: '24px', 
              background: '#fff', 
              padding: '0 12px',
              fontSize: '0.7rem',
              fontWeight: 900,
              letterSpacing: '0.25em'
            }}>
              SECURED_DATA_STREAM
            </div>
            
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#000000', letterSpacing: '-0.03em', textTransform: 'uppercase' }}>
              {reserved.company_name}
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 40,
              marginTop: 40,
              paddingTop: 40,
              borderTop: '1px solid #000000'
            }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: '#71717a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>Protocol // UID</div>
                <code style={{ fontSize: '0.9rem', background: 'transparent', border: 'none', padding: 0 }}>{reserved.company_key}</code>
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: '#71717a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>Creation // UTC</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {new Date(reserved.reserved_at).toISOString().split('T')[0]}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <button 
                className={`${buttonStyles.primary} ${buttonStyles.pill}`}
                onClick={() => navigate(`/research?company_key=${reserved.company_key}`)}
                style={{ width: 'auto', padding: '1rem 3rem' }}
              >
                Continue to Research
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
