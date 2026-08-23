import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle } from 'lucide-react';
import { DatasetTask } from '../types/bounty';

interface DisputeModalProps {
  task: DatasetTask | null;
  onClose: () => void;
  onSubmitDispute: (taskId: string, reason: string) => Promise<void>;
  isLoading: boolean;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  task,
  onClose,
  onSubmitDispute,
  isLoading
}) => {
  const [reason, setReason] = useState('');

  if (!task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await onSubmitDispute(task.id, reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-rose-500/40 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3 text-rose-400">
            <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-sans">Raise Dataset Dispute</h2>
              <p className="text-xs text-slate-400 font-mono">Freeze 24h cooling-off payout & escalate to arbitration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task summary */}
        <div className="mt-4 bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs font-mono">
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Bounty Task ID:</span>
            <span className="text-cyan-400 font-bold">{task.id}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Escrow Reward:</span>
            <span className="text-white font-bold">{task.escrow_amount} GEN</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Dispute Justification & Technical Evidence
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Sample dataset doc_004 contains duplicated synthetic pairs, bounding box coordinates are misaligned..."
              className="w-full bg-slate-900 border border-rose-500/40 focus:border-rose-400 rounded-xl p-3 text-white outline-none resize-none"
              required
            />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Raising a dispute immediately halts automated payout countdown. Only platform admin or buyer voluntary release can arbitrate fund distribution.
            </span>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Submitting Dispute...' : 'Confirm & Freeze Payout'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
