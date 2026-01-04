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
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px' 
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '2rem' }}>Welcome</h2>
          <p>Sign in to your account</p>
        </div>

        {sent ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem', 
            background: '#f0fdf4', 
            borderRadius: '12px',
            border: '1px solid #bbf7d0',
            color: '#166534'
          }}>
            <p style={{ color: 'inherit', margin: 0, fontWeight: 500 }}>
              ✅ Check your email for the magic link.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem', 
                fontWeight: 500,
                color: 'var(--text-secondary)'
              }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button onClick={sendMagicLink} style={{ width: '100%', padding: '0.875rem' }}>
              Send magic link
            </button>
            {error && (
              <p style={{ 
                color: '#ef4444', 
                fontSize: '0.875rem', 
                textAlign: 'center',
                margin: 0 
              }}>
                {error}
              </p>
            )}
          </div>
        )}
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
      setInfoMsg("✅ Reserved successfully. You can now continue the research.");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Unknown error");
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
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px 20px',
      minHeight: '100vh'
    }}>
      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: '3rem'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Reserve Company</h2>
        <button 
          onClick={onLogout}
          style={{ 
            background: 'transparent', 
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            fontSize: '0.875rem'
          }}
        >
          Logout
        </button>
      </header>

      <div className="card">
        <p style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>
          Secure a company for your research. Reservations last for 48 hours of inactivity.
        </p>

        <div style={{ display: "flex", gap: 12 }}>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name (e.g., Apple Inc.)"
            style={{ flex: 1 }}
            disabled={loading || !!reserved}
          />
          <button
            onClick={onReserve}
            disabled={loading || !!reserved}
            style={{ whiteSpace: 'nowrap', padding: '0 2rem' }}
          >
            {loading ? "Reserving..." : "Reserve Now"}
          </button>
        </div>

        {errorMsg && (
          <div style={{ 
            marginTop: 20, 
            padding: 16, 
            background: "#fef2f2", 
            border: "1px solid #fee2e2",
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '0.875rem'
          }}>
            <span style={{ fontWeight: 600 }}>Error:</span> {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div style={{ 
            marginTop: 20, 
            padding: 16, 
            background: "#f0fdf4", 
            border: "1px solid #dcfce7",
            borderRadius: '8px',
            color: '#166534',
            fontSize: '0.875rem'
          }}>
            {infoMsg}
          </div>
        )}

        {reserved && (
          <div style={{ 
            marginTop: 32, 
            padding: 24, 
            background: 'var(--card-bg)',
            border: "1px solid #3b82f6", 
            borderRadius: 12,
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Reservation
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 8, color: 'var(--text-primary)' }}>
              {reserved.company_name}
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 24,
              marginTop: 24,
              paddingTop: 24,
              borderTop: '1px solid var(--border-color)'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Company Key</div>
                <code style={{ fontSize: '0.875rem', fontWeight: 600 }}>{reserved.company_key}</code>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Reserved Date</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  {new Date(reserved.reserved_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div style={{ 
              marginTop: 24, 
              padding: 16, 
              background: 'rgba(59, 130, 246, 0.05)', 
              borderRadius: 8,
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}>
              💡 Next step: The research form will now be available for this company.
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
