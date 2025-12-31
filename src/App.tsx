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
    <div style={{ padding: "40px", maxWidth: "400px" }}>
      <h2>Login</h2>

      {sent ? (
        <p>✅ Check your email for the login link.</p>
      ) : (
        <>
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
          />
          <button onClick={sendMagicLink}>Send magic link</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </>
      )}
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
    <div style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Reserve Company</h2>
        <button onClick={onLogout}>Logout</button>
      </div>

      <p style={{ marginTop: 8, color: "#444" }}>
        Type a company name. If it is free, it gets reserved to your account for 48 hours of inactivity.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g., SAP SE"
          style={{ flex: 1, padding: 12, fontSize: 16 }}
          disabled={loading || !!reserved}
        />
        <button
          onClick={onReserve}
          disabled={loading || !!reserved}
          style={{ padding: "12px 16px", fontSize: 16 }}
        >
          {loading ? "Reserving..." : "Reserve"}
        </button>
      </div>

      {errorMsg && (
        <div style={{ marginTop: 16, padding: 12, background: "#ffecec", border: "1px solid #ffb3b3" }}>
          <b>Error:</b> {errorMsg}
        </div>
      )}

      {infoMsg && (
        <div style={{ marginTop: 16, padding: 12, background: "#eefbf0", border: "1px solid #b7e3c0" }}>
          {infoMsg}
        </div>
      )}

      {reserved && (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontSize: 14, color: "#555" }}>Reserved company</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{reserved.company_name}</div>
          <div style={{ marginTop: 10, fontFamily: "monospace" }}>
            company_key: <b>{reserved.company_key}</b>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
            reserved_at: {reserved.reserved_at}
          </div>

          <div style={{ marginTop: 14, fontSize: 13, color: "#666" }}>
            Next step: we will show the research form for this company_key and block edits to company_name.
          </div>
        </div>
      )}
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
