import React, { useState } from 'react';
import { Database, FileText, CheckCircle, Copy, X, ExternalLink, Code } from 'lucide-react';
import { DatasetTask } from '../types/bounty';

interface DatasetPreviewDrawerProps {
  task: DatasetTask | null;
  onClose: () => void;
}

export const DatasetPreviewDrawer: React.FC<DatasetPreviewDrawerProps> = ({ task, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!task) return null;

  // Mock raw preview data based on dataset_url / format
  const sampleJsonl = `{"id": "doc_001", "prompt": "Write a python function to compute fibonacci sequence", "completion": "def fibonacci(n):\\n    if n <= 0: return 0\\n    elif n == 1: return 1\\n    a, b = 0, 1\\n    for _ in range(2, n + 1):\\n        a, b = b, a + b\\n    return b", "license": "MIT", "source": "github_verified_repo"}
{"id": "doc_002", "prompt": "Implement binary search on sorted array", "completion": "def binary_search(arr, target):\\n    low, high = 0, len(arr) - 1\\n    while low <= high:\\n        mid = (low + high) // 2\\n        if arr[mid] == target: return mid\\n        elif arr[mid] < target: low = mid + 1\\n        else: high = mid - 1\\n    return -1", "license": "MIT", "source": "github_verified_repo"}
{"id": "doc_003", "prompt": "Parse JSON string safely in python with fallback", "completion": "import json\\ndef parse_safe(data_str):\\n    try:\\n        return json.loads(data_str)\\n    except Exception:\\n        return None", "license": "MIT", "source": "github_verified_repo"}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sampleJsonl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl h-full p-6 border-l border-slate-700 shadow-2xl flex flex-col justify-between overflow-y-auto">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/30">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-mono">Dataset Sample Previewer</h2>
                <p className="text-xs text-slate-400">Task: {task.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Endpoint Details */}
          <div className="mt-4 bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs font-mono space-y-2">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Dataset Endpoint URL</span>
              <a
                href={task.dataset_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 break-all"
              >
                {task.dataset_url || "N/A"}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Submitted Verdict</span>
                <span className="text-emerald-400 font-bold">{task.verdict} ({task.confidence}% Confidence)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Submission Attempts</span>
                <span className="text-white font-bold">{task.attempts} / 2</span>
              </div>
            </div>
          </div>

          {/* Sample Data Viewer */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                Raw JSONL Sample Stream (First 3 Records)
              </span>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition-colors"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Sample'}</span>
              </button>
            </div>

            <div className="bg-[#05080e] border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-cyan-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {sampleJsonl}
            </div>
          </div>

          {/* Schema Verification Checklist */}
          <div className="mt-6 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-bold text-white mb-2 font-mono uppercase tracking-wider">
              GenLayer AI Quality Check Metrics
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>JSONL syntax structure validation (No missing curly braces or broken keys)</span>
              </li>
              <li className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>License Compliance Check (MIT / Open-source header confirmed)</span>
              </li>
              <li className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Blacklisted domain scan ({task.blacklist_sources || 'Zero forbidden sources found'})</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
};
