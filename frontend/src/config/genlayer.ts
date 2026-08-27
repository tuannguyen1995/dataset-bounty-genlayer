import { createClient, chains } from 'genlayer-js';
import { DatasetTask } from '../types/bounty';

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xb6c92cB00D684581CeC4d1517D4eFCE827FFc0be";
export const STUDIONET_RPC = import.meta.env.VITE_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
export const IS_DEV_MOCK = import.meta.env.VITE_ENABLE_DEV_MOCK === "true";

export const studionetChain = chains?.studionet || {
  id: 61998,
  name: 'Studionet',
  rpcUrls: {
    default: {
      http: [STUDIONET_RPC]
    }
  },
  nativeCurrency: {
    name: 'GenLayer GEN',
    symbol: 'GEN',
    decimals: 18
  }
};

export function getContractAddress(): string {
  if (typeof window === 'undefined') return CONTRACT_ADDRESS;
  return localStorage.getItem('dataset_bounty_contract_address') || CONTRACT_ADDRESS;
}

export function setContractAddress(address: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dataset_bounty_contract_address', address.trim());
  }
}

// Initialize GenLayer Web3 Client with EIP-1193 window.ethereum provider
export function getGenLayerClient() {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      return createClient({
        chain: studionetChain as any,
        provider: (window as any).ethereum,
      });
    } catch (e) {
      console.warn("Failed to initialize genlayer-js custom transport:", e);
    }
  }
  
  // Read-only client for fetching contract state from Studionet RPC
  return createClient({
    chain: studionetChain as any,
    endpoint: STUDIONET_RPC,
  });
}

// 1. READ ON-CHAIN: Strictly fetch from contract (No fallback to mock when IS_DEV_MOCK is false)
export async function fetchAllTasks(contractAddress: string = getContractAddress()): Promise<DatasetTask[]> {
  if (IS_DEV_MOCK) {
    console.warn("[DEV ONLY] Running in explicit mock simulation mode");
  }

  const client = getGenLayerClient();
  
  try {
    const rawData = await (client as any).readContract({
      address: contractAddress,
      functionName: 'get_all_tasks',
      args: []
    });

    if (!rawData) {
      return [];
    }

    if (typeof rawData === 'string') {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } else if (Array.isArray(rawData)) {
      return rawData;
    }

    return [];
  } catch (e: any) {
    console.error(`[Contract Read Error] get_all_tasks on ${contractAddress} failed:`, e);
    throw new Error(`Failed to read authoritative contract state: ${e?.message || 'RPC Read Failed'}`);
  }
}

// 2. WRITE TRANSACTION: Must have finalized receipt before returning updated on-chain tasks
export async function executeContractWrite(
  methodName: string,
  args: any[],
  valueInGen: bigint = BigInt(0),
  contractAddress: string = getContractAddress()
): Promise<DatasetTask[]> {
  const client = getGenLayerClient();
  
  if (!client || !(window as any).ethereum) {
    throw new Error("MetaMask is required to interact with GenLayer Studionet.");
  }

  const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error("No connected Web3 account found.");
  }

  console.log(`[GenLayer Tx] Invoking ${methodName} on ${contractAddress} with args:`, args, `value: ${valueInGen} GEN`);

  // Send Write Tx
  const hash = await (client as any).writeContract({
    address: contractAddress,
    functionName: methodName,
    args: args,
    value: valueInGen,
  });

  console.log(`[GenLayer Tx] Submitted. Hash: ${hash}. Waiting for Studionet finality receipt...`);

  // Wait for receipt confirmation from Studionet
  const receipt = await (client as any).waitForTransactionReceipt({ hash });
  console.log(`[GenLayer Tx] Finality receipt confirmed:`, receipt);

  if (receipt && receipt.status && receipt.status !== 'success' && receipt.status !== 1) {
    throw new Error(`Transaction failed on-chain with status: ${receipt?.status || 'REVERTED'}`);
  }

  // Refetch 100% authoritative state directly from contract to update UI
  return await fetchAllTasks(contractAddress);
}
