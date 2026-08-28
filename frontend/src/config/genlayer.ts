import { createClient, chains } from 'genlayer-js';
import { DatasetTask } from '../types/bounty';

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xf219bf040d7bb6291b7E822411A46116C4125e0F";
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

// 1. STRICT READ ON-CHAIN: Empty/invalid contract reads throw explicit errors (Never return fake empty task lists)
export async function fetchAllTasks(contractAddress: string = getContractAddress()): Promise<DatasetTask[]> {
  if (IS_DEV_MOCK) {
    console.warn("[DEV ONLY] Running in explicit mock simulation mode");
  }

  const client = getGenLayerClient();
  
  if (!contractAddress || contractAddress.trim() === '') {
    throw new Error("Target contract address is not configured.");
  }

  let rawData: any;
  try {
    rawData = await (client as any).readContract({
      address: contractAddress,
      functionName: 'get_all_tasks',
      args: []
    });
  } catch (e: any) {
    console.error(`[Contract Read Error] RPC call get_all_tasks on ${contractAddress} failed:`, e);
    throw new Error(`Contract read failed for address ${contractAddress}: ${e?.message || 'RPC Request Failed'}`);
  }

  // Strict Validation: Empty or invalid contract reads must be treated as FAILURES
  if (rawData === null || rawData === undefined) {
    throw new Error(`Contract read returned null or empty response from ${contractAddress}`);
  }

  let parsed: any = rawData;
  if (typeof rawData === 'string') {
    const trimmed = rawData.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      throw new Error(`Contract returned uninitialized empty string state from ${contractAddress}`);
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch (parseErr: any) {
      throw new Error(`Invalid contract response: failed to parse JSON from ${contractAddress}`);
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid contract state structure: expected Task Array from ${contractAddress}, received ${typeof parsed}`);
  }

  // Return strictly validated contract-derived task array
  return parsed;
}

// 2. STRICT WRITE TRANSACTION: Unconfirmed or failed receipts throw explicit errors and block success path
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
    throw new Error("No connected Web3 account found. Please connect your wallet.");
  }

  console.log(`[GenLayer Tx] Invoking ${methodName} on ${contractAddress} with args:`, args, `value: ${valueInGen} GEN`);

  // 1. Submit Write Transaction
  let hash: string;
  try {
    hash = await (client as any).writeContract({
      address: contractAddress,
      functionName: methodName,
      args: args,
      value: valueInGen,
    });
  } catch (writeErr: any) {
    console.error(`[GenLayer Tx Submission Error] ${methodName} failed to submit:`, writeErr);
    throw new Error(`Transaction submission failed: ${writeErr?.message || 'User rejected or RPC error'}`);
  }

  if (!hash || typeof hash !== 'string' || hash.trim() === '') {
    throw new Error(`Web3 provider failed to return a valid transaction hash for ${methodName}.`);
  }

  console.log(`[GenLayer Tx] Submitted. Hash: ${hash}. Waiting for Studionet finality receipt...`);

  // 2. Wait for Receipt Finality
  let receipt: any;
  try {
    receipt = await (client as any).waitForTransactionReceipt({ hash });
  } catch (receiptErr: any) {
    console.error(`[GenLayer Tx Receipt Error] ${methodName} receipt wait failed:`, receiptErr);
    throw new Error(`Transaction finality receipt failed for hash ${hash}: ${receiptErr?.message || 'Receipt Timeout/Unconfirmed'}`);
  }

  console.log(`[GenLayer Tx] Finality receipt received:`, receipt);

  // 3. Strict Failure & Unconfirmed Receipt Guards
  if (!receipt) {
    throw new Error(`Transaction receipt is null or unconfirmed on Studionet for hash ${hash}.`);
  }

  const statusStr = String(receipt.status ?? '').toLowerCase().trim();
  const isConfirmedSuccess = 
    statusStr === 'success' || 
    statusStr === '1' || 
    statusStr === '0x1' || 
    statusStr === 'finalized' || 
    receipt.status === 1 || 
    receipt.status === true;

  if (!isConfirmedSuccess || receipt.reverted === true || receipt.error) {
    const detail = receipt.error || receipt.revertReason || statusStr || 'REVERTED';
    throw new Error(`Transaction failed on-chain with status: ${detail}`);
  }

  // 4. Refetch 100% Authoritative State ONLY AFTER CONFIRMED RECEIPT SUCCESS
  return await fetchAllTasks(contractAddress);
}
