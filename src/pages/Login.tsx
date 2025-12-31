import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isValidEmail = useMemo(() => {
    const e = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, [email]);

  const sendMagicLink = async () => {
    setMsg(null);

    const e = email.trim().toLowerCase();
    if (!e || !isValidEmail) {
      setMsg("Please enter a valid email.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: e,
        options: {
          // IMPORTANT: set this in Supabase Auth URL config later
          emailRedirectTo: `${window.location.origin}/reserve`,
        },
      });

      if (error) throw error;

      setMsg("Check your email for the login link.");
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message || "Failed to send login link.");
    } finally {
      setLoading(false);
    }
  };

  const goReserve = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) navigate("/reserve");
    else setMsg("You are not logged in yet. Use the email login link first.");
  };

  return (
    <div style={{ maxWidth: 520, margin: "80px auto", fontFamily: "sans-serif", padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Login</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Enter your email. You will receive a login link.
      </p>

      <label style={{ display: "block", marginTop: 18, marginBottom: 8 }}>
        Email
      </label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="intern@yourdomain.com"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid #ccc",
          outline: "none",
        }}
      />

      <button
        onClick={sendMagicLink}
        disabled={loading}
        style={{
          marginTop: 14,
          width: "100%",
          padding: "12px 14px",
          borderRadius: 10,
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          background: "#111",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        {loading ? "Sending..." : "Send login link"}
      </button>

      <button
        onClick={goReserve}
        style={{
          marginTop: 10,
          width: "100%",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid #111",
          cursor: "pointer",
          background: "#fff",
          color: "#111",
          fontWeight: 600,
        }}
      >
        I already logged in, go to Reserve
      </button>

      {msg && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#f6f6f6" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
