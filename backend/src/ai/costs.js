/** AI credit costs - keep in sync with js/builder.js CREDIT_COSTS */
export const AI_CREDIT_COSTS = {
  enhance_summary: 2,
  enhance_exp: 2,
  regenerate_summary: 1,
  suggest_skills: 1,
  build_resume: 5,
  job_match: 5,
  cover_letter: 4,
  linkedin_tips: 3
};

export function getAiCreditCost(action) {
  return AI_CREDIT_COSTS[action] ?? null;
}
