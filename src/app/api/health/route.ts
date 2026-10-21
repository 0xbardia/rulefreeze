import { NextResponse } from "next/server";
import {
  DEFAULT_STUDIONET_RPC,
  isValidContractAddress,
} from "@/lib/config";
import { APP_VERSION } from "@/lib/release";

export const dynamic = "force-dynamic";

export async function GET() {
  const rawAddress =
    process.env.PUBLIC_CONTRACT_ADDRESS ||
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
    "";
  const rawRpc =
    process.env.PUBLIC_GENLAYER_RPC_URL ||
    process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ||
    DEFAULT_STUDIONET_RPC;

  const validAddress = isValidContractAddress(rawAddress);

  let rpcReachable = false;
  let rpcLatencyMs: number | null = null;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const rpcRes = await fetch(rawRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    rpcLatencyMs = Date.now() - start;
    if (rpcRes.ok) {
      rpcReachable = true;
    }
  } catch {
    rpcReachable = false;
    rpcLatencyMs = null;
  }

  return NextResponse.json({
    status: "ok",
    app: "RuleFreeze",
    appVersion: APP_VERSION,
    version: APP_VERSION,
    versionDomains: {
      appVersion: APP_VERSION,
      contractVersion: { source: "deployed-contract-get_policy" },
      schemaVersion: { source: "deployed-contract-get_policy" },
      evaluationPolicyVersion: { source: "deployed-contract-get_policy" },
    },
    timestamp: new Date().toISOString(),
    contract: {
      configured: validAddress,
      address: validAddress ? rawAddress : null,
    },
    rpc: {
      url: rawRpc,
      reachable: rpcReachable,
      latencyMs: rpcLatencyMs,
    },
    deployment_target: "Linux/PM2 or Vercel",
  });
}
