
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

type ReserveResult = {
  company_key: string;
  company_name: string;
  reserved_by: string;
  reserved_at: string;
  last_activity_at: string;
};

export default function ReservePage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [reserved, setReserved] = useState<ReserveResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/login");
      }
    };
    checkSession();
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
        setInfoMsg("KEEP_ALIVE_FAILURE: SYSTEM_DISCONNECT_RISK");
      } else {
        setInfoMsg("SYSTEM_STATUS: CONNECTION_STABLE");
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [reserved?.company_key]);

  const onReserve = async () => {
    setErrorMsg(null);
    setInfoMsg(null);

    const name = companyName.trim();
    if (!name) {
      setErrorMsg("VALIDATION_ERROR: IDENTIFIER_REQUIRED");
      return;
    }

    setLoading(true);
    try {
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
        setErrorMsg("RESERVATION_FAILURE: NULL_IDENTIFIER_RETURNED");
        setReserved(null);
        return;
      }

      setReserved({
        company_key: row.company_key,
        company_name: row.company_name,
        reserved_by: row.reserved_by,
        reserved_at: row.reserved_at,
        last_activity_at: row.last_activity_at
      });
      setInfoMsg("RESERVATION_SUCCESS: SYSTEM_RESOURCE_LOCKED");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "UNKNOWN_SYSTEM_FAULT");
      setReserved(null);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

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
              onClick={onReserve}
              disabled={loading || !!reserved}
              style={{ width: 'auto', borderRadius: '30px', height: '42px' }}
            >
              {loading ? "Assigning..." : "Reserve Company"}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ 
            marginTop: 32, 
            padding: 16, 
            border: "1px solid #ef4444",
            color: '#ef4444',
            fontSize: '0.7rem',
            fontFamily: 'JetBrains Mono',
            textTransform: 'uppercase',
            borderRadius: '8px'
          }}>
            ERROR_LOG: {errorMsg}
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
                onClick={() => navigate(`/research?company_key=${reserved.company_key}`)}
                style={{ width: 'auto', borderRadius: '30px', padding: '1rem 3rem' }}
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
