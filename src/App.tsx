import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMagicLink = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/reserve`,
      },
    });


    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px' }} className="animate-fade-in">
      <div className="logo-container">
        <h1>ATOMITY</h1>
        <div className="tagline">Market intelligence / Market Analysis</div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Authentication
            </h2>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Sign in to access the analysis</p>
          </div>

          {sent ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem', 
              border: '1px solid #ffffff',
              color: '#ffffff'
            }}>
              <p style={{ color: 'inherit', margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>
                Check your email for the access link.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontSize: '0.7rem', 
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-secondary)'
                }}>
                  Your Email
                </label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button onClick={sendMagicLink} style={{ width: '100%' }}>
                Send Link
              </button>
              {error && (
                <p style={{ 
                  color: '#ef4444', 
                  fontSize: '0.75rem', 
                  textAlign: 'center',
                  fontFamily: 'JetBrains Mono',
                  margin: 0 
                }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function Reserve() {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [reserved, setReserved] = useState<{
    company_key: string;
    company_name: string;
    reserved_by: string;
    reserved_at: string;
    last_activity_at: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // keep-alive every 60s once reserved
  useEffect(() => {
    if (!reserved?.company_key) return;

    const interval = window.setInterval(async () => {
      const { error } = await supabase.rpc("keep_alive_company", {
        p_company_key: reserved.company_key,
      });

      if (error) {
        console.error("keep_alive_company error:", error);
        setInfoMsg("⚠️ Keep-alive failed (check console)");
      } else {
        setInfoMsg("✅ Reservation active (auto keep-alive running)");
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [reserved?.company_key]);

  const onReserve = async () => {
    setErrorMsg(null);
    setInfoMsg(null);

    const name = companyName.trim();
    if (!name) {
      setErrorMsg("Please enter a company name.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("reserve_company", {
        p_company_name: name,
      });

      if (error) {
        setErrorMsg(error.message);
        setReserved(null);
        return;
      }

      // reserve_company returns a table (array). Take first row.
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.company_key) {
        setErrorMsg("Reservation failed (no company_key returned).");
        setReserved(null);
        return;
      }

      setReserved(row);
      setInfoMsg("Company secured successfully. Research phase initialized.");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Unknown system error");
      setReserved(null);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
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
        <div className="tagline">Market intelligence / Market Analysis</div>
      </div>

      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: '4rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <h2 style={{ margin: 0, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Terminal / Reserve</h2>
        <button 
          onClick={onLogout}
          style={{ 
            background: 'transparent', 
            color: '#ffffff',
            border: 'none',
            fontSize: '0.7rem',
            padding: 0,
            textDecoration: 'underline'
          }}
        >
          Disconnect
        </button>
      </header>

      <div className="card">
        <p style={{ marginBottom: '2.5rem', fontSize: '0.875rem', letterSpacing: '0.05em' }}>
          Secure a company identifier to begin deep market analysis. Valid for 48h.
        </p>

        <div style={{ display: "flex", gap: 0 }}>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="SYSTEM_QUERY: [ENTER COMPANY NAME]"
            style={{ flex: 1, borderRight: 'none' }}
            disabled={loading || !!reserved}
          />
          <button
            onClick={onReserve}
            disabled={loading || !!reserved}
            style={{ whiteSpace: 'nowrap', padding: '0 3rem' }}
          >
            {loading ? "Processing..." : "Secure"}
          </button>
        </div>

        {errorMsg && (
          <div style={{ 
            marginTop: 32, 
            padding: 16, 
            border: "1px solid #ef4444",
            color: '#ef4444',
            fontSize: '0.75rem',
            fontFamily: 'JetBrains Mono'
          }}>
            ERROR_LOG: {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div style={{ 
            marginTop: 32, 
            padding: 16, 
            border: "1px solid #ffffff",
            fontSize: '0.75rem',
            fontFamily: 'JetBrains Mono'
          }}>
            SYSTEM_STATUS: {infoMsg}
          </div>
        )}

        {reserved && (
          <div style={{ 
            marginTop: 4rem, 
            padding: '3rem', 
            border: "1px solid #ffffff",
            position: 'relative'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '-10px', 
              left: '20px', 
              background: '#000', 
              padding: '0 10px',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.2em'
            }}>
              RESERVATION_DATA
            </div>
            
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {reserved.company_name}
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 40,
              marginTop: 40,
              paddingTop: 40,
              borderTop: '1px solid var(--border-color)'
            }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Protocol Key</div>
                <code style={{ fontSize: '1rem', background: 'transparent', padding: 0 }}>{reserved.company_key}</code>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Timestamp</div>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>
                  {new Date(reserved.reserved_at).toISOString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div>Loading…</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/reserve" /> : <Login />}
        />
        <Route
          path="/reserve"
          element={session ? <Reserve /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
