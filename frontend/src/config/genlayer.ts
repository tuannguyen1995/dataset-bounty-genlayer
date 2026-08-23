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

// Helper to retrieve configured contract address from localStorage or fallback
export function getContractAddress(): string {
  return localStorage.getItem('dataset_bounty_contract_address') || DEFAULT_CONTRACT_ADDRESS;
}

export function setContractAddress(address: string): void {
  localStorage.setItem('dataset_bounty_contract_address', address.trim());
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
  
  // Fallback simulator/read-only client
  return createClient({
    chain: studionetChain as any,
    endpoint: STUDIONET_RPC,
  });
}

// Initial mock tasks for standalone UI preview when contract is not yet deployed on Studionet
export const INITIAL_MOCK_TASKS: DatasetTask[] = [
  {
    id: "bounty_python_code_eval_01",
    buyer: "0xbuyer_ai_lab_7f81a2b9",
    contributor: "0xcontributor_dev_3e21a1d4",
    escrow_amount: "1500",
    contributor_stake: "300",
    status: "AWAITING_PAYOUT",
    spec_url: "https://raw.githubusercontent.com/datasets/specs/python_eval.json",
    dataset_url: "https://raw.githubusercontent.com/datasets/samples/python_eval_sample.jsonl",
    required_format: "JSONL format, MIT License, Min 10,000 clean code-docstring pairs",
    blacklist_sources: "scraped_github_issues, leaked_keys, GPL-3.0_code",
    verdict: "APPROVED",
    reason: "100% Schema match. Verified MIT license metadata across all 10,000 function pairs. Zero blacklisted artifacts detected.",
    confidence: "98",
    attempts: "1",
    payout_ready_at: String(Math.floor(Date.now() / 1000) + 72000), // 20 hours remaining
    disputed_at: "0"
  },
  {
    id: "bounty_medical_qa_clinical_02",
    buyer: "0xmedtech_research_12a39b",
    contributor: "0x0000000000000000000000000000000000000000",
    escrow_amount: "3000",
    contributor_stake: "0",
    status: "OPEN",
    spec_url: "https://clinical-ai.org/specs/pubmed_qa_schema.json",
    dataset_url: "",
    required_format: "Parquet/JSONL format, CC-BY-4.0, 50k annotated clinical QA pairs with PubMed references",
    blacklist_sources: "unverified_reddit_comments, darkweb_medical_dumps",
    verdict: "NONE",
    reason: "Awaiting contributor acceptance with 20% stake (600 GEN)",
    confidence: "0",
    attempts: "0",
    payout_ready_at: "0",
    disputed_at: "0"
  },
  {
    id: "bounty_multimodal_vision_03",
    buyer: "0xvision_ai_corp_9981ff",
    contributor: "0xcontributor_vision_8871ab",
    escrow_amount: "2500",
    contributor_stake: "500",
    status: "DISPUTED",
    spec_url: "https://vision-lab.io/spec_v1.json",
    dataset_url: "https://vision-lab.io/submissions/sample_500.jsonl",
    required_format: "JSONL, OpenData Commons, Bounding box annotations with confidence score > 0.9",
    blacklist_sources: "watermarked_shutterstock, copyrighted_getty_images",
    verdict: "APPROVED",
    reason: "[DISPUTED by 0xvision_] Bounding box coordinates appear shifted by 10px on high-resolution samples.",
    confidence: "88",
    attempts: "1",
    payout_ready_at: String(Math.floor(Date.now() / 1000) - 3600),
    disputed_at: String(Math.floor(Date.now() / 1000) - 5000)
  },
  {
    id: "bounty_synthetic_math_reasoning_04",
    buyer: "0xreasoning_lab_554101",
    contributor: "0xspammer_account_001299",
    escrow_amount: "1000",
    contributor_stake: "0",
    status: "CLOSED",
    spec_url: "https://reasoning.ai/specs/math_proofs.json",
    dataset_url: "https://storage.io/garbage_data.jsonl",
    required_format: "JSONL, Apache-2.0, GSM8K format step-by-step chain of thought",
    blacklist_sources: "hallucinated_solutions, repeated_templates",
    verdict: "REFUND",
    reason: "Slashed Contributor Stake: 2 consecutive submissions contained broken JSONL syntax & hallucinated proofs.",
    confidence: "100",
    attempts: "2",
    payout_ready_at: "0",
    disputed_at: "0"
  }
];

// Execute Smart Contract Transaction with Finality Guarantee
export async function executeContractWrite(
  methodName: string,
  args: any[],
  valueInGen: bigint = BigInt(0),
  contractAddress: string = getContractAddress()
): Promise<any> {
  const client = getGenLayerClient();
  
  if (!client || !(window as any).ethereum) {
    throw new Error("MetaMask or EIP-1193 Web3 provider not detected. Please install MetaMask to interact with GenLayer Studionet.");
  }

  // Request account access if needed
  const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error("No connected Web3 wallet found.");
  }

  console.log(`[GenLayer Tx] Invoking ${methodName} on ${contractAddress} with args:`, args, `value: ${valueInGen} GEN`);

  try {
    // 1. Write Contract call
    const txHash = await (client as any).writeContract({
      address: contractAddress,
      functionName: methodName,
      args: args,
      value: valueInGen,
    });

    console.log(`[GenLayer Tx] Transaction submitted. Hash: ${txHash}. Waiting for Studionet finality receipt...`);

    // 2. MUST WAITING FOR RECEIPT FINALITY as required by GenLayer specification
    const receipt = await (client as any).waitForTransactionReceipt({ hash: txHash });
    console.log(`[GenLayer Tx] Finality receipt confirmed:`, receipt);

    return receipt;
  } catch (error: any) {
    console.error(`[GenLayer Tx Error] ${methodName} failed:`, error);
    throw new Error(error?.message || `Transaction failed during ${methodName}`);
  }
}

// Fetch all dataset bounty tasks from contract or return fallback mock
export async function fetchAllTasks(contractAddress: string = getContractAddress()): Promise<DatasetTask[]> {
  try {
    const client = getGenLayerClient();
    const resultJson = await (client as any).readContract({
      address: contractAddress,
      functionName: 'get_all_tasks',
      args: []
    });

    if (typeof resultJson === 'string') {
      const parsed = JSON.parse(resultJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read from contract (falling back to mock state):", e);
  }

  // Check if we have stored state in localStorage from UI actions
  const localSaved = localStorage.getItem('dataset_bounty_tasks');
  if (localSaved) {
    try {
      return JSON.parse(localSaved);
    } catch (_) {}
  }

  return INITIAL_MOCK_TASKS;
}

export function saveLocalTasks(tasks: DatasetTask[]): void {
  localStorage.setItem('dataset_bounty_tasks', JSON.stringify(tasks));
}
