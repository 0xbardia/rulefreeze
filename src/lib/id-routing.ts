// RuleFreeze Canonical ID Format Validation & Routing Helper

export const LIVE_EVENT_ID_REGEX = /^ev-[1-9]\d*$/;
export const DEMO_EVENT_ID_REGEX = /^demo-ev-[1-9]\d*$/;

export const LIVE_AMENDMENT_ID_REGEX = /^amend-[1-9]\d*$/;
export const DEMO_AMENDMENT_ID_REGEX = /^demo-amend-[1-9]\d*$/;

export const LIVE_VERSION_ID_REGEX = /^ver-[1-9]\d*$/;
export const DEMO_VERSION_ID_REGEX = /^demo-ver-[1-9]\d*$/;

export const LIVE_ASSESSMENT_ID_REGEX = /^assess-[1-9]\d*$/;
export const DEMO_ASSESSMENT_ID_REGEX = /^demo-assess-[1-9]\d*$/;

export function isLiveEventId(id: string): boolean {
  return LIVE_EVENT_ID_REGEX.test(id?.trim() || "");
}

export function isDemoEventId(id: string): boolean {
  return DEMO_EVENT_ID_REGEX.test(id?.trim() || "");
}

export function isLiveAmendmentId(id: string): boolean {
  return LIVE_AMENDMENT_ID_REGEX.test(id?.trim() || "");
}

export function isDemoAmendmentId(id: string): boolean {
  return DEMO_AMENDMENT_ID_REGEX.test(id?.trim() || "");
}

export function isLiveVersionId(id: string): boolean {
  return LIVE_VERSION_ID_REGEX.test(id?.trim() || "");
}

export function isDemoVersionId(id: string): boolean {
  return DEMO_VERSION_ID_REGEX.test(id?.trim() || "");
}

export function isLiveAssessmentId(id: string): boolean {
  return LIVE_ASSESSMENT_ID_REGEX.test(id?.trim() || "");
}

export function isDemoAssessmentId(id: string): boolean {
  return DEMO_ASSESSMENT_ID_REGEX.test(id?.trim() || "");
}
