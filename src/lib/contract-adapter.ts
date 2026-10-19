// RuleFreeze Real GenLayer SDK Contract Adapter
// Communicates with GenLayer Studionet RPC and browser wallet.

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  DEFAULT_STUDIONET_CHAIN_ID,
  DEFAULT_STUDIONET_RPC,
  isValidContractAddress,
} from "./config.ts";
import type {
  AmendmentRecord,
  AssessmentRecord,
  ContractPolicy,
  EventRecord,
  EventSummary,
  IntendedScope,
  OrganizerDecisionType,
  ParticipantScenario,
  RuleVersion,
} from "./types.ts";

export interface InjectedEthereumProvider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

export function getInjectedProvider(): InjectedEthereumProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: InjectedEthereumProvider }).ethereum;
  return eth ?? null;
}

export class ContractAdapterError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ContractAdapterError";
    this.code = code;
    this.details = details;
  }
}

/** Check and switch network to GenLayer Studionet (61999 / 0xf22f) */
export async function assertStudionetChain(provider: InjectedEthereumProvider): Promise<void> {
  const chainIdHex = (await provider.request({ method: "eth_chainId" })) as string;
  const decId = chainIdHex?.startsWith("0x") ? Number.parseInt(chainIdHex, 16) : Number(chainIdHex);

  if (decId !== DEFAULT_STUDIONET_CHAIN_ID) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${DEFAULT_STUDIONET_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: unknown) {
      // Try adding chain if not found (4902)
      const errObj = switchError as { code?: number };
      if (errObj?.code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${DEFAULT_STUDIONET_CHAIN_ID.toString(16)}`,
              chainName: "GenLayer Studionet",
              rpcUrls: [DEFAULT_STUDIONET_RPC],
              nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
            },
          ],
        });
      } else {
        throw new ContractAdapterError(
          "WRONG_NETWORK",
          `Please switch your wallet to GenLayer Studionet (Chain ID ${DEFAULT_STUDIONET_CHAIN_ID}).`,
          switchError
        );
      }
    }
  }
}

/** Create read-only client */
export function getReadClient(endpoint: string = DEFAULT_STUDIONET_RPC) {
  return createClient({
    chain: studionet,
    endpoint,
  });
}

/** Read helper: calls readContract and parses JSON string */
async function callReadMethod<T>(
  contractAddress: string,
  functionName: string,
  args: unknown[] = [],
  endpoint: string = DEFAULT_STUDIONET_RPC
): Promise<T> {
  if (!isValidContractAddress(contractAddress)) {
    throw new ContractAdapterError("INVALID_CONTRACT_ADDRESS", `Invalid contract address: ${contractAddress}`);
  }

  const client = getReadClient(endpoint);
  try {
    const raw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName,
      args: args as any,
    });
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    }
    return raw as T;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ContractAdapterError("READ_FAILED", `Failed to read ${functionName}(): ${msg}`, err);
  }
}

// --------------------------------------------------------------------------------------
// Public Reads
// --------------------------------------------------------------------------------------

export async function fetchContractPolicy(
  contractAddress: string,
  endpoint?: string
): Promise<ContractPolicy> {
  return callReadMethod<ContractPolicy>(contractAddress, "get_policy", [], endpoint);
}

export async function fetchEventCount(
  contractAddress: string,
  endpoint?: string
): Promise<number> {
  const res = await callReadMethod<number>(contractAddress, "get_event_count", [], endpoint);
  return Number(res);
}

export async function fetchEvent(
  contractAddress: string,
  eventId: string,
  endpoint?: string
): Promise<EventRecord> {
  return callReadMethod<EventRecord>(contractAddress, "get_event", [eventId], endpoint);
}

export async function fetchEvents(
  contractAddress: string,
  offset = 0,
  limit = 20,
  endpoint?: string
): Promise<{ total: number; offset: number; limit: number; events: EventSummary[] }> {
  return callReadMethod<{ total: number; offset: number; limit: number; events: EventSummary[] }>(
    contractAddress,
    "get_events",
    [offset, limit],
    endpoint
  );
}

export async function fetchRuleVersion(
  contractAddress: string,
  versionId: string,
  endpoint?: string
): Promise<RuleVersion> {
  return callReadMethod<RuleVersion>(contractAddress, "get_rule_version", [versionId], endpoint);
}

export async function fetchEventVersions(
  contractAddress: string,
  eventId: string,
  endpoint?: string
): Promise<RuleVersion[]> {
  return callReadMethod<RuleVersion[]>(contractAddress, "get_event_versions", [eventId], endpoint);
}

export async function fetchAmendment(
  contractAddress: string,
  amendmentId: string,
  endpoint?: string
): Promise<AmendmentRecord> {
  return callReadMethod<AmendmentRecord>(contractAddress, "get_amendment", [amendmentId], endpoint);
}

export async function fetchEventAmendments(
  contractAddress: string,
  eventId: string,
  endpoint?: string
): Promise<AmendmentRecord[]> {
  return callReadMethod<AmendmentRecord[]>(contractAddress, "get_event_amendments", [eventId], endpoint);
}

export async function fetchAssessment(
  contractAddress: string,
  assessmentId: string,
  endpoint?: string
): Promise<AssessmentRecord> {
  return callReadMethod<AssessmentRecord>(contractAddress, "get_assessment", [assessmentId], endpoint);
}

// --------------------------------------------------------------------------------------
// Public Writes
// --------------------------------------------------------------------------------------

export async function executeContractWrite(
  provider: InjectedEthereumProvider,
  contractAddress: string,
  accountAddress: string,
  functionName: string,
  args: (string | number | boolean | unknown[])[],
  endpoint: string = DEFAULT_STUDIONET_RPC
): Promise<string> {
  if (!isValidContractAddress(contractAddress)) {
    throw new ContractAdapterError("INVALID_CONTRACT_ADDRESS", "Invalid contract address");
  }

  await assertStudionetChain(provider);

  const client = createClient({
    chain: studionet,
    endpoint,
    provider,
  });

  try {
    const rawHash = await client.writeContract({
      address: contractAddress as `0x${string}`,
      functionName,
      args: args as any,
      account: { address: accountAddress as `0x${string}` } as any,
      value: 0n,
      leaderOnly: false,
    });
    return String(rawHash);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("4001") ||
      msg.toLowerCase().includes("user rejected") ||
      msg.toLowerCase().includes("denied")
    ) {
      throw new ContractAdapterError("USER_REJECTED", "Transaction signature was rejected in your wallet.", err);
    }
    throw new ContractAdapterError("SUBMISSION_FAILED", `Transaction write failed: ${msg}`, err);
  }
}
