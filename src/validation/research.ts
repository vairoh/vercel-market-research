import type { ResearchForm, ValidationErrors } from "../domain/research";

export const validateGeneralStep = (formData: ResearchForm): ValidationErrors => {
  const errors: ValidationErrors = {};
  const candidate_name = formData.candidate_name ?? "";
  const hq_country = formData.hq_country ?? "";
  const company_website = formData.company_website ?? "";
  const year_founded = formData.year_founded ?? "";
  const estimatedSizeStr = String(formData.estimated_size ?? "");

  if (!candidate_name.trim()) errors.candidate_name = "Required";
  if (!hq_country.trim()) errors.hq_country = "Required";
  if (!company_website.trim()) errors.company_website = "Required";
  if (!year_founded.trim()) errors.year_founded = "Required";
  if (!estimatedSizeStr.trim()) errors.estimated_size = "Required";

  return errors;
};

export const validateStep = (step: "GENERAL" | "ANALYSIS" | "SUBMISSION", formData: ResearchForm): ValidationErrors => {
  if (step === "GENERAL") return validateGeneralStep(formData);
  // Additional steps can extend validation here.
  return {};
};
