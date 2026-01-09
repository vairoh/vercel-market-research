import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import ReservePage from "./pages/Reserve";
import ResearchPage from "./pages/Research";

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
        <div className="tagline">Market & Competitive Intelligence</div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', borderRadius: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Authentication
            </h2>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#71717a' }}>Sign in to access the analysis</p>
          </div>

          {sent ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem', 
              border: '1px solid #000000',
              color: '#000000',
              borderRadius: '12px'
            }}>
              <p style={{ color: 'inherit', margin: 0, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Access link dispatched to inbox.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
              <div style={{ width: '100%' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontSize: '0.65rem', 
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: '#000000'
                }}>
                  Access Credentials
                </label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ borderRadius: '8px' }}
                />
              </div>
              <button onClick={sendMagicLink} style={{ width: 'auto', borderRadius: '30px' }}>
                Send Link
              </button>
              {error && (
                <p style={{ 
                  color: '#ef4444', 
                  fontSize: '0.7rem', 
                  textAlign: 'center',
                  fontFamily: 'JetBrains Mono',
                  margin: 0 
                }}>
                  STATUS_ERROR: {error}
                </p>
              )}
            </div>
          )}
        </div>
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

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono' }}>INITIALIZING_SYSTEM...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/reserve" /> : <Login />}
        />
        <Route
          path="/reserve"
          element={session ? <ReservePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/research"
          element={session ? <ResearchPage /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
