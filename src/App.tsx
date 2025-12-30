import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function Login() {
  return (
    <div style={{ padding: "40px" }}>
      <h2>Login</h2>
      <p>Login page placeholder</p>
    </div>
  );
}

function Reserve() {
  return (
    <div style={{ padding: "40px" }}>
      <h2>Reserve Company</h2>
      <p>Reserve page placeholder</p>
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
