export type BountyStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'AWAITING_PAYOUT'
  | 'NEEDS_REVISION'
  | 'DISPUTED'
  | 'ESCALATED'
  | 'CLOSED';

export type VerdictType = 'NONE' | 'APPROVED' | 'PARTIAL' | 'REFUND' | 'ESCALATE';

export interface DatasetTask {
  id: string;
  buyer: string;
  contributor: string;
  escrow_amount: string;     // stringified bigint in GEN
  contributor_stake: string; // stringified bigint in GEN
  status: BountyStatus;
  spec_url: string;
  dataset_url: string;
  required_format: string;
  blacklist_sources: string;
  verdict: VerdictType;
  reason: string;
  confidence: string;
  attempts: string;
  payout_ready_at: string;  // unix timestamp string
  disputed_at: string;     // unix timestamp string
  // Immutable Manifest Anchoring Fields
  spec_hash: string;              // SHA-256 hash of spec content at creation time
  dataset_hash: string;           // SHA-256 hash of dataset content at submission time
  dataset_record_count: string;   // Number of records verified by AI audit
  dataset_size_bytes: string;     // Content length verified by AI audit
}

export interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  detail?: string;
}
