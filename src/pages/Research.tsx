import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import styles from "./Research.module.css";
import buttonStyles from "../styles/buttons.module.css";

type Step = "GENERAL" | "ANALYSIS" | "SUBMISSION";

const initialFormData = {
  buyer_persona: [] as string[],
  cloud_support: [] as string[],
  target_customer_size: [] as string[],
  target_locations: [] as string[],
  implementation_details: "",
  customer_names: [] as string[],
  compliance_certifications: [] as string[],
  pricing_models: [] as string[],
  pilot_offers: [] as string[],
  automation_level: [] as string[],
  action_responsibility: [] as string[],
  conclusion_summary: "",
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
  notes: "",
  keywords: [] as string[]
};

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
  const [showCloudSupportTooltip, setShowCloudSupportTooltip] = useState(false);
  const [showConclusionTooltip, setShowConclusionTooltip] = useState(false);
  const [showEvidenceTooltip, setShowEvidenceTooltip] = useState(false);
  const [showProductFocusTooltip, setShowProductFocusTooltip] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [shakeValidation, setShakeValidation] = useState(false);
  const [reservationValid, setReservationValid] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  const [cloudSupportInput, setCloudSupportInput] = useState("");
  const [customerNameInput, setCustomerNameInput] = useState("");

  const [formData, setFormData] = useState({ ...initialFormData });

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

      const isOwner = data.reserved_by && data.reserved_by === session.user.id;
      const isReserved = data.reservation_status === "reserved";
      const expiresAt = data.reservation_expires_at ? new Date(data.reservation_expires_at).getTime() : 0;
      const notExpired = expiresAt > Date.now();

      if (!isOwner || !isReserved || !notExpired) {
        let message = "Reservation unavailable. Please reserve this company again.";
        if (!isOwner && data.reserved_by) {
          message = "The company you are trying to reserve is already taken by another user. Please try another company name.";
        } else if (!isReserved) {
          message = "This reservation is no longer active. Please reserve the company again.";
        } else if (!notExpired) {
          message = "This reservation has expired. Please reserve the company again.";
        }
        setReservationError(message);
        setReservationValid(false);
        setLoading(false);
        return;
      }

      setReservationValid(true);
      setCompany(data);
      
      const saved = localStorage.getItem(`research_progress_${companyKey}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const safeParsed = parsed && typeof parsed === "object" ? parsed : {};
          setFormData(prev => ({
            ...initialFormData,
            ...prev,
            ...safeParsed,
            finops: Array.isArray(safeParsed.finops) ? safeParsed.finops : [],
            buyer_persona: Array.isArray(safeParsed.buyer_persona) ? safeParsed.buyer_persona : [],
            keywords: Array.isArray(safeParsed.keywords) ? safeParsed.keywords : [],
            cloud_support: Array.isArray(safeParsed.cloud_support) ? safeParsed.cloud_support : [],
            target_customer_size: Array.isArray(safeParsed.target_customer_size) ? safeParsed.target_customer_size : [],
            target_locations: Array.isArray(safeParsed.target_locations) ? safeParsed.target_locations : [],
            customer_names: Array.isArray(safeParsed.customer_names) ? safeParsed.customer_names : [],
            compliance_certifications: Array.isArray(safeParsed.compliance_certifications) ? safeParsed.compliance_certifications : [],
            pricing_models: Array.isArray(safeParsed.pricing_models) ? safeParsed.pricing_models : [],
            pilot_offers: Array.isArray(safeParsed.pilot_offers) ? safeParsed.pilot_offers : [],
            automation_level: Array.isArray(safeParsed.automation_level) ? safeParsed.automation_level : [],
            action_responsibility: Array.isArray(safeParsed.action_responsibility) ? safeParsed.action_responsibility : [],
            conclusion_summary: typeof safeParsed.conclusion_summary === "string" ? safeParsed.conclusion_summary : ""
          }));
        } catch {
          setFormData(prev => ({ ...initialFormData, ...prev }));
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

  useEffect(() => {
    if (!reservationValid || !company?.company_key) return;

    const ping = async () => {
      const { error } = await supabase.rpc("keep_alive_company", {
        p_company_key: company.company_key,
      });

      if (error) {
        console.error("keep_alive_company error:", error);
      }
    };

    void ping();
    const interval = window.setInterval(ping, 60_000);
    return () => window.clearInterval(interval);
  }, [reservationValid, company?.company_key]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const hasValue = typeof value === 'string' ? value.trim() : (Array.isArray(value) ? value.length > 0 : !!value);
      if (hasValue) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const validateStep = (step: Step) => {
    const newErrors: Record<string, string> = {};
    if (step === "GENERAL") {
      const candidateName = String(formData.candidate_name || "");
      const hqCountry = String(formData.hq_country || "");
      const companyWebsite = String(formData.company_website || "");
      const yearFounded = String(formData.year_founded || "");
      if (!candidateName.trim()) newErrors.candidate_name = "Required";
      if (!hqCountry.trim()) newErrors.hq_country = "Required";
      if (!companyWebsite.trim()) newErrors.company_website = "Required";
      if (!yearFounded.trim()) newErrors.year_founded = "Required";
      const estimatedSizeStr = String(formData.estimated_size || '');
      if (!estimatedSizeStr.trim()) newErrors.estimated_size = "Required";
    }
    if (step === "ANALYSIS") {
      if (!Array.isArray(formData.finops) || formData.finops.length === 0) newErrors.finops = "Required";
      if (!Array.isArray(formData.keywords) || formData.keywords.length === 0) newErrors.keywords = "Required";
      if (!Array.isArray(formData.buyer_persona) || formData.buyer_persona.length === 0) newErrors.buyer_persona = "Required";
      if (!Array.isArray(formData.cloud_support) || formData.cloud_support.length === 0) newErrors.cloud_support = "Required";
      if (!Array.isArray(formData.target_customer_size) || formData.target_customer_size.length === 0) newErrors.target_customer_size = "Required";
      if (!Array.isArray(formData.target_locations) || formData.target_locations.length === 0) newErrors.target_locations = "Required";
      if (!String(formData.implementation_details || "").trim()) newErrors.implementation_details = "Required";
      if (!Array.isArray(formData.customer_names) || formData.customer_names.length === 0) newErrors.customer_names = "Required";
      if (!Array.isArray(formData.compliance_certifications) || formData.compliance_certifications.length === 0) newErrors.compliance_certifications = "Required";
      if (!Array.isArray(formData.pricing_models) || formData.pricing_models.length === 0) newErrors.pricing_models = "Required";
      if (!Array.isArray(formData.pilot_offers) || formData.pilot_offers.length === 0) newErrors.pilot_offers = "Required";
      if (!Array.isArray(formData.automation_level) || formData.automation_level.length === 0) newErrors.automation_level = "Required";
      if (!Array.isArray(formData.action_responsibility) || formData.action_responsibility.length === 0) newErrors.action_responsibility = "Required";
    }
    if (step === "SUBMISSION") {
      if (!String(formData.conclusion_summary || "").trim()) newErrors.conclusion_summary = "Required";
      if (!String(formData.evidence_links || "").trim()) newErrors.evidence_links = "Required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (submissionComplete) return;
    if (!validateStep(currentStep)) {
      setShowValidationErrors(true);
      setShakeValidation(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowValidationErrors(false);
    if (currentStep === "GENERAL") setCurrentStep("ANALYSIS");
    else if (currentStep === "ANALYSIS") setCurrentStep("SUBMISSION");
  };

  const handleBack = () => {
    if (submissionComplete) return;
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

  const handleAddCloudSupport = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = cloudSupportInput.trim().replace(/^#/, '');
      if (val && !formData.cloud_support.includes(val)) {
        handleInputChange('cloud_support', [...formData.cloud_support, val]);
      }
      setCloudSupportInput("");
    }
  };

  const removeCloudSupport = (idx: number) => {
    handleInputChange('cloud_support', formData.cloud_support.filter((_, i) => i !== idx));
  };

  const handleAddCustomerName = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = customerNameInput.trim().replace(/^#/, '');
      if (val && !formData.customer_names.includes(val)) {
        handleInputChange('customer_names', [...formData.customer_names, val]);
      }
      setCustomerNameInput("");
    }
  };

  const removeCustomerName = (idx: number) => {
    handleInputChange('customer_names', formData.customer_names.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationValid || !company?.company_key) {
      setReservationError("Your reservation is not active. Please return to Reserve and claim the company again.");
      return;
    }
    if (!validateStep("SUBMISSION")) {
      setShowValidationErrors(true);
      setShakeValidation(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowValidationErrors(false);
    
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Session expired. Please sign in again.");
      setSubmitting(false);
      navigate("/login");
      return;
    }

    const { error: keepAliveError } = await supabase.rpc("keep_alive_company", {
      p_company_key: company.company_key,
    });
    if (keepAliveError) {
      console.error("keep_alive_company error:", keepAliveError);
    }

    const { error } = await supabase
      .from("research_submissions")
      .upsert([{
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
        cloud_support: Array.isArray(formData.cloud_support) ? formData.cloud_support.join(", ") : "",
        target_customer_size: Array.isArray(formData.target_customer_size) ? formData.target_customer_size.join(", ") : "",
        target_locations: Array.isArray(formData.target_locations) ? formData.target_locations.join(", ") : "",
        implementation_details: formData.implementation_details,
        customer_names: Array.isArray(formData.customer_names) ? formData.customer_names.join(", ") : "",
        compliance_certifications: Array.isArray(formData.compliance_certifications) ? formData.compliance_certifications.join(", ") : "",
        pricing_models: Array.isArray(formData.pricing_models) ? formData.pricing_models.join(", ") : "",
        pilot_offers: Array.isArray(formData.pilot_offers) ? formData.pilot_offers.join(", ") : "",
        automation_level: Array.isArray(formData.automation_level) ? formData.automation_level.join(", ") : "",
        action_responsibility: Array.isArray(formData.action_responsibility) ? formData.action_responsibility.join(", ") : "",
        conclusion_summary: formData.conclusion_summary,
        company_name: company.company_name,
        company_key: company.company_key,
        created_by: session?.user.id,
        evidence_links: formData.evidence_links,
        notes: formData.notes,
        keywords: formData.keywords.join(", ")
      }], { onConflict: "company_key" });

    if (error) {
      alert("Error saving: " + error.message);
      setSubmitting(false);
    } else {
      localStorage.removeItem(`research_progress_${companyKey}`);
      setSubmitting(false);
      setSubmissionComplete(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono' }}>INITIALIZING...</div>;
  if (reservationError) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        <div className="card" style={{ padding: '2.5rem', borderRadius: '16px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Reservation Required</h2>
          <p style={{ marginTop: 0, marginBottom: '2rem', color: '#71717a' }}>{reservationError}</p>
          <button className={buttonStyles.primary} onClick={() => navigate("/reserve")}>Go to Reserve</button>
        </div>
      </div>
    );
  }

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
        {submissionComplete && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(255,255,255,0.94)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem', borderRadius: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#71717a', marginBottom: '0.75rem' }}>Submission Complete</div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Research saved successfully.</h3>
              <p style={{ marginTop: '0.75rem', marginBottom: 0, color: '#71717a', fontSize: '0.85rem' }}>
                You can close this tab or keep it open for your records.
              </p>
            </div>
          </div>
        )}
        {currentStep === "GENERAL" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem' }}>General Profile</h3>
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
            {showValidationErrors && Object.keys(errors).length > 0 && (
              <div
                onAnimationEnd={() => setShakeValidation(false)}
                style={{
                  marginBottom: '1.5rem',
                  padding: '0.75rem 1rem',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  fontWeight: 600,
                  animation: shakeValidation ? 'validationBounce 420ms ease' : 'none'
                }}
              >
                Please complete all required fields before continuing.
              </div>
            )}
            <div style={{ display: 'grid', gap: '2.5rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  1. What is the company’s primary product focus or positioning (as publicly stated) *
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
                    onMouseEnter={() => setShowProductFocusTooltip(true)}
                    onMouseLeave={() => setShowProductFocusTooltip(false)}
                    onClick={() => setShowProductFocusTooltip(!showProductFocusTooltip)}
                  >
                    ?
                    {showProductFocusTooltip && (
                      <div style={{
                        position: 'absolute',
                        bottom: '25px',
                        left: '0',
                        backgroundColor: '#ffffff',
                        border: '1px solid #000000',
                        padding: '12px',
                        borderRadius: '8px',
                        zIndex: 100,
                        display: 'inline-block',
                        width: 'max-content',
                        maxWidth: '90vw',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        color: '#000000',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '1.4',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}>
                        FinOps – cloud cost management<br />
                        Sustainability – emissions measurement or reduction<br />
                        Compliance – regulatory or security controls<br />
                        Sovereignty – data residency or jurisdictional control
                      </div>
                    )}
                  </div>
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
                  2. Most used keywords on "{company?.company_name || 'the'}" website *
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
                        display: 'inline-block',
                        width: 'max-content',
                        maxWidth: '90vw',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        color: '#000000',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '1.4',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}>
                        (e.g. FinOps, sovereign, etc.)
                      </div>
                    )}
                  </div>
                </label>
                <div className={styles.keywordWrap}>
                  <input 
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={handleAddKeyword}
                    placeholder="Type keyword + Enter..."
                    className={styles.keywordInput}
                  />
                  {formData.keywords.length > 0 && (
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
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  3. Buyer Persona (who is website info aimed at?) *
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
                        display: 'inline-block',
                        width: 'max-content',
                        maxWidth: '90vw',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        color: '#000000',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '1.4',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}>
                        Examples:<br />
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

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  4. Which cloud platforms or hyperscalers does the company officially support, integrate with, or partner with? *
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
                    onMouseEnter={() => setShowCloudSupportTooltip(true)}
                    onMouseLeave={() => setShowCloudSupportTooltip(false)}
                    onClick={() => setShowCloudSupportTooltip(!showCloudSupportTooltip)}
                  >
                    ?
                    {showCloudSupportTooltip && (
                      <div style={{
                        position: 'absolute',
                        bottom: '25px',
                        left: '0',
                        backgroundColor: '#ffffff',
                        border: '1px solid #000000',
                        padding: '12px',
                        borderRadius: '8px',
                        zIndex: 100,
                        display: 'inline-block',
                        width: 'max-content',
                        maxWidth: '90vw',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        color: '#000000',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '1.4',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}>
                        (e.g. Amazon, Azure, GCP, STACKIT,<br />
                        OVH, Hetzner, Open Telekom Cloud,<br />
                        etc.)
                      </div>
                    )}
                  </div>
                </label>
                <div className={styles.keywordWrap}>
                  <input 
                    value={cloudSupportInput}
                    onChange={e => setCloudSupportInput(e.target.value)}
                    onKeyDown={handleAddCloudSupport}
                    placeholder="Type provider + Enter..."
                    className={styles.keywordInput}
                  />
                  {formData.cloud_support.length > 0 && (
                    <div className={styles.chipGroup}>
                      {formData.cloud_support.map((kw, idx) => (
                        <span key={idx} className={styles.chip}>
                          #{kw}
                          <button 
                            type="button" 
                            onClick={() => removeCloudSupport(idx)} 
                            className={styles.chipRemove}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  5. Target customer size *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {["SME", "Mid-market", "Enterprise", "NA"].map(opt => (
                    <button key={opt} type="button" onClick={() => {
                      const current = Array.isArray(formData.target_customer_size) ? formData.target_customer_size : [];
                      const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                      handleInputChange('target_customer_size', next);
                    }} style={{ padding: '0.75rem 1.75rem', borderRadius: '30px', backgroundColor: Array.isArray(formData.target_customer_size) && formData.target_customer_size.includes(opt) ? '#000' : '#fff', color: Array.isArray(formData.target_customer_size) && formData.target_customer_size.includes(opt) ? '#fff' : '#000', border: '1px solid #000', cursor: 'pointer', fontWeight: 600 }}>{opt}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  6. Primary target geographies for "{company?.company_name || 'the company'}" *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {["EU", "Asia", "US", "Global"].map(opt => (
                    <button key={opt} type="button" onClick={() => {
                      const current = Array.isArray(formData.target_locations) ? formData.target_locations : [];
                      const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                      handleInputChange('target_locations', next);
                    }} style={{ padding: '0.75rem 1.75rem', borderRadius: '30px', backgroundColor: Array.isArray(formData.target_locations) && formData.target_locations.includes(opt) ? '#000' : '#fff', color: Array.isArray(formData.target_locations) && formData.target_locations.includes(opt) ? '#fff' : '#000', border: '1px solid #000', cursor: 'pointer', fontWeight: 600 }}>{opt}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  7. Does "{company?.company_name || 'the company'}" mention or claim AI capabilities in their product? Describe in detail. *
                </label>
                <textarea
                  value={formData.implementation_details}
                  onChange={e => handleInputChange('implementation_details', e.target.value)}
                  placeholder="Share a detailed explanation..."
                  style={{ width: '100%', minHeight: '120px', borderRadius: '8px', padding: '1rem', border: '1px solid #e4e4e7' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  8. Are any customer names publicly disclosed on the company’s website or LinkedIn page? *
                </label>
                <div className={styles.keywordWrap}>
                  <input 
                    value={customerNameInput}
                    onChange={e => setCustomerNameInput(e.target.value)}
                    onKeyDown={handleAddCustomerName}
                    placeholder="Type customer + Enter..."
                    className={styles.keywordInput}
                  />
                  {formData.customer_names.length > 0 && (
                    <div className={styles.chipGroup}>
                      {formData.customer_names.map((kw, idx) => (
                        <span key={idx} className={styles.chip}>
                          #{kw}
                          <button 
                            type="button" 
                            onClick={() => removeCustomerName(idx)} 
                            className={styles.chipRemove}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  9. Does the company publicly reference any compliance or security certifications? *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {["C5 (BSI)", "ISO (e.g., ISO/IEC 27001)", "SOC (SOC 1 / SOC 2)", "None"].map(opt => (
                    <button key={opt} type="button" onClick={() => {
                      const current = Array.isArray(formData.compliance_certifications) ? formData.compliance_certifications : [];
                      const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                      handleInputChange('compliance_certifications', next);
                    }} style={{ padding: '0.75rem 1.75rem', borderRadius: '30px', backgroundColor: Array.isArray(formData.compliance_certifications) && formData.compliance_certifications.includes(opt) ? '#000' : '#fff', color: Array.isArray(formData.compliance_certifications) && formData.compliance_certifications.includes(opt) ? '#fff' : '#000', border: '1px solid #000', cursor: 'pointer', fontWeight: 600 }}>{opt}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  10. What pricing model(s) does the company offer (as publicly disclosed)? *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {["Flat subscription", "Usage-based pricing", "Performance-based pricing", "Enterprise / custom pricing", "Not publicly disclosed"].map(opt => (
                    <button key={opt} type="button" onClick={() => {
                      const current = Array.isArray(formData.pricing_models) ? formData.pricing_models : [];
                      const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                      handleInputChange('pricing_models', next);
                    }} style={{ padding: '0.75rem 1.75rem', borderRadius: '30px', backgroundColor: Array.isArray(formData.pricing_models) && formData.pricing_models.includes(opt) ? '#000' : '#fff', color: Array.isArray(formData.pricing_models) && formData.pricing_models.includes(opt) ? '#fff' : '#000', border: '1px solid #000', cursor: 'pointer', fontWeight: 600 }}>{opt}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  11. Does the company offer a pilot, trial, or free tier? If yes, please specify. *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {["Free trial (limited)", "Free tier (limited)", "None stated"].map(opt => (
                    <button key={opt} type="button" onClick={() => {
                      const current = Array.isArray(formData.pilot_offers) ? formData.pilot_offers : [];
                      const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                      handleInputChange('pilot_offers', next);
                    }} style={{ padding: '0.75rem 1.75rem', borderRadius: '30px', backgroundColor: Array.isArray(formData.pilot_offers) && formData.pilot_offers.includes(opt) ? '#000' : '#fff', color: Array.isArray(formData.pilot_offers) && formData.pilot_offers.includes(opt) ? '#fff' : '#000', border: '1px solid #000', cursor: 'pointer', fontWeight: 600 }}>{opt}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  12. What is the highest level of automation the product provides (as publicly disclosed)? *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {[
                    "None (manual analysis only)",
                    "Alerts only",
                    "Recommendations (human-in-the-loop)",
                    "Automated actions (policy- or rule-based)",
                    "Real-time orchestration (continuous, cross-system)"
                  ].map(opt => (
                    <button key={opt} type="button" onClick={() => {
                      const current = Array.isArray(formData.automation_level) ? formData.automation_level : [];
                      const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                      handleInputChange('automation_level', next);
                    }} style={{ padding: '0.75rem 1.75rem', borderRadius: '30px', backgroundColor: Array.isArray(formData.automation_level) && formData.automation_level.includes(opt) ? '#000' : '#fff', color: Array.isArray(formData.automation_level) && formData.automation_level.includes(opt) ? '#fff' : '#000', border: '1px solid #000', cursor: 'pointer', fontWeight: 600 }}>{opt}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  13. Who is responsible for executing actions once insights or decisions are generated? *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {[
                    "Customer (manual execution)",
                    "Customer via scripts / tooling",
                    "Platform executes actions automatically",
                    "Vendor consultants / managed service",
                    "Not clearly disclosed"
                  ].map(opt => (
                    <button key={opt} type="button" onClick={() => {
                      const current = Array.isArray(formData.action_responsibility) ? formData.action_responsibility : [];
                      const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                      handleInputChange('action_responsibility', next);
                    }} style={{ padding: '0.75rem 1.75rem', borderRadius: '30px', backgroundColor: Array.isArray(formData.action_responsibility) && formData.action_responsibility.includes(opt) ? '#000' : '#fff', color: Array.isArray(formData.action_responsibility) && formData.action_responsibility.includes(opt) ? '#fff' : '#000', border: '1px solid #000', cursor: 'pointer', fontWeight: 600 }}>{opt}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === "SUBMISSION" && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem' }}>Conclusion</h3>
            {showValidationErrors && Object.keys(errors).length > 0 && (
              <div
                onAnimationEnd={() => setShakeValidation(false)}
                style={{
                  marginBottom: '1.5rem',
                  padding: '0.75rem 1rem',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  fontWeight: 600,
                  animation: shakeValidation ? 'validationBounce 420ms ease' : 'none'
                }}
              >
                Please complete all required fields before continuing.
              </div>
            )}
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  1. Based on your analysis, describe the competitor’s key strengths and key limitations as a product or platform. *
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
                    onMouseEnter={() => setShowConclusionTooltip(true)}
                    onMouseLeave={() => setShowConclusionTooltip(false)}
                    onClick={() => setShowConclusionTooltip(!showConclusionTooltip)}
                  >
                    ?
                    {showConclusionTooltip && (
                      <div style={{
                        position: 'absolute',
                        bottom: '25px',
                        left: '0',
                        backgroundColor: '#ffffff',
                        border: '1px solid #000000',
                        padding: '12px',
                        borderRadius: '8px',
                        zIndex: 100,
                        display: 'inline-block',
                        width: 'max-content',
                        maxWidth: '90vw',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        color: '#000000',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '1.4',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}>
                        Focus on capabilities, automation level,<br />
                        pricing model, compliance posture,<br />
                        execution complexity, and customer experience.
                      </div>
                    )}
                  </div>
                </label>
                <textarea
                  value={formData.conclusion_summary}
                  onChange={e => handleInputChange('conclusion_summary', e.target.value)}
                  placeholder="Write a concise, evidence-based summary..."
                  style={{ width: '100%', minHeight: '140px', borderRadius: '8px', padding: '1rem', border: '1px solid #e4e4e7' }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  2. Evidence Links *
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
                    onMouseEnter={() => setShowEvidenceTooltip(true)}
                    onMouseLeave={() => setShowEvidenceTooltip(false)}
                    onClick={() => setShowEvidenceTooltip(!showEvidenceTooltip)}
                  >
                    ?
                    {showEvidenceTooltip && (
                      <div style={{
                        position: 'absolute',
                        bottom: '25px',
                        left: '0',
                        backgroundColor: '#ffffff',
                        border: '1px solid #000000',
                        padding: '12px',
                        borderRadius: '8px',
                        zIndex: 100,
                        display: 'inline-block',
                        width: 'max-content',
                        maxWidth: '90vw',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        color: '#000000',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '1.4',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}>
                        Paste direct URLs that support your findings:<br />
                        product pages, documentation, pricing pages,<br />
                        blog posts, case studies, or LinkedIn posts.
                      </div>
                    )}
                  </div>
                </label>
                <textarea style={{ width: '100%', minHeight: '100px', borderRadius: '8px', padding: '1rem', border: '1px solid #e4e4e7' }} value={formData.evidence_links} onChange={e => handleInputChange('evidence_links', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: '0.75rem' }}>
                  3. Additional Notes
                </label>
                <textarea style={{ width: '100%', minHeight: '100px', borderRadius: '8px', padding: '1rem', border: '1px solid #e4e4e7' }} value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #f4f4f5' }}>
          <button type="button" className={`${buttonStyles.secondary} ${buttonStyles.pill}`} onClick={handleBack} disabled={currentStep === "GENERAL"} style={{ padding: '0.75rem 2.5rem', cursor: 'pointer', visibility: currentStep === "GENERAL" ? 'hidden' : 'visible' }}>Back</button>
          {currentStep !== "SUBMISSION" ? (
            <button className={`${buttonStyles.primary} ${buttonStyles.pill}`} type="button" onClick={handleNext} style={{ padding: '0.75rem 2.5rem', cursor: 'pointer' }}>Next</button>
          ) : (
            <button className={`${buttonStyles.primary} ${buttonStyles.pill}`} onClick={handleSubmit} disabled={submitting} style={{ padding: '0.75rem 2.5rem', cursor: 'pointer' }}>{submitting ? "Processing..." : "Submit Research"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
