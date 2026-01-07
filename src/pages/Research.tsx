import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

type Step = "GENERAL" | "PRODUCT" | "SUBMISSION";

const FUNDING_STAGES = [
  { id: "A", label: "Bootstrap" },
  { id: "B", label: "Pre-seed" },
  { id: "C", label: "Seed" },
  { id: "D", label: "Series A" },
  { id: "E", label: "Series B/C" },
  { id: "F", label: "Not Available" }
];

const BUYER_PERSONAS = [
  { id: "CTO", label: "CTO / Platform teams", example: "Automate infrastructure at scale" },
  { id: "CFO", label: "CFO / FinOps", example: "Reduce cloud spend by 30%" },
  { id: "CISO", label: "CISO / Legal", example: "Ensure compliance with EU regulations" },
  { id: "ESG", label: "Sustainable Heads / ESG", example: "Meet CSRD reporting requirements" }
];

const CLOUD_PROVIDERS = [
  "Amazon AWS", "Microsoft Azure", "Google GCP", "STACKIT", "OVHcloud", "Hetzner", "Open Telekom Cloud", "DigitalOcean", "Oracle Cloud"
];

export default function ResearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyKey = searchParams.get("company_key");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<Step>("GENERAL");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    candidate_name: "",
    candidate_email: "",
    company_website: "",
    hq_country: "",
    year_founded: "",
    employee_count: "",
    funding_stage: [] as string[],
    product_name: "",
    product_category: "",
    finops_categories: [] as string[],
    buyer_personas: [] as string[],
    homepage_headline: "",
    keywords_raw: "",
    eu_reg_mention: "no",
    eu_reg_details: [] as string[],
    cloud_providers: [] as string[],
    custom_cloud: "",
    evidence_links: "",
    notes: ""
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
      
      const saved = localStorage.getItem(`research_progress_${companyKey}`);
      if (saved) {
        setFormData(JSON.parse(saved));
      } else {
        setFormData(prev => ({
          ...prev,
          candidate_email: session.user.email || ""
        }));
      }
      setLoading(false);
    };
    init();
  }, [companyKey, navigate]);

  useEffect(() => {
    if (!loading && companyKey) {
      localStorage.setItem(`research_progress_${companyKey}`, JSON.stringify(formData));
    }
  }, [formData, loading, companyKey]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field] && (typeof value === 'string' ? value.trim() : true)) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleArrayItem = (field: keyof typeof formData, value: string) => {
    setFormData(prev => {
      const current = (prev[field] as string[]) || [];
      const next = current.includes(value)
        ? current.filter(i => i !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const validateStep = (step: Step) => {
    const newErrors: Record<string, string> = {};
    if (step === "GENERAL") {
      if (!formData.candidate_name.trim()) newErrors.candidate_name = "Researcher name required.";
      if (!formData.hq_country.trim()) newErrors.hq_country = "HQ Country required.";
      if (!formData.company_website.trim()) newErrors.company_website = "Website URL required.";
      if (!formData.year_founded.trim()) newErrors.year_founded = "Founding year required.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === "GENERAL") setCurrentStep("PRODUCT");
      else if (currentStep === "PRODUCT") setCurrentStep("SUBMISSION");
    }
  };

  const handleBack = () => {
    if (currentStep === "PRODUCT") setCurrentStep("GENERAL");
    else if (currentStep === "SUBMISSION") setCurrentStep("PRODUCT");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from("research_submissions")
      .insert([{
        ...formData,
        funding_stage: formData.funding_stage.join(", "),
        finops_categories: formData.finops_categories.join(", "),
        buyer_personas: formData.buyer_personas.join(", "),
        eu_reg_details: formData.eu_reg_details.join(", "),
        cloud_providers: formData.cloud_providers.join(", "),
        company_name: company.company_name,
        company_key: company.company_key,
        created_by: session?.user.id
      }]);

    if (error) {
      alert("Error: " + error.message);
      setSubmitting(false);
    } else {
      localStorage.removeItem(`research_progress_${companyKey}`);
      navigate("/reserve");
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono' }}>LOADING_TERMINAL...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
      <div className="logo-container" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>ATOMITY</h1>
        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#71717a', marginTop: '0.5rem' }}>Intelligence Terminal</div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
        {(["GENERAL", "PRODUCT", "SUBMISSION"] as Step[]).map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #000', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
              backgroundColor: currentStep === s ? '#000' : 'transparent',
              color: currentStep === s ? '#fff' : '#000',
              fontWeight: 700
            }}>{i + 1}</div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: currentStep === s ? 1 : 0.3 }}>{s.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ borderRadius: '24px', padding: '3rem', border: '1px solid #e4e4e7', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        {currentStep === "GENERAL" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2.5rem', borderLeft: '4px solid #000', paddingLeft: '1rem' }}>General Profile</h3>
            
            <div style={{ display: 'grid', gap: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Full Name *</label>
                  <input value={formData.candidate_name} onChange={e => handleInputChange('candidate_name', e.target.value)} placeholder="Full Name" style={{ borderColor: errors.candidate_name ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '12px', padding: '0.85rem' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>Enter your primary identification for the research log.</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Year Founded *</label>
                  <input value={formData.year_founded} onChange={e => handleInputChange('year_founded', e.target.value)} placeholder="YYYY" style={{ borderColor: errors.year_founded ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '12px', padding: '0.85rem' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>When was this company officially incorporated?</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>HQ Country *</label>
                  <input value={formData.hq_country} onChange={e => handleInputChange('hq_country', e.target.value)} placeholder="Country" style={{ borderColor: errors.hq_country ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '12px', padding: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Estimated Size</label>
                  <input value={formData.employee_count} onChange={e => handleInputChange('employee_count', e.target.value)} placeholder="No. of employees" style={{ width: '100%', borderRadius: '12px', padding: '0.85rem', border: '1px solid #e4e4e7' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>Current approximate headcount from LinkedIn or official reports.</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '1rem', textTransform: 'uppercase' }}>Funding Stage (Multi-select)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {FUNDING_STAGES.map(stage => {
                    const active = formData.funding_stage.includes(stage.label);
                    return (
                      <button key={stage.id} type="button" onClick={() => toggleArrayItem('funding_stage', stage.label)} style={{
                        padding: '0.6rem 1.2rem', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 700,
                        backgroundColor: active ? '#000' : '#fff', color: active ? '#fff' : '#000',
                        border: '1px solid #000', cursor: 'pointer', transition: '0.2s'
                      }}>{stage.label}</button>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.75rem' }}>Select the most likely current financial phase based on recent news.</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Company Website *</label>
                <input value={formData.company_website} onChange={e => handleInputChange('company_website', e.target.value)} placeholder="https://..." style={{ borderColor: errors.company_website ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '12px', padding: '0.85rem' }} />
              </div>
            </div>
          </div>
        )}

        {currentStep === "PRODUCT" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2.5rem', borderLeft: '4px solid #000', paddingLeft: '1rem' }}>Product Research</h3>
            
            <div style={{ display: 'grid', gap: '3rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem' }}>What kind of service/product does this company provide?</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {["FinOps", "Orchestration", "Compliance", "Sovereignty", "Sustainability"].map(opt => {
                    const active = formData.finops_categories.includes(opt);
                    return (
                      <button key={opt} type="button" onClick={() => toggleArrayItem('finops_categories', opt)} style={{
                        padding: '0.6rem 1.2rem', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 700,
                        backgroundColor: active ? '#000' : '#fff', color: active ? '#fff' : '#000',
                        border: '1px solid #000', cursor: 'pointer'
                      }}>{opt}</button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem' }}>Primary Buyer Persona</label>
                <div style={{ fontSize: '0.7rem', color: '#71717a', marginBottom: '1.25rem' }}>Who is the website content written for? Cross-reference messaging with these target roles.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {BUYER_PERSONAS.map(p => {
                    const active = formData.buyer_personas.includes(p.id);
                    return (
                      <div key={p.id} onClick={() => toggleArrayItem('buyer_personas', p.id)} style={{
                        padding: '1rem', borderRadius: '16px', border: `2px solid ${active ? '#000' : '#f4f4f5'}`,
                        cursor: 'pointer', transition: '0.2s', backgroundColor: active ? '#fafafa' : '#fff'
                      }}>
                        <div style={{ fontWeight: 800, fontSize: '0.8rem', marginBottom: '0.4rem' }}>{p.label}</div>
                        <div style={{ fontSize: '0.65rem', color: '#71717a', fontStyle: 'italic' }}>"{p.example}"</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>Homepage Headline & Keywords</label>
                <input value={formData.homepage_headline} onChange={e => handleInputChange('homepage_headline', e.target.value)} placeholder="Main headline text..." style={{ width: '100%', borderRadius: '12px', padding: '0.85rem', border: '1px solid #e4e4e7', marginBottom: '1rem' }} />
                <textarea value={formData.keywords_raw} onChange={e => handleInputChange('keywords_raw', e.target.value)} placeholder="Enter keywords separated by commas (e.g. AI, Scalability, Trust)..." style={{ width: '100%', minHeight: '80px', borderRadius: '12px', padding: '1rem', border: '1px solid #e4e4e7' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {formData.keywords_raw.split(',').filter(k => k.trim()).map((k, i) => (
                    <span key={i} style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#f4f4f5', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>#{k.trim().toLowerCase().replace(/\s+/g, '')}</span>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '1rem' }}>EU Regulations & Compliance</label>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="radio" checked={formData.eu_reg_mention === 'yes'} onChange={() => handleInputChange('eu_reg_mention', 'yes')} /> Explicit EU Mention
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="radio" checked={formData.eu_reg_mention === 'no'} onChange={() => handleInputChange('eu_reg_mention', 'no')} /> No Mention
                  </label>
                </div>
                {formData.eu_reg_mention === 'yes' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {["EU AI Act", "GDPR", "Data Act", "NIS2", "CSRD"].map(reg => (
                      <button key={reg} type="button" onClick={() => toggleArrayItem('eu_reg_details', reg)} style={{
                        padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700,
                        backgroundColor: formData.eu_reg_details.includes(reg) ? '#000' : '#f4f4f5',
                        color: formData.eu_reg_details.includes(reg) ? '#fff' : '#000',
                        border: 'none', cursor: 'pointer'
                      }}>{reg}</button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '1rem' }}>Cloud Infrastructure Support</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {CLOUD_PROVIDERS.map(cloud => (
                    <span key={cloud} onClick={() => toggleArrayItem('cloud_providers', cloud)} style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer',
                      backgroundColor: formData.cloud_providers.includes(cloud) ? '#000' : '#f4f4f5',
                      color: formData.cloud_providers.includes(cloud) ? '#fff' : '#000'
                    }}>#{cloud.replace(/\s+/g, '')}</span>
                  ))}
                </div>
                <input value={formData.custom_cloud} onChange={e => handleInputChange('custom_cloud', e.target.value)} placeholder="New cloud provider..." style={{ width: '100%', borderRadius: '12px', padding: '0.85rem', border: '1px solid #e4e4e7' }} />
              </div>
            </div>
          </div>
        )}

        {currentStep === "SUBMISSION" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2.5rem', borderLeft: '4px solid #000', paddingLeft: '1rem' }}>Final Validation</h3>
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Evidence Links</label>
                <textarea value={formData.evidence_links} onChange={e => handleInputChange('evidence_links', e.target.value)} placeholder="Paste URLs here..." style={{ width: '100%', minHeight: '120px', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e4e4e7' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Additional Notes</label>
                <textarea value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} placeholder="Key insights..." style={{ width: '100%', minHeight: '120px', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e4e4e7' }} />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #f4f4f5' }}>
          <button type="button" onClick={handleBack} disabled={currentStep === "GENERAL"} style={{ 
            padding: '1rem 3rem', borderRadius: '40px', backgroundColor: '#fff', color: '#000', border: '1px solid #000', 
            fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', visibility: currentStep === "GENERAL" ? 'hidden' : 'visible' 
          }}>BACK</button>
          
          {currentStep !== "SUBMISSION" ? (
            <button type="button" onClick={handleNext} style={{ padding: '1rem 3rem', borderRadius: '40px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>CONTINUE</button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: '1rem 3rem', borderRadius: '40px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>{submitting ? "UPLOADING..." : "SUBMIT RESEARCH"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
