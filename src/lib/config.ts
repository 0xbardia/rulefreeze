// RuleFreeze Public Configuration & Validation

import type { PublicConfigResponse } from "./types.ts";

export const DEFAULT_STUDIONET_CHAIN_ID = 61999;
export const DEFAULT_STUDIONET_RPC = "https://studio.genlayer.com/api";

const ETH_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Validates a contract address.
 * Rejects non-strings, incorrect lengths, non-hex, and zero address.
 */
export function isValidContractAddress(address: unknown): address is `0x${string}` {
  if (typeof address !== "string") return false;
  const trimmed = address.trim();
  if (!ETH_ADDRESS_REGEX.test(trimmed)) return false;
  if (trimmed.toLowerCase() === ZERO_ADDRESS) return false;
  return true;
}

let cachedConfig: PublicConfigResponse | null = null;

/**
 * Fetches validated public configuration from the server-side allowlisted bridge.
 * Caches in memory to avoid redundant requests.
 */
export async function getPublicConfig(forceReload = false): Promise<PublicConfigResponse> {
  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  try {
    const res = await fetch("/api/public-config", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Public config endpoint returned HTTP ${res.status}`);
    }
    const data = (await res.json()) as PublicConfigResponse;
    cachedConfig = data;
    return data;
  } catch (err) {
    // Return safe unconfigured fallback
    return {
      contractAddress: null,
      rpcUrl: DEFAULT_STUDIONET_RPC,
      chainId: DEFAULT_STUDIONET_CHAIN_ID,
      isConfigured: false,
      isLiveReady: false,
      networkName: "GenLayer Studionet",
    };
  }
}
