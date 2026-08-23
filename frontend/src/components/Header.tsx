import React, { useState } from 'react';
import { Shield, Wallet, Cpu, Settings, RefreshCw, Layers, Sparkles, Terminal } from 'lucide-react';
import { getContractAddress, setContractAddress } from '../config/genlayer';

interface HeaderProps {
  account: string | null;
  connectWallet: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  account,
  connectWallet,
  onRefresh,
  isLoading,
  isAdmin,
  setIsAdmin
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [addressInput, setAddressInput] = useState(getContractAddress());

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    setContractAddress(addressInput);
    setShowConfigModal(false);
    onRefresh();
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#05070a]/95 backdrop-blur-xl border-b border-obsidian-800/80 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 flex items-center justify-center shadow-emerald-glow">
              <Terminal className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                  Dataset<span className="text-emerald-400">Bounty</span>
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                  v0.2.18
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                GenLayer Autonomous AI Data Audit Protocol
              </p>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center space-x-3">
            
            {/* Studionet Live Status Badge */}
            <div className="hidden lg:flex items-center space-x-2 bg-obsidian-900 border border-obsidian-800 px-3 py-1.5 rounded-xl text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400">Node:</span>
              <span className="text-emerald-400 font-bold">Studionet RPC</span>
            </div>

            {/* Sync State Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-obsidian-900 border border-obsidian-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-all disabled:opacity-50"
              title="Sync Contract State from Blockchain"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Contract Config Settings */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2.5 rounded-xl bg-obsidian-900 border border-obsidian-800 text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition-all"
              title="Contract Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Admin Governance Switcher */}
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all flex items-center space-x-1.5 ${
                isAdmin
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-amber-glow'
                  : 'bg-obsidian-900 text-slate-400 border-obsidian-800 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAdmin ? 'Admin Mode: ACTIVE' : 'User Mode'}</span>
            </button>

            {/* Connect Wallet / Profile */}
            {account ? (
              <div className="flex items-center space-x-2 bg-gradient-to-r from-emerald-950/40 to-obsidian-900 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-mono text-emerald-300">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold">{account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs px-4 py-2 rounded-xl shadow-emerald-glow transition-all active:scale-95"
              >
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                <span>Connect MetaMask</span>
              </button>
            )}

          </div>

        </div>
      </header>

      {/* Contract Address Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="obsidian-panel w-full max-w-md p-6 rounded-3xl border border-obsidian-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Settings className="w-5 h-5" />
                <h3 className="text-base font-bold text-white font-mono">Contract Target Config</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-mono">
              Target GenLayer v0.2.18 <code className="text-emerald-400 font-bold">DatasetBounty.py</code> deployment address:
            </p>

            <form onSubmit={handleSaveContract} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Contract Address</label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-obsidian-900 border border-obsidian-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl shadow-emerald-glow transition-all"
                >
                  Save Contract Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
