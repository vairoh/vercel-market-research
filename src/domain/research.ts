export type Step = "GENERAL" | "ANALYSIS" | "SUBMISSION";

export type ResearchForm = {
  buyer_persona: string[];
  candidate_name: string;
  candidate_email: string;
  company_website: string;
  hq_country: string;
  year_founded: string;
  estimated_size: string | number;
  funding_stage: string;
  product_name: string;
  product_category: string;
  finops: string[];
  evidence_links: string;
  notes: string;
  keywords: string[];
};

export type CompanyRecord = {
  company_key: string;
  company_name: string;
  reserved_at?: string;
};

export type ValidationErrors = Record<string, string>;

export type ResearchSubmissionPayload = {
  candidate_name: string;
  candidate_email: string;
  company_website: string;
  hq_country: string;
  year_founded: string;
  estimated_size: string | number;
  funding_stage: string;
  product_name: string;
  product_category: string;
  finops: string;
  buyer_persona: string;
  company_name: string;
  company_key: string;
  created_by?: string | null;
  evidence_links: string;
  notes: string;
  keywords: string;
};

export const INITIAL_RESEARCH_FORM: ResearchForm = {
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
};

export const ensureResearchForm = (data?: Partial<ResearchForm>): ResearchForm => {
  const src = data || {};
  return {
    buyer_persona: Array.isArray(src.buyer_persona) ? src.buyer_persona : [],
    candidate_name: String(src.candidate_name ?? "").trim(),
    candidate_email: String(src.candidate_email ?? "").trim(),
    company_website: String(src.company_website ?? "").trim(),
    hq_country: String(src.hq_country ?? "").trim(),
    year_founded: String(src.year_founded ?? "").trim(),
    estimated_size: src.estimated_size ?? "",
    funding_stage: String(src.funding_stage ?? "").trim(),
    product_name: String(src.product_name ?? "").trim(),
    product_category: String(src.product_category ?? "").trim(),
    finops: Array.isArray(src.finops) ? src.finops : [],
    evidence_links: String(src.evidence_links ?? ""),
    notes: String(src.notes ?? ""),
    keywords: Array.isArray(src.keywords) ? src.keywords : []
  };
};
