export const PROFESSIONAL_VALIDATION_KEY = "business-lifeline-professional-validation-v1";

export type AdviserFinding = {
  id: string;
  date: string;
  adviserRole: string;
  area: string;
  lifelineFinding: string;
  adviserFinding: string;
  agreement: "agree" | "partial" | "disagree" | "not-reviewed";
  severityMatch: "same" | "lifeline-higher" | "adviser-higher" | "not-applicable";
  notes: string;
};

export function readProfessionalValidation(storage: Storage = window.localStorage): AdviserFinding[] {
  try {
    const raw = storage.getItem(PROFESSIONAL_VALIDATION_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function validationMetrics(findings: AdviserFinding[]) {
  const reviewed = findings.filter((item) => item.agreement !== "not-reviewed");
  const agree = reviewed.filter((item) => item.agreement === "agree").length;
  const partial = reviewed.filter((item) => item.agreement === "partial").length;
  const disagree = reviewed.filter((item) => item.agreement === "disagree").length;
  const agreementRate = reviewed.length ? Math.round((agree + partial * .5) / reviewed.length * 100) : 0;
  const missedRiskSignals = findings.filter((item) => item.severityMatch === "adviser-higher").length;
  const falseAlarmSignals = findings.filter((item) => item.severityMatch === "lifeline-higher").length;
  return { total: findings.length, reviewed: reviewed.length, agree, partial, disagree, agreementRate, missedRiskSignals, falseAlarmSignals };
}
