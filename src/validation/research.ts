import type { ResearchForm, ValidationErrors } from "../domain/research";

export const validateGeneralStep = (formData?: Partial<ResearchForm>): ValidationErrors => {
  const errors: ValidationErrors = {};
  const data = formData || {};
  const candidate_name = String(data.candidate_name ?? "").trim();
  const hq_country = String(data.hq_country ?? "").trim();
  const company_website = String(data.company_website ?? "").trim();
  const year_founded = String(data.year_founded ?? "").trim();
  const estimatedSizeStr = String(data.estimated_size ?? "").trim();

  if (!candidate_name) errors.candidate_name = "Required";
  if (!hq_country) errors.hq_country = "Required";
  if (!company_website) errors.company_website = "Required";
  if (!year_founded) errors.year_founded = "Required";
  if (!estimatedSizeStr) errors.estimated_size = "Required";

  return errors;
};

export const validateStep = (step: "GENERAL" | "ANALYSIS" | "SUBMISSION", formData?: Partial<ResearchForm>): ValidationErrors => {
  if (step === "GENERAL") return validateGeneralStep(formData);
  // Additional steps can extend validation here.
  return {};
};
