import { useEffect, useMemo, useState } from "react";
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

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ReserveResult | null>(null);

  const canSubmit = useMemo(() => companyName.trim().length >= 2, [companyName]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? null;

      if (!data.session) {
        navigate("/login");
        return;
      }

      setSessionEmail(email);
    };

    init();
  }, [navigate]);

  const reserve = async () => {
    setMsg(null);
    setResult(null);

    if (!canSubmit) {
      setMsg("Enter a company name.");
      return;
    }

    setLoading(true);
    try {
      const name = companyName.trim();

      const { data, error } = await supabase.rpc("reserve_company", {
        p_company_name: name,
      });

      if (error) throw error;

      // Supabase RPC returns array for "returns table"
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("No data returned from reserve_company().");

      setResult(row as ReserveResult);
      setMsg("Reserved successfully. You can now continue research for this company.");
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message || "Reservation failed.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div style={{ maxWidth: 720, margin: "70px auto", fontFamily: "sans-serif", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Reserve a company</h1>
        <button
          onClick={signOut}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Sign out
        </button>
      </div>

      <p style={{ opacity: 0.8, marginTop: 10 }}>
        Logged in as: <b>{sessionEmail ?? "..."}</b>
      </p>

      <div style={{ marginTop: 18 }}>
        <label style={{ display: "block", marginBottom: 8 }}>Company name</label>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="SAP SE"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            outline: "none",
          }}
        />

        <button
          onClick={reserve}
          disabled={loading || !canSubmit}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: "#111",
            color: "#fff",
            fontWeight: 700,
            opacity: loading || !canSubmit ? 0.8 : 1,
          }}
        >
          {loading ? "Reserving..." : "Reserve this company"}
        </button>
      </div>

      {msg && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#f6f6f6" }}>
          {msg}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 12, border: "1px solid #ddd" }}>
          <div><b>company_key:</b> {result.company_key}</div>
          <div><b>company_name:</b> {result.company_name}</div>
          <div><b>reserved_by:</b> {result.reserved_by}</div>
          <div><b>reserved_at:</b> {result.reserved_at}</div>
          <div><b>last_activity_at:</b> {result.last_activity_at}</div>
        </div>
      )}
    </div>
  );
}
