#!/usr/bin/env node
// Toolchain lint for RuleFreeze. The repo has no direct eslint binary.
// This script checks the semantic-pipeline constraints the typechecker cannot see.

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];

function fail(message) {
  failures.push(message);
}

const contract = fs.readFileSync(path.join(root, "contracts/main.py"), "utf8");
const prohibited = [
  [/\beval\s*\(/, "eval()"],
  [/literal_eval\s*\(/, "literal_eval()"],
  [/str\(\s*raw\s*\)/, "str(raw)"],
  [/\.replace\(\s*['"]'['"]\s*,\s*['"]"/, "single-quote replacement"],
];
for (const [pattern, label] of prohibited) {
  if (pattern.test(contract)) fail(`contracts/main.py contains prohibited ${label}`);
}
if (!contract.includes('return gl.nondet.exec_prompt(prompt, response_format="json")')) {
  fail("assess_amendment no longer returns the exec_prompt value directly");
}
if (!contract.includes('CONTRACT_VERSION = "1.0.1"')) fail("contract version is not 1.0.1");
if (!contract.includes("SCHEMA_VERSION = 2")) fail("schema version is not 2");
if (!contract.includes('EVALUATION_POLICY_VERSION = "rulefreeze-eval-v1.1"')) {
  fail("evaluation policy is not rulefreeze-eval-v1.1");
}

const adapter = fs.readFileSync(path.join(root, "src/lib/contract-adapter.ts"), "utf8");
const writeStart = adapter.indexOf("export async function executeContractWrite");
const writeBody = writeStart >= 0 ? adapter.slice(writeStart, writeStart + 1800) : "";
if (!writeBody) fail("executeContractWrite is missing");
if (/for\s*\(|attempt|isRetryableReadError/.test(writeBody)) {
  fail("executeContractWrite retries writes");
}
if (!adapter.includes("value: 0n")) fail("write path does not pin value 0n");

const config = fs.readFileSync(path.join(root, "gltest.config.yaml"), "utf8");
if (!config.includes("/tmp/rulefreeze-gltest-artifacts")) {
  fail("gltest artifacts are not the disposable /tmp directory");
}
const artifactsLine = config.split("\n").find((line) => line.trim().startsWith("artifacts:")) || "";
if (artifactsLine.includes("evidence")) fail("gltest artifacts path points at evidence");

const sentinel = path.join(root, "evidence/SENTINEL");
if (!fs.existsSync(sentinel)) fail("evidence SENTINEL is missing");

if (failures.length) {
  for (const message of failures) console.error(`lint: ${message}`);
  process.exit(1);
}
console.log("lint-rulefreeze: ok");
