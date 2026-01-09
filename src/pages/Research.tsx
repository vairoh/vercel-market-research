import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import styles from "./ResearchKeywords.module.css";
import { logError, logInfo, logWarn } from "../observability/logger";
import { fetchCompanyByKey, fetchSession, submitResearch } from "../services/researchService";
import type { ResearchForm, Step } from "../domain/research";
import { validateStep } from "../validation/research";

export default function ResearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyKey = searchParams.get("company_key");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<Step>("GENERAL");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showKeywordTooltip, setShowKeywordTooltip] = useState(false);
  const [showPersonaTooltip, setShowPersonaTooltip] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const [formData, setFormData] = useState<ResearchForm>({
    buyer_persona: [],
    candidate_name: "",
    candidate_email: "",
    company_website: "",
    hq_country: "",
    year_founded: "",
    estimated_size: "",
    funding_stage: "",
    product_name: "",
    product_category: "",
    finops: [],
    evidence_links: "",
    notes: "",
    keywords: []
  });

  useEffect(() => {
    const init = async () => {
      logInfo("research.init.start", { companyKey });
      const session = await fetchSession();
      if (!session) {
        logWarn("research.init.noSession");
        navigate("/login");
        return;
      }

      if (!companyKey) {
        logWarn("research.init.noCompanyKey");
        navigate("/reserve");
        return;
      }

      const { data, error } = await fetchCompanyByKey(companyKey);

      if (error || !data) {
        logError("research.init.companyFetchError", { error });
        navigate("/reserve");
        return;
      }

      setCompany(data);
      
      const saved = localStorage.getItem(`research_progress_${companyKey}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) {
            setFormData(prev => ({
              ...prev,
              ...parsed,
              finops: Array.isArray(parsed.finops) ? parsed.finops : [],
              buyer_persona: Array.isArray(parsed.buyer_persona) ? parsed.buyer_persona : [],
              keywords: Array.isArray(parsed.keywords) ? parsed.keywords : []
            }));
          }
        } catch (e) {
          logError("research.init.progressParseError", { error: e });
        }
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
    console.log("[ResearchPage] handleInputChange", { field, value });
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const valString = String(value ?? "");
      const hasValue = Array.isArray(value) ? value.length > 0 : valString.trim().length > 0;
      if (hasValue) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const runValidation = (step: Step) => {
    const nextErrors = validateStep(step, formData);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    const isValid = runValidation(currentStep);
    if (!isValid) {
      logWarn("research.validation.failed", { step: currentStep });
      setShowValidationErrors(true);
      return;
    }
    logInfo("research.validation.passed", { step: currentStep });
    setShowValidationErrors(false);
    if (currentStep === "GENERAL") setCurrentStep("ANALYSIS");
    else if (currentStep === "ANALYSIS") setCurrentStep("SUBMISSION");
  };

  const handleBack = () => {
    console.log("[ResearchPage] handleBack clicked", { currentStep });
    if (currentStep === "ANALYSIS") setCurrentStep("GENERAL");
    else if (currentStep === "SUBMISSION") setCurrentStep("ANALYSIS");
  };

  const handleToggleOption = (option: string) => {
    const current = Array.isArray(formData.finops) ? formData.finops : [];
    const next = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option];
    handleInputChange('finops', next);
  };

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = keywordInput.trim().replace(/^#/, '');
      if (val && !formData.keywords.includes(val)) {
        handleInputChange('keywords', [...formData.keywords, val]);
      }
      setKeywordInput("");
    }
  };

  const removeKeyword = (idx: number) => {
    handleInputChange('keywords', formData.keywords.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runValidation("SUBMISSION")) return;
    
    setSubmitting(true);
    const session = await fetchSession();
    const payload = {
      candidate_name: formData.candidate_name,
      candidate_email: formData.candidate_email,
      company_website: formData.company_website,
      hq_country: formData.hq_country,
      year_founded: formData.year_founded,
      estimated_size: formData.estimated_size,
      funding_stage: formData.funding_stage,
      product_name: formData.product_name,
      product_category: formData.product_category,
      finops: Array.isArray(formData.finops) ? formData.finops.join(", ") : "",
      buyer_persona: Array.isArray(formData.buyer_persona) ? formData.buyer_persona.join(", ") : "",
      company_name: company.company_name,
      company_key: company.company_key,
      created_by: session?.user.id,
      evidence_links: formData.evidence_links,
      notes: formData.notes,
      keywords: Array.isArray(formData.keywords) ? formData.keywords.join(", ") : ""
    };

    const { error } = await submitResearch(payload);

    if (error) {
      logError("research.submit.error", { error });
      alert("Error saving: " + error.message);
      setSubmitting(false);
      return;
    }

    logInfo("research.submit.success", { companyKey });
    localStorage.removeItem(`research_progress_${companyKey}`);
    navigate("/reserve");
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono' }}>INITIALIZING...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div className="logo-container">
        <h1>ATOMITY</h1>
        <div className="tagline">Market & Competitive Intelligence</div>
      </div>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #000' }}>
        <h2 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 800 }}>Terminal // {company?.company_name}</h2>
        <div style={{ fontSize: '0.7rem', color: '#71717a' }}>Step: {currentStep}</div>
      </header>

      <div className="card" style={{ borderRadius: '16px' }}>
        {currentStep === "GENERAL" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem' }}>General Profile</h3>
            {showValidationErrors && Object.keys(errors).length > 0 && (
              <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', border: '1px solid #ef4444', borderRadius: '8px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                Please complete all required fields before continuing.
              </div>
            )}
            <div style={{ display: 'grid', gap: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Full Name *</label>
                  <input value={formData.candidate_name} onChange={e => handleInputChange('candidate_name', e.target.value)} style={{ borderColor: errors.candidate_name ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '8px', padding: '0.75rem' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>Enter your full legal name as the researcher.</div>
                  {errors.candidate_name && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.4rem' }}>{errors.candidate_name}</div>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Researcher Email</label>
                  <input disabled value={formData.candidate_email} style={{ backgroundColor: '#f4f4f5', width: '100%', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e4e4e7' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>Terminal authenticated identity.</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Reserved Company</label>
                  <input disabled value={company.company_name} style={{ backgroundColor: '#f4f4f5', width: '100%', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e4e4e7', textTransform: 'uppercase', fontWeight: 700 }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>Currently active research entity.</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>HQ Country *</label>
                  <input value={formData.hq_country} onChange={e => handleInputChange('hq_country', e.target.value)} style={{ borderColor: errors.hq_country ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '8px', padding: '0.75rem' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>Primary nation of corporate operation.</div>
                  {errors.hq_country && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.4rem' }}>{errors.hq_country}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Company Website *</label>
                  <input value={formData.company_website} onChange={e => handleInputChange('company_website', e.target.value)} style={{ borderColor: errors.company_website ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '8px', padding: '0.75rem' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>Official primary corporate URL.</div>
                  {errors.company_website && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.4rem' }}>{errors.company_website}</div>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Number of Employees *</label>
                  <input type="number" value={formData.estimated_size} onChange={e => handleInputChange('estimated_size', e.target.value)} placeholder="Headcount" style={{ borderColor: errors.estimated_size ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '8px', padding: '0.75rem' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>Approximate employee count.</div>
                  {errors.estimated_size && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.4rem' }}>{errors.estimated_size}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Funding Stage</label>
                  <input value={formData.funding_stage} onChange={e => handleInputChange('funding_stage', e.target.value)} placeholder="e.g. Series A" style={{ width: '100%', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e4e4e7' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>Pre-seed, Series A etc. or NA.</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Year Founded *</label>
                  <input value={formData.year_founded} onChange={e => handleInputChange('year_founded', e.target.value)} placeholder="YYYY" style={{ borderColor: errors.year_founded ? '#ef4444' : '#e4e4e7', width: '100%', borderRadius: '8px', padding: '0.75rem' }} />
                  <div style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '0.4rem' }}>Official incorporation year.</div>
                  {errors.year_founded && <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.4rem' }}>{errors.year_founded}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === "ANALYSIS" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem' }}>Product Analysis</h3>
            <div style={{ display: 'grid', gap: '2.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  What kind of product do they have or focused on?
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {(() => {
                    const finopsArray = Array.isArray(formData.finops) ? formData.finops : [];
                    return ["FinOps", "Compliance", "Sovereignty", "Sustainability"].map(opt => (
                      <button key={opt} type="button" onClick={() => handleToggleOption(opt)} style={{ padding: '0.75rem 1.75rem', borderRadius: '30px', backgroundColor: finopsArray.includes(opt) ? '#000' : '#fff', color: finopsArray.includes(opt) ? '#fff' : '#000', border: '1px solid #000', cursor: 'pointer', fontWeight: 600 }}>{opt}</button>
                    ));
                  })()}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  Most used keywords on "{company?.company_name || 'the'}" website
                  <div 
                    style={{ 
                      marginLeft: '8px', 
                      width: '18px', 
                      height: '18px', 
                      borderRadius: '50%', 
                      border: '1px solid #71717a', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '0.7rem', 
                      color: '#71717a', 
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={() => setShowKeywordTooltip(true)}
                    onMouseLeave={() => setShowKeywordTooltip(false)}
                    onClick={() => setShowKeywordTooltip(!showKeywordTooltip)}
                  >
                    ?
                    {showKeywordTooltip && (
                      <div style={{
                        position: 'absolute',
                        bottom: '25px',
                        left: '0',
                        backgroundColor: '#ffffff',
                        border: '1px solid #000000',
                        padding: '12px',
                        borderRadius: '8px',
                        zIndex: 100,
                        width: 'max-content',
                        maxWidth: '450px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        color: '#000000',
                        fontWeight: 'normal',
                        lineHeight: '1.4',
                        whiteSpace: 'nowrap'
                      }}>
                        (e.g. FinOps, sovereign, etc.)
                      </div>
                    )}
                  </div>
                </label>
                <div className={styles.keywordWrap}>
                  <div className={styles.keywordRow}>
                    <div className={styles.chipGroup}>
                      {formData.keywords.map((kw, idx) => (
                        <span key={idx} className={styles.chip}>
                          #{kw}
                          <button 
                            type="button" 
                            onClick={() => removeKeyword(idx)} 
                            className={styles.chipRemove}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <input 
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={handleAddKeyword}
                    placeholder="Type keyword + Enter..."
                    className={styles.keywordInput}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  Buyer Persona (who is website info aimed at?)
                  <div 
                    style={{ 
                      marginLeft: '8px', 
                      width: '18px', 
                      height: '18px', 
                      borderRadius: '50%', 
                      border: '1px solid #71717a', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '0.7rem', 
                      color: '#71717a', 
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={() => setShowPersonaTooltip(true)}
                    onMouseLeave={() => setShowPersonaTooltip(false)}
                    onClick={() => setShowPersonaTooltip(!showPersonaTooltip)}
                  >
                    ?
                    {showPersonaTooltip && (
                      <div style={{
                        position: 'absolute',
                        bottom: '25px',
                        left: '0',
                        backgroundColor: '#ffffff',
                        border: '1px solid #000000',
                        padding: '12px',
                        borderRadius: '8px',
                        zIndex: 100,
                        width: 'max-content',
                        maxWidth: '450px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        color: '#000000',
                        fontWeight: 'normal',
                        lineHeight: '1.4',
                        whiteSpace: 'nowrap'
                      }}>
                        <strong>Examples:</strong><br />
                        • “Reduce cloud spend by 30%” → CFO / FinOps<br />
                        • “Ensure compliance with EU regulations” → CISO / Legal<br />
                        • “Automate infrastructure at scale” → CTO / Platform teams<br />
                        • “Meet CSRD reporting requirements” → Sustainability / ESG
                      </div>
                    )}
                  </div>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {["CTO", "CFO", "CISO", "Sustainable Heads"].map(opt => (
                    <button key={opt} type="button" onClick={() => {
                      const current = Array.isArray(formData.buyer_persona) ? formData.buyer_persona : [];
                      const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                      handleInputChange('buyer_persona', next);
                    }} style={{ padding: '0.75rem 1.75rem', borderRadius: '30px', backgroundColor: Array.isArray(formData.buyer_persona) && formData.buyer_persona.includes(opt) ? '#000' : '#fff', color: Array.isArray(formData.buyer_persona) && formData.buyer_persona.includes(opt) ? '#fff' : '#000', border: '1px solid #000', cursor: 'pointer', fontWeight: 600 }}>{opt}</button>
                  ))}
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
                  <input value={formData.product_name} onChange={e => handleInputChange('product_name', e.target.value)} style={{ width: '100%', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e4e4e7' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Product Category</label>
                  <input value={formData.product_category} onChange={e => handleInputChange('product_category', e.target.value)} style={{ width: '100%', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e4e4e7' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Evidence Links</label>
                <textarea style={{ width: '100%', minHeight: '100px', borderRadius: '8px', padding: '1rem', border: '1px solid #e4e4e7' }} value={formData.evidence_links} onChange={e => handleInputChange('evidence_links', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#71717a', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Additional Notes</label>
                <textarea style={{ width: '100%', minHeight: '100px', borderRadius: '8px', padding: '1rem', border: '1px solid #e4e4e7' }} value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #f4f4f5' }}>
          <button type="button" onClick={handleBack} disabled={currentStep === "GENERAL"} style={{ padding: '0.75rem 2.5rem', borderRadius: '30px', border: '1px solid #000', cursor: 'pointer', visibility: currentStep === "GENERAL" ? 'hidden' : 'visible' }}>Back</button>
          {currentStep !== "SUBMISSION" ? (
            <button type="button" onClick={handleNext} style={{ padding: '0.75rem 2.5rem', borderRadius: '30px', backgroundColor: '#000', color: '#fff', cursor: 'pointer' }}>Next</button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: '0.75rem 2.5rem', borderRadius: '30px', backgroundColor: '#000', color: '#fff', cursor: 'pointer' }}>{submitting ? "Processing..." : "Submit Research"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
