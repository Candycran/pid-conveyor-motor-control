/**
 * LoadRecoveryAuditPanel - Industrial Disturbance Rejection & Recovery Audit
 * Thorough analysis of conveyor motor response to sudden payload engagement.
 */

import React, { useState } from 'react';
import { LoadRecoveryAudit } from '../types/telemetry';
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, Download, Copy, Check } from 'lucide-react';

interface LoadRecoveryAuditPanelProps {
  audit: LoadRecoveryAudit | null;
  datasetName: string;
}

export const LoadRecoveryAuditPanel: React.FC<LoadRecoveryAuditPanelProps> = ({ audit, datasetName }) => {
  const [copied, setCopied] = useState(false);

  if (!audit || !audit.hasDisturbance) {
    return (
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-5 flex flex-col items-center justify-center text-center py-10">
        <AlertCircle className="w-8 h-8 text-neutral-500 mb-2" />
        <h4 className="text-sm font-semibold text-neutral-300">No Load Disturbance Detected</h4>
        <p className="text-xs text-neutral-500 max-w-md mt-1">
          A load recovery audit requires a step disturbance in load torque (ΔTL &gt; 1.5 N·m). Current dataset maintains constant load torque.
        </p>
      </div>
    );
  }

  const getBadgeStyle = (perfClass: LoadRecoveryAudit['performanceClass']) => {
    switch (perfClass) {
      case 'CLASS_A':
        return {
          bg: 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300',
          title: 'CLASS A — HIGH PERFORMANCE',
          desc: 'Rapid disturbance rejection with &lt; 5% speed dip and zero actuator saturation.',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
        };
      case 'CLASS_B':
        return {
          bg: 'bg-blue-950/60 border-blue-700/60 text-blue-300',
          title: 'CLASS B — GOOD EXPERIMENTAL RECOVERY',
          desc: 'Meets project-defined illustrative recovery criteria; not a compliance certification.',
          icon: <CheckCircle2 className="w-5 h-5 text-blue-400" />,
        };
      case 'CLASS_C':
        return {
          bg: 'bg-amber-950/60 border-amber-700/60 text-amber-300',
          title: 'CLASS C — SLUGGISH / MARGINAL',
          desc: 'High speed dip or protracted recovery envelope. Tuning adjustment recommended.',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        };
      case 'CLASS_D':
      default:
        return {
          bg: 'bg-rose-950/60 border-rose-700/60 text-rose-300',
          title: 'CLASS D — NO VERIFIED RECOVERY',
          desc: 'Failed to settle within ±2% tolerance band before run completion.',
          icon: <AlertCircle className="w-5 h-5 text-rose-400" />,
        };
    }
  };

  const badge = getBadgeStyle(audit.performanceClass);

  const handleCopySummary = () => {
    const text = `CONVEYORDRIVE LOAD RECOVERY AUDIT REPORT
Dataset: ${datasetName}
Project-defined Evaluation: ${badge.title} (not a safety certification)
Disturbance: Step +${audit.deltaTorqueNm} N·m at T=${audit.stepTimestamp}s
Pre-dist Speed: ${audit.preDisturbanceRpm} RPM
Speed Dip: -${audit.speedDipRpm.toFixed(1)} RPM (${audit.speedDipPercent.toFixed(1)}%)
Trough Time: T=${audit.troughTimestamp}s
Settling Time (±2% band): ${audit.settlingTime2Pct ? audit.settlingTime2Pct + 's' : 'Did not settle'}
Settling Time (±1% band): ${audit.settlingTime1Pct ? audit.settlingTime1Pct + 's' : 'Did not settle'}
Peak Transient Current: ${audit.peakRecoveryCurrentA} A
PWM Saturation Duration: ${audit.pwmSaturationDurationMs} ms
Max Recovery Slew Rate: ${audit.recoverySlewRateRpmPerSec} RPM/s
Steady-State Residual Error: ${audit.steadyStateErrorRpm} RPM`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const reportData = {
      reportType: 'ConveyorDrive_Load_Recovery_Audit',
      dataset: datasetName,
      timestamp: new Date().toISOString(),
      audit,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `load_recovery_audit_${datasetName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-4">
      {/* Top Banner & Grade */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
            {badge.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Load Recovery Audit
              </span>
              <span className="text-neutral-600">·</span>
              <span className={`text-xs font-mono-tabular font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                {badge.title}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5" dangerouslySetInnerHTML={{ __html: badge.desc }} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 text-xs rounded border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 flex items-center gap-1.5 transition-colors font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="px-3 py-1.5 text-xs rounded border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 flex items-center gap-1.5 transition-colors font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (6 Technical Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Speed Dip */}
        <div className="bg-neutral-950/80 p-3 rounded border border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 uppercase font-mono-tabular">Speed Undershoot Dip</div>
          <div className="text-xl font-bold font-mono-tabular text-rose-400 mt-0.5">
            -{audit.speedDipRpm.toFixed(1)} <span className="text-xs font-normal text-neutral-400">RPM</span>
          </div>
          <div className="text-[11px] text-neutral-400 font-mono-tabular mt-1">
            {audit.speedDipPercent.toFixed(1)}% of {audit.preDisturbanceRpm.toFixed(0)} RPM
          </div>
        </div>

        {/* Settling Time (±2%) */}
        <div className="bg-neutral-950/80 p-3 rounded border border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 uppercase font-mono-tabular">Settling Time (±2%)</div>
          <div className="text-xl font-bold font-mono-tabular text-emerald-400 mt-0.5">
            {audit.settlingTime2Pct !== null ? `${audit.settlingTime2Pct}s` : 'UNSETTLED'}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono-tabular mt-1">
            At T={audit.recoveryTimestamp2Pct || '--'}s
          </div>
        </div>

        {/* Settling Time (±1%) */}
        <div className="bg-neutral-950/80 p-3 rounded border border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 uppercase font-mono-tabular">Fine Settling (±1%)</div>
          <div className="text-xl font-bold font-mono-tabular text-cyan-400 mt-0.5">
            {audit.settlingTime1Pct !== null ? `${audit.settlingTime1Pct}s` : 'UNSETTLED'}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono-tabular mt-1">
            Precision tolerance
          </div>
        </div>

        {/* Peak Transient Current */}
        <div className="bg-neutral-950/80 p-3 rounded border border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 uppercase font-mono-tabular">Peak Inrush Current</div>
          <div className="text-xl font-bold font-mono-tabular text-sky-400 mt-0.5">
            {audit.peakRecoveryCurrentA.toFixed(1)} <span className="text-xs font-normal text-neutral-400">A</span>
          </div>
          <div className="text-[11px] text-neutral-400 font-mono-tabular mt-1">
            Recovery surge load
          </div>
        </div>

        {/* PWM Saturation */}
        <div className="bg-neutral-950/80 p-3 rounded border border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 uppercase font-mono-tabular">PWM Rail Saturation</div>
          <div className="text-xl font-bold font-mono-tabular text-amber-400 mt-0.5">
            {audit.pwmSaturationDurationMs} <span className="text-xs font-normal text-neutral-400">ms</span>
          </div>
          <div className="text-[11px] text-neutral-400 font-mono-tabular mt-1">
            Peak PWM: {audit.peakRecoveryPwmPercent.toFixed(1)}%
          </div>
        </div>

        {/* Steady-State Error */}
        <div className="bg-neutral-950/80 p-3 rounded border border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 uppercase font-mono-tabular">Residual Error (ε_ss)</div>
          <div className="text-xl font-bold font-mono-tabular text-neutral-100 mt-0.5">
            {audit.steadyStateErrorRpm.toFixed(2)} <span className="text-xs font-normal text-neutral-400">RPM</span>
          </div>
          <div className="text-[11px] text-neutral-400 font-mono-tabular mt-1">
            Post-transient offset
          </div>
        </div>
      </div>

      {/* Transient Phase Timeline Breakdown */}
      <div className="bg-neutral-950/60 p-3.5 rounded border border-neutral-800/80">
        <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2.5">
          Transient Recovery Phase Sequence
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs font-mono-tabular">
          {/* Phase 1 */}
          <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800">
            <div className="text-[10px] text-neutral-400">1. PRE-DISTURBANCE</div>
            <div className="font-bold text-neutral-200 mt-1">{audit.preDisturbanceRpm.toFixed(1)} RPM</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Load: {(Math.abs(audit.baselineTorqueNm) < 0.1 ? audit.baselineTorqueNm.toFixed(3) : audit.baselineTorqueNm.toFixed(1))} N·m</div>
          </div>

          {/* Phase 2 */}
          <div className="p-2.5 rounded bg-neutral-900 border border-rose-900/40">
            <div className="text-[10px] text-rose-400 font-semibold">2. LOAD STEP EVENT</div>
            <div className="font-bold text-rose-300 mt-1">T = {audit.stepTimestamp}s</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">ΔTL = +{(Math.abs(audit.deltaTorqueNm) < 0.1 ? audit.deltaTorqueNm.toFixed(3) : audit.deltaTorqueNm.toFixed(1))} N·m</div>
          </div>

          {/* Phase 3 */}
          <div className="p-2.5 rounded bg-neutral-900 border border-amber-900/40">
            <div className="text-[10px] text-amber-400 font-semibold">3. SPEED TROUGH</div>
            <div className="font-bold text-amber-300 mt-1">{audit.undershootRpm.toFixed(1)} RPM</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">At T = {audit.troughTimestamp}s</div>
          </div>

          {/* Phase 4 */}
          <div className="p-2.5 rounded bg-neutral-900 border border-cyan-900/40">
            <div className="text-[10px] text-cyan-400 font-semibold">4. SLEW RECOVERY</div>
            <div className="font-bold text-cyan-300 mt-1">{audit.recoverySlewRateRpmPerSec} RPM/s</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Peak Ia: {audit.peakRecoveryCurrentA} A</div>
          </div>

          {/* Phase 5 */}
          <div className="p-2.5 rounded bg-neutral-900 border border-emerald-900/40">
            <div className="text-[10px] text-emerald-400 font-semibold">5. SETTLED (±2%)</div>
            <div className="font-bold text-emerald-300 mt-1">
              {audit.settlingTime2Pct ? `${audit.settlingTime2Pct}s Settled` : 'Unsettled'}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Band: ±{(audit.preDisturbanceRpm * 0.02).toFixed(1)} RPM</div>
          </div>
        </div>
      </div>

      {/* Engineering Compliance Notes */}
      <div className="bg-neutral-950/40 p-3 rounded border border-neutral-800/80">
        <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
          Engineering Audit Findings & Compliance Checklist
        </div>
        <ul className="space-y-1.5 text-xs text-neutral-300">
          {audit.complianceNotes.map((note, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-amber-400 font-mono-tabular">▶</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
