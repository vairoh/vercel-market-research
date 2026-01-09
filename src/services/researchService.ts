import { supabase } from "../supabaseClient";
import type { CompanyRecord, ResearchSubmissionPayload } from "../domain/research";

export const fetchSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const fetchCompanyByKey = async (companyKey: string) => {
  const { data, error } = await supabase
    .from("company_registry")
    .select("*")
    .eq("company_key", companyKey)
    .single();
  return { data: data as CompanyRecord | null, error };
};

export const submitResearch = async (payload: ResearchSubmissionPayload) =>
  supabase.from("research_submissions").insert([payload]);
