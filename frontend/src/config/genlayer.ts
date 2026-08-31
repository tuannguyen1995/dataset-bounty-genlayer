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

// 1. ĐỌC DỮ LIỆU ON-CHAIN: NÉM LỖI RÕ RÀNG KHI EMPTY/INVALID, KHÔNG NUỐT LỖI
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

  // Chặn đứng null/undefined: Không được coi là empty state hợp lệ
  if (rawData === undefined || rawData === null) {
    throw new Error(`Contract read returned null/undefined from ${contractAddress}. The contract may not be deployed or RPC is unresponsive.`);
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
      throw new Error(`Contract returned unparseable JSON: ${parseErr.message}. Raw payload: "${rawData.slice(0, 100)}"`);
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Contract payload must be a JSON array, got ${typeof parsed}`);
  }

  return parsed as DatasetTask[];
}

// 2. GHI TRANSACTION: CHẶN ĐỨNG HOÀN TOÀN MỌI UNCONFIRMED/FAILED RECEIPT
export async function executeContractWrite(
  methodName: string,
  args: any[],
  valueInGen: bigint = BigInt(0),
  contractAddress: string = getContractAddress()
): Promise<DatasetTask[]> {
  const client = getGenLayerClient();
  
  if (!client || !(window as any).ethereum) {
    throw new Error("MetaMask or an EIP-1193 compatible browser wallet is required.");
  }

  const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error("No connected Web3 account detected in browser wallet.");
  }

  console.log(`[GenLayer Tx] Invoking ${methodName} on ${contractAddress} with args:`, args, `value: ${valueInGen} GEN`);

  // Step 1: Dispatch write transaction
  let txHash: string;
  try {
    txHash = await (client as any).writeContract({
      address: contractAddress,
      functionName: methodName,
      args: args,
      value: valueInGen,
    });
  } catch (writeErr: any) {
    console.error(`[GenLayer Tx Submission Error] ${methodName} failed to submit:`, writeErr);
    throw new Error(`Transaction rejected by user or failed dispatch: ${writeErr?.message || writeErr}`);
  }

  if (!txHash || typeof txHash !== 'string' || !txHash.startsWith("0x")) {
    throw new Error(`Invalid transaction hash received: "${txHash}". Cannot proceed.`);
  }

  console.log(`[GenLayer Tx] Submitted. Hash: ${txHash}. Waiting for Studionet finality receipt...`);

  // Step 2: Wait for finality & receipt confirmation
  let receipt: any;
  try {
    receipt = await (client as any).waitForTransactionReceipt({ hash: txHash });
  } catch (waitErr: any) {
    console.error(`[GenLayer Tx Receipt Error] ${methodName} receipt wait failed:`, waitErr);
    throw new Error(`Failed while waiting for transaction receipt (${txHash}): ${waitErr?.message || waitErr}`);
  }

  console.log(`[GenLayer Tx] Finality receipt received:`, receipt);

  // Step 3: Hard-gate: MUST fail explicitly if receipt is missing or status != 'success'
  if (!receipt) {
    throw new Error(`Critical: Transaction receipt is missing for hash ${txHash}. Halting success path.`);
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
    throw new Error(`On-chain transaction reverted or failed with status: "${detail}". State will not be updated.`);
  }

  // Step 4: Authoritative re-fetch directly from contract
  return await fetchAllTasks(contractAddress);
}
