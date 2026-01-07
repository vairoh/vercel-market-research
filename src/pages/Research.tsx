import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

type Step = "GENERAL" | "ANALYSIS" | "SUBMISSION";

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
    estimated_size: "",
    funding_stage: "",
    product_name: "",
    product_category: "",
    finops: [] as string[],
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

  // Real-time auto-save
  useEffect(() => {
    if (!loading && companyKey) {
      localStorage.setItem(`research_progress_${companyKey}`, JSON.stringify(formData));
    }
  }, [formData, loading, companyKey]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Premium Real-time error clearing
    if (errors[field] && value.trim()) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (step: Step) => {
    const newErrors: Record<string, string> = {};
    if (step === "GENERAL") {
      if (!formData.candidate_name.trim()) newErrors.candidate_name = "Please provide your full name to proceed.";
      if (!formData.hq_country.trim()) newErrors.hq_country = "Please specify the country where the company is headquartered.";
      if (!formData.company_website.trim()) newErrors.company_website = "A valid company website URL is required.";
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

  const handleToggleOption = (option: string) => {
    setFormData(prev => {
      const current = prev.finops;
      const next = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, finops: next };
    });
  };

  const handleSelectAll = () => {
    const all = ["FinOps", "Orchestration", "Compliance", "Sovereignty", "Sustainability"];
    setFormData(prev => ({ 
      ...prev, 
      finops: prev.finops.length === all.length ? [] : all 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep("SUBMISSION")) return;
    
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from("research_submissions")
      .insert([{
        candidate_name: formData.candidate_name,
        candidate_email: formData.candidate_email,
        company_website: formData.company_website,
        hq_country: formData.hq_country,
        year_founded: formData.year_founded,
        estimated_size: formData.estimated_size,
        funding_stage: formData.funding_stage,
        product_name: formData.product_name,
        product_category: formData.product_category,
        finops: formData.finops.join(", "),
        company_name: company.company_name,
        company_key: company.company_key,
        created_by: session?.user.id,
        evidence_links: formData.evidence_links,
        notes: formData.notes
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem' }}>General Profile</h3>
            
            <div style={{ display: 'grid', gap: '2.5rem' }}>
              {/* Researcher Identification */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Full Name *</label>
                  <input 
                    value={formData.candidate_name} 
                    onChange={e => handleInputChange('candidate_name', e.target.value)} 
                    placeholder="Enter your full name"
                    style={{ borderColor: errors.candidate_name ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '8px', padding: '0.75rem', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>Please enter your full legal name as the primary researcher for this project.</div>
                  {errors.candidate_name && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.4rem', fontWeight: 600 }}>{errors.candidate_name}</div>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Researcher Email</label>
                  <input disabled value={formData.candidate_email} style={{ backgroundColor: '#f4f4f5', width: '100%', borderRadius: '8px', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid #e4e4e7' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>Your authenticated terminal email address (locked for security).</div>
                </div>
              </div>

              {/* Company Context */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Reserved Company</label>
                  <input disabled value={company.company_name} style={{ backgroundColor: '#f4f4f5', width: '100%', borderRadius: '8px', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid #e4e4e7', textTransform: 'uppercase', fontWeight: 700 }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>The specific market entity currently assigned to your research terminal.</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>HQ Country *</label>
                  <input 
                    value={formData.hq_country} 
                    onChange={e => handleInputChange('hq_country', e.target.value)} 
                    placeholder="e.g. United States, Germany"
                    style={{ borderColor: errors.hq_country ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '8px', padding: '0.75rem', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>Specify the primary nation of corporate operation and legal registration.</div>
                  {errors.hq_country && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.4rem', fontWeight: 600 }}>{errors.hq_country}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Year Founded</label>
                  <input 
                    type="text"
                    value={formData.year_founded} 
                    onChange={e => handleInputChange('year_founded', e.target.value)} 
                    placeholder="YYYY"
                    style={{ width: '100%', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e4e4e7', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>Year of official incorporation.</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Estimated Size</label>
                  <input 
                    type="number"
                    value={formData.estimated_size} 
                    onChange={e => handleInputChange('estimated_size', e.target.value)} 
                    placeholder="Headcount"
                    style={{ width: '100%', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e4e4e7', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>Total employee count.</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Funding Stage</label>
                  <input 
                    value={formData.funding_stage} 
                    onChange={e => handleInputChange('funding_stage', e.target.value)} 
                    placeholder="Stage"
                    style={{ width: '100%', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e4e4e7', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>Pre-seed, Series A, etc., or N/A.</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Company Website *</label>
                <input 
                  value={formData.company_website} 
                  onChange={e => handleInputChange('company_website', e.target.value)} 
                  placeholder="https://www.company.com"
                  style={{ borderColor: errors.company_website ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '8px', padding: '0.75rem', fontSize: '0.9rem' }}
                />
                <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>The official primary corporate URL for direct market validation.</div>
                {errors.company_website && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.4rem', fontWeight: 600 }}>{errors.company_website}</div>}
              </div>
            </div>
          </div>
        )}

        {currentStep === "ANALYSIS" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem' }}>Deep Analysis Parameters</h3>
            
            <div style={{ display: 'grid', gap: '2.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#000000', marginBottom: '0.75rem' }}>What kind of service/product does this company provide?</label>
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: '1.5rem', lineHeight: 1.5 }}>Select all applicable categories that define the primary value proposition of {company.company_name}.</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {["FinOps", "Orchestration", "Compliance", "Sovereignty", "Sustainability"].map(opt => {
                    const isActive = formData.finops.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleToggleOption(opt)}
                        style={{
                          width: 'auto',
                          padding: '0.75rem 1.75rem',
                          fontSize: '0.8rem',
                          borderRadius: '30px',
                          backgroundColor: isActive ? '#000000' : '#ffffff',
                          color: isActive ? '#ffffff' : '#000000',
                          border: '1px solid #000000',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontWeight: 600,
                          letterSpacing: '0.02em'
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    style={{
                      width: 'auto',
                      padding: '0.75rem 1.75rem',
                      fontSize: '0.8rem',
                      borderRadius: '30px',
                      backgroundColor: formData.finops.length === 5 ? '#000000' : '#ffffff',
                      color: formData.finops.length === 5 ? '#ffffff' : '#000000',
                      border: '1px solid #000000',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: 800,
                      letterSpacing: '0.05em'
                    }}
                  >
                    ALL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === "SUBMISSION" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem' }}>Final Details</h3>
            
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Product Name</label>
                  <input 
                    value={formData.product_name} 
                    onChange={e => handleInputChange('product_name', e.target.value)} 
                    placeholder="e.g. Platform X"
                    style={{ width: '100%', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e4e4e7', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>The specific brand or technical name of the primary offering.</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Product Category</label>
                  <input 
                    value={formData.product_category} 
                    onChange={e => handleInputChange('product_category', e.target.value)} 
                    placeholder="e.g. SaaS Solution"
                    style={{ width: '100%', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e4e4e7', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>Broad market classification of the service or technology.</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Evidence Links (URLs)</label>
                <textarea 
                  style={{ width: '100%', minHeight: '100px', borderRadius: '8px', padding: '1rem', border: '1px solid #e4e4e7', fontSize: '0.9rem', lineHeight: 1.5 }} 
                  value={formData.evidence_links} 
                  onChange={e => handleInputChange('evidence_links', e.target.value)} 
                  placeholder="Paste URLs to source documentation" 
                />
                <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>Provide direct links to sources that validate your findings.</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Additional Notes</label>
                <textarea 
                  style={{ width: '100%', minHeight: '100px', borderRadius: '8px', padding: '1rem', border: '1px solid #e4e4e7', fontSize: '0.9rem', lineHeight: 1.5 }} 
                  value={formData.notes} 
                  onChange={e => handleInputChange('notes', e.target.value)} 
                  placeholder="Enter any additional observations"
                />
                <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem', lineHeight: 1.4 }}>Include any other relevant qualitative data discovered.</div>
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
              visibility: currentStep === "GENERAL" ? 'hidden' : 'visible',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Back
          </button>
          
          {currentStep !== "SUBMISSION" ? (
            <button 
              type="button" 
              onClick={handleNext}
              style={{ width: 'auto', padding: '0.75rem 2.5rem', borderRadius: '30px', backgroundColor: '#000000', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              style={{ width: 'auto', padding: '0.75rem 2.5rem', borderRadius: '30px', backgroundColor: '#000000', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              {submitting ? "Processing..." : "Finalize & Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
