import React, { useState } from 'react';
import { Database, Plus, ShieldCheck, DollarSign, FileText, AlertOctagon, X, Lock } from 'lucide-react';

interface CreateBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    taskId: string;
    escrowAmount: string;
    specUrl: string;
    specHash: string;
    requiredFormat: string;
    blacklistSources: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export const CreateBountyModal: React.FC<CreateBountyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading
}) => {
  const [taskId, setTaskId] = useState(`bounty_${Date.now().toString(36)}`);
  const [escrowAmount, setEscrowAmount] = useState('1000');
  const [specUrl, setSpecUrl] = useState('https://raw.githubusercontent.com/datasets/specs/python_eval.json');
  const [specHash, setSpecHash] = useState('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [requiredFormat, setRequiredFormat] = useState('JSONL, CC-BY-4.0, Min 10,000 verified code-docstring pairs');
  const [blacklistSources, setBlacklistSources] = useState('scraped_copyright_code, leaked_keys, GPL-3.0_code');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      taskId: taskId.trim(),
      escrowAmount: escrowAmount.trim(),
      specUrl: specUrl.trim(),
      specHash: specHash.trim() || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      requiredFormat: requiredFormat.trim(),
      blacklistSources: blacklistSources.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create AI Dataset Bounty</h2>
              <p className="text-xs text-slate-400">Lock escrow funds & anchor immutable manifest hash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs font-mono">
          
          <div className="grid grid-cols-2 gap-4">
            {/* Task ID */}
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Bounty Task Unique ID</label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-lg px-3 py-2 text-white outline-none"
                required
              />
            </div>

            {/* Escrow Reward */}
            <div>
              <label className="block text-cyan-400 mb-1 font-semibold">Escrow Reward (GEN Tokens)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={escrowAmount}
                  onChange={(e) => setEscrowAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-cyan-500/40 focus:border-cyan-400 rounded-lg px-3 py-2 text-cyan-300 font-bold outline-none"
                  required
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-semibold">GEN</span>
              </div>
            </div>
          </div>

          {/* Spec URL */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Dataset Specification HTTP/HTTPS URL</label>
            <input
              type="url"
              value={specUrl}
              onChange={(e) => setSpecUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-lg px-3 py-2 text-white outline-none"
              required
            />
          </div>

          {/* Spec Manifest Hash */}
          <div>
            <label className="block text-emerald-400 mb-1 font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Immutable Spec Manifest SHA-256 Hash
            </label>
            <input
              type="text"
              value={specHash}
              onChange={(e) => setSpecHash(e.target.value)}
              placeholder="e.g. e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              className="w-full bg-slate-900 border border-emerald-500/30 focus:border-emerald-400 rounded-lg px-3 py-2 text-emerald-300 font-mono text-[11px] outline-none"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Cryptographically pins specification content at creation time. GenLayer nodes verify this hash during consensus audit.
            </span>
          </div>

          {/* Required Format & License */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Required Schema, Format & License</label>
            <textarea
              rows={2}
              value={requiredFormat}
              onChange={(e) => setRequiredFormat(e.target.value)}
              placeholder="e.g. JSONL format, CC-BY-4.0, Min 10k cleaned pairs..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-lg px-3 py-2 text-white outline-none resize-none"
              required
            />
          </div>

          {/* Blacklist Sources */}
          <div>
            <label className="block text-rose-400 mb-1 font-semibold">Forbidden Scraped Domains / Contaminated Sources</label>
            <input
              type="text"
              value={blacklistSources}
              onChange={(e) => setBlacklistSources(e.target.value)}
              placeholder="e.g. scraped_copyright_code, leaked_keys..."
              className="w-full bg-slate-900 border border-rose-500/30 focus:border-rose-400 rounded-lg px-3 py-2 text-rose-200 outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Escrow locked & manifest anchored until 24h cooling-off.
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-cyan-glow transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Publishing & Anchoring...' : `Publish Bounty (${escrowAmount} GEN)`}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
