import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

type Step = "GENERAL" | "ANALYSIS" | "SUBMISSION";

const ANALYSIS_OPTIONS = ["FinOps", "Orchestration", "Compliance", "Sovereignty", "Sustainability", "None"];

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
    product_name: "",
    product_category: "",
    finops: [] as string[],
    orchestration: [] as string[],
    compliance: [] as string[],
    sovereignty: [] as string[],
    sustainability: [] as string[],
    pricing_model: "",
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
      
      // Load saved progress from local storage
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

  const validateStep = (step: Step) => {
    const newErrors: Record<string, string> = {};
    if (step === "GENERAL") {
      if (!formData.candidate_name.trim()) newErrors.candidate_name = "Full Name is required";
      if (!formData.company_website.trim()) newErrors.company_website = "Company Website is required";
      if (!formData.hq_country.trim()) newErrors.hq_country = "HQ Country is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === "GENERAL") setCurrentStep("ANALYSIS");
      else if (currentStep === "ANALYSIS") setCurrentStep("SUBMISSION");
    }
  };

  const handleBack = () => {
    if (currentStep === "ANALYSIS") setCurrentStep("GENERAL");
    else if (currentStep === "SUBMISSION") setCurrentStep("ANALYSIS");
  };

  const handleToggleOption = (field: keyof typeof formData, option: string) => {
    setFormData(prev => {
      const current = (prev[field] as string[]) || [];
      if (option === "None") {
        return { ...prev, [field]: ["None"] };
      }
      const filtered = current.filter(o => o !== "None");
      const next = filtered.includes(option)
        ? filtered.filter(o => o !== option)
        : [...filtered, option];
      return { ...prev, [field]: next.length === 0 ? ["None"] : next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep("SUBMISSION")) return;
    
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from("research_submissions")
      .insert([{
        ...formData,
        finops: formData.finops.join(", "),
        orchestration: formData.orchestration.join(", "),
        compliance: formData.compliance.join(", "),
        sovereignty: formData.sovereignty.join(", "),
        sustainability: formData.sustainability.join(", "),
        company_name: company.company_name,
        company_key: company.company_key,
        created_by: session?.user.id
      }]);

    if (error) {
      alert("Error saving research: " + error.message);
      setSubmitting(false);
    } else {
      localStorage.removeItem(`research_progress_${companyKey}`);
      navigate("/reserve");
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono' }}>
      INITIALIZING_TERMINAL...
    </div>
  );

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
        <div style={{ fontSize: '0.7rem', color: '#71717a' }}>Step: {currentStep}</div>
      </header>

      <div className="card" style={{ borderRadius: '16px' }}>
        {currentStep === "GENERAL" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2rem' }}>General Company Profile</h3>
            
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Reserved Company</label>
                  <input disabled value={company.company_name} style={{ backgroundColor: '#f4f4f5' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Researcher Email</label>
                  <input disabled value={formData.candidate_email} style={{ backgroundColor: '#f4f4f5' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Full Name *</label>
                <input 
                  value={formData.candidate_name} 
                  onChange={e => setFormData({...formData, candidate_name: e.target.value})} 
                  placeholder="Enter your full name"
                  style={{ borderColor: errors.candidate_name ? '#ef4444' : undefined }}
                />
                {errors.candidate_name && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.25rem' }}>{errors.candidate_name}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Company Website *</label>
                  <input 
                    value={formData.company_website} 
                    onChange={e => setFormData({...formData, company_website: e.target.value})} 
                    placeholder="https://..."
                    style={{ borderColor: errors.company_website ? '#ef4444' : undefined }}
                  />
                  {errors.company_website && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.25rem' }}>{errors.company_website}</div>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>HQ Country *</label>
                  <input 
                    value={formData.hq_country} 
                    onChange={e => setFormData({...formData, hq_country: e.target.value})} 
                    placeholder="Country"
                    style={{ borderColor: errors.hq_country ? '#ef4444' : undefined }}
                  />
                  {errors.hq_country && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.25rem' }}>{errors.hq_country}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === "ANALYSIS" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2rem' }}>Deep Analysis Parameters</h3>
            <p style={{ fontSize: '0.85rem', color: '#71717a', marginBottom: '2.5rem' }}>Select all applicable capabilities for {company.company_name}. Select "None" if not applicable.</p>
            
            <div style={{ display: 'grid', gap: '2.5rem' }}>
              {[
                { id: 'finops', label: 'FinOps Capability' },
                { id: 'orchestration', label: 'Orchestration' },
                { id: 'compliance', label: 'Compliance' },
                { id: 'sovereignty', label: 'Sovereignty' },
                { id: 'sustainability', label: 'Sustainability' }
              ].map(field => (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '1rem', textTransform: 'uppercase' }}>{field.label}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {ANALYSIS_OPTIONS.map(opt => {
                      const isActive = (formData[field.id as keyof typeof formData] as string[]).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleToggleOption(field.id as keyof typeof formData, opt)}
                          style={{
                            width: 'auto',
                            padding: '0.5rem 1.25rem',
                            fontSize: '0.75rem',
                            borderRadius: '30px',
                            backgroundColor: isActive ? '#000000' : '#ffffff',
                            color: isActive ? '#ffffff' : '#000000',
                            border: '1px solid #000000',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === "SUBMISSION" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2rem' }}>Final Submission</h3>
            
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Product Name</label>
                  <input value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Product Category</label>
                  <input value={formData.product_category} onChange={e => setFormData({...formData, product_category: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Evidence Links (URLs)</label>
                <textarea 
                  style={{ width: '100%', minHeight: '100px', borderRadius: '8px', padding: '1rem' }} 
                  value={formData.evidence_links} 
                  onChange={e => setFormData({...formData, evidence_links: e.target.value})} 
                  placeholder="Paste source links here" 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Additional Notes</label>
                <textarea 
                  style={{ width: '100%', minHeight: '100px', borderRadius: '8px', padding: '1rem' }} 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #f4f4f5' }}>
          <button 
            type="button" 
            onClick={handleBack} 
            disabled={currentStep === "GENERAL"}
            style={{ 
              width: 'auto', 
              padding: '0.75rem 2.5rem', 
              borderRadius: '30px', 
              backgroundColor: '#ffffff', 
              color: '#000000',
              border: '1px solid #000000',
              visibility: currentStep === "GENERAL" ? 'hidden' : 'visible'
            }}
          >
            Back
          </button>
          
          {currentStep !== "SUBMISSION" ? (
            <button 
              type="button" 
              onClick={handleNext}
              style={{ width: 'auto', padding: '0.75rem 2.5rem', borderRadius: '30px' }}
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              style={{ width: 'auto', padding: '0.75rem 2.5rem', borderRadius: '30px', backgroundColor: '#000000', color: '#ffffff' }}
            >
              {submitting ? "Submitting..." : "Submit Research"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
