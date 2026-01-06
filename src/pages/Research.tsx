import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ResearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyKey = searchParams.get("company_key");
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    company_website: "",
    hq_country: "",
    product_name: "",
    product_category: "",
    finops: "",
    orchestration: "",
    compliance: "",
    sovereignty: "",
    sustainability: "",
    pricing_model: "",
    evidence_links: "",
    notes: "",
    candidate_name: "",
    candidate_email: ""
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      if (!companyKey) {
        navigate("/reserve");
        return;
      }

      const { data, error } = await supabase
        .from("company_registry")
        .select("*")
        .eq("company_key", companyKey)
        .single();

      if (error || !data) {
        navigate("/reserve");
        return;
      }

      setCompany(data);
      setFormData(prev => ({
        ...prev,
        candidate_email: session.user.email || ""
      }));
      setLoading(false);
    };
    init();
  }, [companyKey, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from("research_submissions")
      .insert([{
        ...formData,
        company_name: company.company_name,
        company_key: company.company_key,
        created_by: session?.user.id
      }]);

    if (error) {
      alert("Error saving research: " + error.message);
      setLoading(false);
    } else {
      alert("Research submitted successfully!");
      navigate("/reserve");
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Initializing Terminal...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div className="logo-container">
        <h1>ATOMITY</h1>
        <div className="tagline">Market intelligence / Market Analysis</div>
      </div>

      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #000000'
      }}>
        <h2 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
          Research Terminal // {company?.company_name}
        </h2>
        <div style={{ fontSize: '0.7rem', color: '#71717a' }}>UID: {companyKey}</div>
      </header>

      <form onSubmit={handleSubmit} className="card" style={{ borderRadius: '16px', display: 'grid', gap: '2rem' }}>
        <section>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.5rem' }}>
            Researcher Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>Full Name</label>
              <input required value={formData.candidate_name} onChange={e => setFormData({...formData, candidate_name: e.target.value})} placeholder="Your Name" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>Email Address</label>
              <input disabled value={formData.candidate_email} />
            </div>
          </div>
        </section>

        <section>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.5rem' }}>
            Company Fundamentals
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>Company Website</label>
              <input value={formData.company_website} onChange={e => setFormData({...formData, company_website: e.target.value})} placeholder="https://..." />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>HQ Country</label>
              <input value={formData.hq_country} onChange={e => setFormData({...formData, hq_country: e.target.value})} placeholder="Country" />
            </div>
          </div>
        </section>

        <section>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.5rem' }}>
            Analysis Parameters
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>Product Name</label>
              <input value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>Product Category</label>
              <input value={formData.product_category} onChange={e => setFormData({...formData, product_category: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>FinOps Capability</label>
              <input value={formData.finops} onChange={e => setFormData({...formData, finops: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>Orchestration</label>
              <input value={formData.orchestration} onChange={e => setFormData({...formData, orchestration: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>Compliance</label>
              <input value={formData.compliance} onChange={e => setFormData({...formData, compliance: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>Sovereignty</label>
              <input value={formData.sovereignty} onChange={e => setFormData({...formData, sovereignty: e.target.value})} />
            </div>
          </div>
        </section>

        <section>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.5rem' }}>
            Supporting Documentation
          </h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>Evidence Links (URLs)</label>
              <textarea style={{ width: '100%', minHeight: '80px', borderRadius: '8px' }} value={formData.evidence_links} onChange={e => setFormData({...formData, evidence_links: e.target.value})} placeholder="Paste source links here" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem' }}>Additional Notes</label>
              <textarea style={{ width: '100%', minHeight: '80px', borderRadius: '8px' }} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="submit" style={{ width: 'auto', padding: '1rem 3rem', borderRadius: '30px' }}>
            Submit Research
          </button>
        </div>
      </form>
    </div>
  );
}
