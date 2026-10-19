// RuleFreeze Synthetic QA Fixtures (Section 8)

import type { ParticipantScenario } from "./types.ts";

export const SYNTHETIC_QA_FIXTURE = {
  name: "RuleFreeze Live QA — run-20261019",
  description:
    "Synthetic QA verification on GenLayer Studionet with live contract 0xC8a83C62da126891aB8F60e6D5E171480aE91c23",
  eventUrl: "https://rulefreeze.bydx.fun/qa",
  declaredStart: "2026-11-01T00:00:00Z",
  declaredDeadline: "2026-11-15T23:59:59Z",
  initialRules:
    "1. Eligibility: One entry per person.\n" +
    "2. Deliverables: A public source repository is required. A live hosted frontend is optional.\n" +
    "3. Deadlines: Final submissions due Friday before 23:59 UTC.\n" +
    "4. Scoring: Functionality accounts for 70% of scoring. Presentation accounts for 30%.",
  scenarios: [
    {
      id: "SC-A",
      title: "Public repository, no hosted frontend",
      situation: "Participant submits public source repository with no hosted frontend URL.",
      question: "Are required deliverables satisfied?",
      dimension: "DELIVERABLES",
    },
    {
      id: "SC-B",
      title: "Public repository and hosted frontend",
      situation: "Participant submits public source repository with live hosted frontend URL.",
      question: "Are required deliverables satisfied?",
      dimension: "DELIVERABLES",
    },
    {
      id: "SC-C",
      title: "One person with two wallets",
      situation: "One person using two different wallet addresses submits two entries.",
      question: "Is the second entry allowed?",
      dimension: "ELIGIBILITY",
    },
  ] as ParticipantScenario[],
};
