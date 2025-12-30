import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function App() {
  const [status, setStatus] = useState("Checking Supabase connection...");

  useEffect(() => {
    const checkConnection = async () => {
      const { error } = await supabase.from("company_registry").select("*").limit(1);
      if (error) {
        setStatus("❌ Supabase connection failed");
        console.error(error);
      } else {
        setStatus("✅ Supabase connected successfully");
      }
    };

    checkConnection();
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Market Research Tool</h1>
      <p>{status}</p>
    </div>
  );
}

export default App;
