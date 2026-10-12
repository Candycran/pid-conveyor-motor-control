/**
 * EmptyStateConsole - Industrial Telemetry Standby Console
 * Displayed when no simulation dataset has been imported or synthesized.
 */

import React from 'react';
import { Upload, Play, FileText, Database, ShieldAlert, Cpu } from 'lucide-react';
import { REQUIRED_CSV_COLUMNS } from '../services/csvParser';
import { getPresetDatasets } from '../services/physicsEngine';
import { SimulationDataset } from '../types/telemetry';

interface EmptyStateConsoleProps {
  onOpenImportModal: () => void;
  onOpenSimModal: () => void;
  onLoadPreset: (dataset: SimulationDataset) => void;
}

export const EmptyStateConsole: React.FC<EmptyStateConsoleProps> = ({
  onOpenImportModal,
  onOpenSimModal,
  onLoadPreset,
}) => {
  const presets = getPresetDatasets();
  const benchmarkPreset = presets[0];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full select-none">
      {/* Control Room Standby Header */}
      <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl mb-6 text-center relative overflow-hidden">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs font-mono-tabular mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>CONSOLE STATUS: AWAITING SIMULATION TELEMETRY</span>
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-neutral-100 tracking-tight">
          Industrial Conveyor Drive Telemetry Workstation
        </h2>
        <p className="text-xs md:text-sm text-neutral-400 max-w-2xl mx-auto mt-2 leading-relaxed">
          High-resolution transient analysis and disturbance recovery auditing for PID-controlled DC conveyor drive systems.
          Import an external simulation CSV (Simulink / MATLAB) or initialize the continuous physics solver below.
        </p>

        {/* Channel Status Mock Disconnect Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 max-w-3xl mx-auto mt-6 text-xs font-mono-tabular">
          <div className="p-2 rounded bg-neutral-950/80 border border-neutral-800/80 text-left">
            <div className="text-[10px] text-neutral-400">CH 01 : SPEED</div>
            <div className="text-neutral-400 font-medium">NO SIGNAL</div>
          </div>
          <div className="p-2 rounded bg-neutral-950/80 border border-neutral-800/80 text-left">
            <div className="text-[10px] text-neutral-400">CH 02 : PWM DUTY</div>
            <div className="text-neutral-400 font-medium">NO SIGNAL</div>
          </div>
          <div className="p-2 rounded bg-neutral-950/80 border border-neutral-800/80 text-left">
            <div className="text-[10px] text-neutral-400">CH 03 : CURRENT (Ia)</div>
            <div className="text-neutral-400 font-medium">NO SIGNAL</div>
          </div>
          <div className="p-2 rounded bg-neutral-950/80 border border-neutral-800/80 text-left">
            <div className="text-[10px] text-neutral-400">CH 04 : LOAD TORQUE</div>
            <div className="text-neutral-400 font-medium">NO SIGNAL</div>
          </div>
        </div>
      </div>

      {/* 3 Direct Ingestion Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-6">
        {/* Card 1: 1-Click Benchmark */}
        <div
          onClick={() => onLoadPreset(benchmarkPreset)}
          className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/70 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between group shadow-lg"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div className="text-sm font-bold text-neutral-100 group-hover:text-amber-300 transition-colors">
              Load 12 V Open-Loop Browser Demo
            </div>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Load a 12 V browser approximation with the same Day 1–3 motor parameters (not an imported MATLAB/Simulink run).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-xs font-mono-tabular text-amber-400 font-semibold">
            <span>Browser Example Only</span>
            <span>➔</span>
          </div>
        </div>

        {/* Card 2: Custom CSV Upload */}
        <div
          onClick={onOpenImportModal}
          className="bg-neutral-900 border border-neutral-800 hover:border-sky-500/70 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between group shadow-lg"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3 group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-neutral-100 group-hover:text-sky-300 transition-colors">
              Import Custom CSV File
            </div>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Upload your own experimental or simulation log containing speed, PWM, current, and load torque data.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-xs font-mono-tabular text-sky-400 font-semibold">
            <span>Open CSV Parser</span>
            <span>➔</span>
          </div>
        </div>

        {/* Card 3: In-Browser Physics Model */}
        <div
          onClick={onOpenSimModal}
          className="bg-neutral-900 border border-neutral-800 hover:border-emerald-500/70 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between group shadow-lg"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-neutral-100 group-hover:text-emerald-300 transition-colors">
              Run Physics Simulation
            </div>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Explore open-loop averaged PWM or optional illustrative PID using our 12 V motor parameters. Simulink remains the source of validated results.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-xs font-mono-tabular text-emerald-400 font-semibold">
            <span>Open Physics Model</span>
            <span>➔</span>
          </div>
        </div>
      </div>

      {/* CSV Schema Card */}
      <div className="w-full bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
            Expected CSV Telemetry Schema (Comma-Separated)
          </span>
          <span className="text-[11px] text-neutral-400 font-mono-tabular">
            Sampling: 50 Hz to 10 kHz
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 font-mono-tabular text-[11px]">
          {REQUIRED_CSV_COLUMNS.map(col => (
            <div key={col} className="bg-neutral-950 p-2 rounded border border-neutral-800 text-center">
              <span className="text-amber-400 block font-bold">{col}</span>
              <span className="text-[10px] text-neutral-400">
                {col === 'time_s'
                  ? 'Seconds'
                  : col.includes('rpm')
                  ? 'Speed (RPM)'
                  : col.includes('pwm')
                  ? '0–100 %'
                  : col.includes('current')
                  ? 'Amperes'
                  : 'N·m Torque'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
