import { createClient, chains } from 'genlayer-js';
import { DatasetTask } from '../types/bounty';

export const DEFAULT_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xb6c92cB00D684581CeC4d1517D4eFCE827FFc0be";
export const STUDIONET_RPC = "https://studio.genlayer.com/api";

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

// Helper to retrieve configured contract address
export function getContractAddress(): string {
  if (typeof window === 'undefined') return DEFAULT_CONTRACT_ADDRESS;
  return localStorage.getItem('dataset_bounty_contract_address') || DEFAULT_CONTRACT_ADDRESS;
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

// Execute Smart Contract Write Transaction with Finality Guarantee
export async function executeContractWrite(
  methodName: string,
  args: any[],
  valueInGen: bigint = BigInt(0),
  contractAddress: string = getContractAddress()
): Promise<any> {
  const client = getGenLayerClient();
  
  if (!client || !(window as any).ethereum) {
    throw new Error("MetaMask or EIP-1193 Web3 provider not detected. Please connect MetaMask to interact with GenLayer Studionet.");
  }

  const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error("No connected Web3 account found. Please connect your wallet.");
  }

  console.log(`[GenLayer Tx] Invoking ${methodName} on ${contractAddress} with args:`, args, `value: ${valueInGen} GEN`);

  // Write Contract call
  const txHash = await (client as any).writeContract({
    address: contractAddress,
    functionName: methodName,
    args: args,
    value: valueInGen,
  });

  console.log(`[GenLayer Tx] Transaction submitted. Hash: ${txHash}. Waiting for Studionet finality receipt...`);

  // MUST WAIT FOR RECEIPT FINALITY as required by GenLayer specification
  const receipt = await (client as any).waitForTransactionReceipt({ hash: txHash });
  console.log(`[GenLayer Tx] Finality receipt confirmed:`, receipt);

  return receipt;
}

// Fetch all dataset bounty tasks strictly from contract (100% On-Chain Authoritative State)
export async function fetchAllTasks(contractAddress: string = getContractAddress()): Promise<DatasetTask[]> {
  const client = getGenLayerClient();
  
  try {
    const resultJson = await (client as any).readContract({
      address: contractAddress,
      functionName: 'get_all_tasks',
      args: []
    });

    if (typeof resultJson === 'string') {
      const parsed = JSON.parse(resultJson);
      if (Array.isArray(parsed)) {
        return parsed; // On-chain contract state is authoritative
      }
    } else if (Array.isArray(resultJson)) {
      return resultJson;
    }
    return [];
  } catch (e: any) {
    console.error(`[Contract Read Error] get_all_tasks on ${contractAddress} failed:`, e);
    throw new Error(`Failed to read authoritative contract state from address ${contractAddress}: ${e?.message || 'RPC Read Failed'}`);
  }
}
