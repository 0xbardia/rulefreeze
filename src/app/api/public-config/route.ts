import { NextResponse } from "next/server";
import {
  DEFAULT_STUDIONET_CHAIN_ID,
  DEFAULT_STUDIONET_RPC,
  isValidContractAddress,
} from "@/lib/config";
import { PublicConfigResponse } from "@/lib/types";

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
  const rawChainId =
    process.env.PUBLIC_GENLAYER_CHAIN_ID ||
    process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID ||
    String(DEFAULT_STUDIONET_CHAIN_ID);

  const chainId = Number.parseInt(rawChainId, 10) || DEFAULT_STUDIONET_CHAIN_ID;
  const validAddress = isValidContractAddress(rawAddress) ? rawAddress : null;

  const payload: PublicConfigResponse = {
    contractAddress: validAddress,
    rpcUrl: rawRpc.trim(),
    chainId,
    isConfigured: validAddress !== null,
    isLiveReady: validAddress !== null,
    networkName: "GenLayer Studionet",
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
