import React, { useState } from 'react';
import { Database, ShieldCheck, Wallet, Cpu, Settings, ExternalLink, RefreshCw } from 'lucide-react';
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
      <header className="sticky top-0 z-30 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-cyan-glow">
              <Database className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                  Dataset<span className="text-cyan-400">Bounty</span>
                </span>
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                  GenLayer v0.2.18
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono hidden sm:block">
                Decentralized AI Dataset Verification & License Compliance Escrow
              </p>
            </div>
          </div>

          {/* Controls & Actions */}
          <div className="flex items-center space-x-3">
            
            {/* Studionet Indicator */}
            <div className="hidden md:flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-slate-300">Network:</span>
              <span className="text-cyan-400 font-semibold">Studionet</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all disabled:opacity-50"
              title="Refresh Task State from Blockchain"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Contract Config Settings */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-violet-400 hover:border-violet-500/40 transition-all"
              title="Configure GenLayer Contract Address"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Admin Toggle */}
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all flex items-center space-x-1.5 ${
                isAdmin
                  ? 'bg-violet-600/20 text-violet-300 border-violet-500/50 shadow-violet-glow'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Admin Mode: ON' : 'User Mode'}</span>
            </button>

            {/* Connect Wallet */}
            {account ? (
              <div className="flex items-center space-x-2 bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/30 px-3.5 py-1.5 rounded-lg text-xs font-mono text-cyan-300">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black font-semibold text-xs px-4 py-2 rounded-lg shadow-cyan-glow transition-all active:scale-95"
              >
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                <span>Connect Wallet</span>
              </button>
            )}

          </div>

        </div>
      </header>

      {/* Contract Address Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-cyan-400">
                <Settings className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">GenLayer Contract Address</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Enter the deployed <code className="text-cyan-400">DatasetBounty.py</code> Intelligent Contract address on Studionet or local GenLayer simulator.
            </p>

            <form onSubmit={handleSaveContract} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Contract Address</label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg shadow-cyan-glow transition-all"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
