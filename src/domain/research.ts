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
