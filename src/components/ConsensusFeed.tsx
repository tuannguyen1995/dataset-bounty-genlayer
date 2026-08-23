import React, { useState, useEffect } from 'react';
import { Cpu, ShieldCheck, Globe, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { VerificationStep } from '../types/bounty';

interface ConsensusFeedProps {
  isEvaluating: boolean;
  onComplete?: () => void;
}

export const ConsensusFeed: React.FC<ConsensusFeedProps> = ({ isEvaluating }) => {
  const [steps, setSteps] = useState<VerificationStep[]>([
    {
      id: "step_1",
      title: "1. Anti-Rugpull Guard (gl.nondet.web.render)",
      description: "Fetching and rendering Buyer Dataset Spec URL in text mode...",
      status: "pending"
    },
    {
      id: "step_2",
      title: "2. Anti-Spam Guard (gl.nondet.web.render)",
      description: "Inspecting submitted dataset sample endpoint & structural integrity...",
      status: "pending"
    },
    {
      id: "step_3",
      title: "3. Non-Deterministic LLM Audit (gl.nondet.exec_prompt)",
      description: "Evaluating schema, License compliance & blacklisted source contamination...",
      status: "pending"
    },
    {
      id: "step_4",
      title: "4. Leader-Validator Consensus (gl.vm.run_nondet)",
      description: "Comparing settlement-affecting verdicts across validator nodes (>= 65% confidence guard)...",
      status: "pending"
    }
  ]);

  useEffect(() => {
    if (!isEvaluating) return;

    // Reset steps
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));

    // Step 1
    const t1 = setTimeout(() => {
      setSteps(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: 'running' } : s));
    }, 300);

    const t2 = setTimeout(() => {
      setSteps(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: 'completed', detail: '200 OK (Spec format valid)' } : s));
      setSteps(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: 'running' } : s));
    }, 1500);

    // Step 2
    const t3 = setTimeout(() => {
      setSteps(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: 'completed', detail: '200 OK (Sample reachable & non-empty)' } : s));
      setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'running' } : s));
    }, 3000);

    // Step 3
    const t4 = setTimeout(() => {
      setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'completed', detail: 'Verdict: APPROVED (Confidence: 98%)' } : s));
      setSteps(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'running' } : s));
    }, 4800);

    // Step 4
    const t5 = setTimeout(() => {
      setSteps(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'completed', detail: 'Consensus Reached! Transitioning to AWAITING_PAYOUT' } : s));
    }, 6200);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5);
    };
  }, [isEvaluating]);

  if (!isEvaluating) return null;

  return (
    <div className="bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-5 mb-6 shadow-cyan-glow animate-fadeIn font-mono">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-cyan-400">
          <Cpu className="w-5 h-5 animate-pulse" />
          <h3 className="text-sm font-bold tracking-wide">
            GenLayer Leader-Validator AI Consensus Pipeline
          </h3>
        </div>
        <span className="text-[11px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Processing Studionet Block
        </span>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-3 rounded-xl border transition-all text-xs ${
              step.status === 'completed'
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : step.status === 'running'
                ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-100 shadow-cyan-glow'
                : 'bg-slate-900/40 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">{step.title}</span>
              {step.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {step.status === 'running' && <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />}
              {step.status === 'pending' && <span className="text-[10px] text-slate-400">Pending</span>}
            </div>
            <p className="mt-1 text-[11px] opacity-90">{step.description}</p>
            {step.detail && (
              <div className="mt-1.5 text-[10px] text-cyan-300 font-bold bg-black/40 px-2 py-0.5 rounded inline-block">
                ↳ {step.detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
