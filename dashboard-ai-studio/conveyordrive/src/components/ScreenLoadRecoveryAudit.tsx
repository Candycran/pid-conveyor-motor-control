/**
 * LOAD RECOVERY AUDIT
 * The project's distinguishing feature: an industrial diagnostic dashboard showing:
 * - Disturbance events detection (t0, ΔTL)
 * - Maximum RPM deviation (undershoot dip)
 * - Recovery settling times (±1% and ±2% corridors)
 * - Recovery success or failure / compliance classification
 * - Controller saturation warnings (actuator 100% PWM rail limit)
 * - Disturbance-response graph with distinct event markers
 * - Well-organised engineering assessment area
 * - Neutral placeholders when no simulation is loaded
 */

import React, { useState } from 'react';
import { TelemetryPoint, SimulationDataset, LoadRecoveryAudit } from '../types/telemetry';
import { StripChart, ChannelSeries } from './StripChart';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Download,
  Copy,
  Check,
  FileText,
  Activity,
  Zap,
  Clock,
  TrendingDown,
  Info
} from 'lucide-react';

interface ScreenLoadRecoveryAuditProps {
  dataset: SimulationDataset | null;
  audit: LoadRecoveryAudit | null;
  playbackTimeS: number;
  onSeek: (timeS: number) => void;
  onOpenImport: () => void;
}

export const ScreenLoadRecoveryAudit: React.FC<ScreenLoadRecoveryAuditProps> = ({
  dataset,
  audit,
  playbackTimeS,
  onSeek,
  onOpenImport,
}) => {
  const [copied, setCopied] = useState(false);

  // If no dataset loaded
  if (!dataset) {
    return (
      <div className="scada-panel rounded-lg p-10 flex flex-col items-center justify-center text-center min-h-[450px] border-dashed border-[#1a2742] scada-card-glow w-full">
        <ShieldCheck className="w-12 h-12 text-neutral-400 mb-3" />
        <div className="text-sm font-bold text-neutral-200 uppercase font-mono-tabular tracking-wide">
          Load Recovery Audit Suite Inactive
        </div>
        <p className="text-xs text-neutral-400 max-w-md mt-1 mb-5 leading-relaxed">
          No simulation dataset loaded. Import a recorded run containing actual speed and load-torque data to evaluate recovery under a simulated load change.
        </p>
        <button
          onClick={onOpenImport}
          className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-[#070b14] text-xs font-mono-tabular font-bold transition-colors"
        >
          Import Simulation Telemetry CSV
        </button>
      </div>
    );
  }

  // If dataset exists but no step disturbance was found
  if (!audit || !audit.hasDisturbance) {
    return (
      <div className="scada-panel rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[350px] border-[#1a2742] w-full">
        <AlertCircle className="w-10 h-10 text-neutral-400 mb-3" />
        <div className="text-sm font-bold text-neutral-200 uppercase font-mono-tabular tracking-wide">
          No Step Disturbance Detected in Dataset
        </div>
        <p className="text-xs text-neutral-400 max-w-md mt-1 mb-4 leading-relaxed">
          No distinct positive load-torque step was detected. The audit requires a recorded load change and sufficient post-step data.
        </p>
        <button
          onClick={onOpenImport}
          className="px-3.5 py-1.5 rounded bg-[#13203b] hover:bg-[#1a2c50] text-cyan-400 border border-cyan-800/50 text-xs font-mono-tabular font-medium transition-colors"
        >
          Import a Run with a Load Step
        </button>
      </div>
    );
  }

  // Get Industrial Compliance Rating
  const getBadgeStyle = (perfClass: LoadRecoveryAudit['performanceClass']) => {
    switch (perfClass) {
      case 'CLASS_A':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
          title: 'CLASS A — HIGH PERFORMANCE RECOVERY',
          status: 'SUCCESSFUL',
          desc: 'Rapid disturbance rejection: Speed dip &lt; 5% and settled in &lt; 0.45s without actuator rail saturation.',
          icon: ShieldCheck,
          iconColor: 'text-emerald-400',
        };
      case 'CLASS_B':
        return {
          bg: 'bg-blue-950/80 border-blue-500/60 text-blue-300',
          title: 'CLASS B — GOOD EXPERIMENTAL RECOVERY',
          status: 'SUCCESSFUL',
          desc: 'Meets the project’s illustrative evaluation thresholds (not an IEC certification).',
          icon: CheckCircle2,
          iconColor: 'text-blue-400',
        };
      case 'CLASS_C':
        return {
          bg: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
          title: 'CLASS C — SLUGGISH / MARGINAL RECOVERY',
          status: 'CONDITIONAL PASS',
          desc: 'Significant speed drop or slow recovery was observed; review control effort and motor limits.',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      case 'CLASS_D':
      default:
        return {
          bg: 'bg-rose-950/80 border-rose-500/60 text-rose-300',
          title: 'CLASS D — NO VERIFIED RECOVERY',
          status: 'FAILED',
          desc: 'Drive failed to recover within the ±2% speed tolerance band before dataset terminus.',
          icon: AlertCircle,
          iconColor: 'text-rose-400',
        };
    }
  };

  const badge = getBadgeStyle(audit.performanceClass);
  const BadgeIcon = badge.icon;

  // Disturbance Focused Graph Channels
  const disturbanceChannels: ChannelSeries[] = [
    {
      id: 'ref',
      name: 'Target (Ref)',
      unit: 'RPM',
      color: '#00d2ff',
      dashed: true,
      strokeWidth: 1.8,
      getValue: p => p.reference_rpm ?? Number.NaN,
    },
    {
      id: 'act',
      name: 'Actual Motor Speed',
      unit: 'RPM',
      color: '#05cd99',
      strokeWidth: 2.2,
      getValue: p => p.actual_rpm,
    },
    {
      id: 'load_torque',
      name: 'Load Torque (TL)',
      unit: 'N·m',
      color: '#f43f5e',
      strokeWidth: 1.8,
      getValue: p => p.load_torque_nm * 50, // Scaled for dual visibility or strip chart
    },
  ];

  // Disturbance zoom window (0.3s before step to 1.5s after step)
  const disturbanceWindow: [number, number] = [
    Math.max(0, audit.stepTimestamp - 0.3),
    Math.min(dataset.data[dataset.data.length - 1].time_s, (audit.recoveryTimestamp2Pct || audit.stepTimestamp + 1.2) + 0.5),
  ];

  const handleCopyReport = () => {
    const text = `CONVEYORDRIVE — LOAD RECOVERY AUDIT DIAGNOSTIC REPORT
Project: Design & Simulation of PID-Based DC Motor Speed Control System
Dataset: ${dataset.name}
Project-defined Evaluation: ${badge.title} (not an industrial certification)
Result Status: ${badge.status}

1. DISTURBANCE EVENT
- Step Disturbance Time: T = ${audit.stepTimestamp.toFixed(3)} s
- Baseline Load Torque: ${audit.baselineTorqueNm.toFixed(2)} N·m
- Step Load Torque: ${audit.stepTorqueNm.toFixed(2)} N·m
- Torque Step Impact (ΔTL): +${audit.deltaTorqueNm.toFixed(2)} N·m

2. DYNAMIC SPEED RECOVERY
- Pre-Disturbance Speed: ${audit.preDisturbanceRpm.toFixed(1)} RPM
- Maximum Undershoot Dip: -${audit.speedDipRpm.toFixed(1)} RPM (${audit.speedDipPercent.toFixed(1)}%)
- Trough Timestamp: T = ${audit.troughTimestamp.toFixed(3)} s
- Settling Time (±2% Tolerance): ${audit.settlingTime2Pct !== null ? audit.settlingTime2Pct + ' s' : 'Did not settle'}
- Fine Settling Time (±1% Tolerance): ${audit.settlingTime1Pct !== null ? audit.settlingTime1Pct + ' s' : 'Did not settle'}
- Maximum Recovery Slew Rate: ${audit.recoverySlewRateRpmPerSec} RPM/s
- Steady-State Residual Error: ${audit.steadyStateErrorRpm.toFixed(2)} RPM

3. ELECTRICAL & ACTUATOR EFFORT
- Peak Inrush Recovery Current: ${audit.peakRecoveryCurrentA.toFixed(2)} A
- Peak PWM Gate Drive: ${audit.peakRecoveryPwmPercent.toFixed(1)} %
- Actuator Saturation Duration: ${audit.pwmSaturationDurationMs} ms`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            report: 'ConveyorDrive_Load_Recovery_Audit',
            datasetName: dataset.name,
            auditGeneratedAt: new Date().toISOString(),
            auditMetrics: audit,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `load_recovery_audit_${dataset.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* DISTURBANCE EVENT AUDIT HEADER BANNER */}
      <div className="scada-panel rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 scada-card-glow border-l-4 border-l-cyan-500">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded bg-[#0b1324] border border-[#1a2845]">
            <BadgeIcon className={`w-6 h-6 ${badge.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase font-mono-tabular">
                Disturbance Recovery Diagnostic
              </span>
              <span className={`text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                {badge.status} · {badge.title.split('—')[0].trim()}
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5" dangerouslySetInnerHTML={{ __html: badge.desc }} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyReport}
            className="px-3 py-1.5 text-xs rounded bg-[#13203b] hover:bg-[#1a2c50] text-cyan-400 border border-cyan-800/40 font-mono-tabular flex items-center gap-1.5 transition-colors font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Report' : 'Copy Assessment'}</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="px-3 py-1.5 text-xs rounded bg-[#13203b] hover:bg-[#1a2c50] text-neutral-200 border border-[#1e2e4f] font-mono-tabular flex items-center gap-1.5 transition-colors font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* PRIMARY AUDIT METRIC CARDS (6 CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CARD 1: MAXIMUM RPM DEVIATION */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Max RPM Deviation</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-rose-400 font-mono-tabular">
              -ΔRPM
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-rose-400">
              -{audit.speedDipRpm.toFixed(1)} <span className="text-xs font-normal text-neutral-400">RPM</span>
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>PERCENT DROP:</span>
            <span className="text-rose-300 font-bold">{audit.speedDipPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* CARD 2: RECOVERY SETTLING TIME (±2%) */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Recovery Time (±2%)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-emerald-400 font-mono-tabular">
              ts_rec
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-emerald-400">
              {audit.settlingTime2Pct !== null ? (
                <>
                  {audit.settlingTime2Pct} <span className="text-xs font-normal text-neutral-400">s</span>
                </>
              ) : (
                <span className="text-rose-400">FAILED</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>SETTLED AT:</span>
            <span className="text-neutral-300 font-mono-tabular">
              {audit.recoveryTimestamp2Pct ? `T=${audit.recoveryTimestamp2Pct}s` : 'Unsettled'}
            </span>
          </div>
        </div>

        {/* CARD 3: FINE PRECISION RECOVERY (±1%) */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Fine Settling (±1%)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-cyan-400 font-mono-tabular">
              PRECISION
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-cyan-400">
              {audit.settlingTime1Pct !== null ? (
                <>
                  {audit.settlingTime1Pct} <span className="text-xs font-normal text-neutral-400">s</span>
                </>
              ) : (
                <span className="text-neutral-400">-- s</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>BAND:</span>
            <span className="text-neutral-300">±{(audit.preDisturbanceRpm * 0.01).toFixed(1)} RPM</span>
          </div>
        </div>

        {/* CARD 4: PEAK INRUSH RECOVERY CURRENT */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Peak Transient Ia</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-sky-400 font-mono-tabular">
              INRUSH
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-sky-400">
              {audit.peakRecoveryCurrentA.toFixed(1)} <span className="text-xs font-normal text-neutral-400">A</span>
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>MARGIN:</span>
            <span className="text-neutral-400">No rated-current limit supplied</span>
          </div>
        </div>

        {/* CARD 5: CONTROLLER SATURATION WARNING */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">PWM Saturation</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-amber-400 font-mono-tabular">
              WARNING
            </span>
          </div>

          <div className="my-1.5">
            <div className={`text-xl md:text-2xl font-bold font-mono-tabular ${audit.pwmSaturationDurationMs > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {audit.pwmSaturationDurationMs} <span className="text-xs font-normal text-neutral-400">ms</span>
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>PEAK DUTY:</span>
            <span className="text-neutral-300">{audit.peakRecoveryPwmPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* CARD 6: MAX RECOVERY SLEW RATE */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Recovery Slew Rate</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-cyan-400 font-mono-tabular">
              dω/dt
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-cyan-300">
              {audit.recoverySlewRateRpmPerSec.toFixed(0)} <span className="text-xs font-normal text-neutral-400">RPM/s</span>
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>ACCEL:</span>
            <span className="text-neutral-300 font-mono-tabular">Post-trough slope</span>
          </div>
        </div>
      </div>

      {/* DISTURBANCE-RESPONSE GRAPH WITH EVENT MARKERS */}
      <div className="w-full">
        <StripChart
          title="Disturbance-Response Graph with Transient Event Markers"
          subtitle="RPM · Step Disturbance Impact (t0), Undershoot Trough, and ±2% Corridor"
          data={dataset.data}
          channels={[
            {
              id: 'ref',
              name: 'Target Reference',
              unit: 'RPM',
              color: '#00d2ff',
              dashed: true,
              strokeWidth: 1.8,
              getValue: p => p.reference_rpm ?? Number.NaN,
            },
            {
              id: 'act',
              name: 'Actual Motor Speed',
              unit: 'RPM',
              color: '#05cd99',
              strokeWidth: 2.4,
              getValue: p => p.actual_rpm,
            },
            {
              id: 'meas',
              name: 'Encoder Feedback',
              unit: 'RPM',
              color: '#f59e0b',
              strokeWidth: 1.0,
              getValue: p => p.measured_rpm,
            },
          ]}
          playbackTimeS={playbackTimeS}
          onSeekTime={onSeek}
          yMinDefault={Math.max(0, audit.undershootRpm - 100)}
          yMaxDefault={audit.preDisturbanceRpm + 100}
          audit={audit}
          showAuditOverlay={true}
          timeWindow={disturbanceWindow}
          height={260}
        />
      </div>

      {/* WELL-ORGANISED ENGINEERING ASSESSMENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CARD 1: TRANSIENT PHASE EVENT LOG */}
        <div className="scada-panel rounded-lg p-4 scada-card-glow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 border-b border-[#162238] pb-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase font-mono-tabular">
                Chronological Disturbance Phases
              </h4>
            </div>

            <div className="space-y-2 text-xs font-mono-tabular">
              <div className="p-2 rounded bg-[#090e1b] border border-[#141f33] flex items-center justify-between">
                <div>
                  <span className="text-neutral-400 text-[10px] block">1. PRE-STEP STEADY STATE</span>
                  <span className="text-neutral-200">{audit.preDisturbanceRpm.toFixed(1)} RPM</span>
                </div>
                <span className="text-neutral-400 text-[11px]">TL = {(Math.abs(audit.baselineTorqueNm) < 0.1 ? audit.baselineTorqueNm.toFixed(3) : audit.baselineTorqueNm.toFixed(1))} N·m</span>
              </div>

              <div className="p-2 rounded bg-[#090e1b] border border-rose-900/40 flex items-center justify-between">
                <div>
                  <span className="text-rose-400 text-[10px] block">2. LOAD STEP IMPACT (t0)</span>
                  <span className="text-white font-bold">T = {audit.stepTimestamp}s</span>
                </div>
                <span className="text-rose-400 font-bold">+ {(Math.abs(audit.deltaTorqueNm) < 0.1 ? audit.deltaTorqueNm.toFixed(3) : audit.deltaTorqueNm.toFixed(1))} N·m Step</span>
              </div>

              <div className="p-2 rounded bg-[#090e1b] border border-amber-900/40 flex items-center justify-between">
                <div>
                  <span className="text-amber-400 text-[10px] block">3. DYNAMIC TROUGH MINIMUM</span>
                  <span className="text-amber-300 font-bold">{audit.undershootRpm.toFixed(1)} RPM</span>
                </div>
                <span className="text-neutral-400 text-[11px]">At T = {audit.troughTimestamp}s</span>
              </div>

              <div className="p-2 rounded bg-[#090e1b] border border-emerald-900/40 flex items-center justify-between">
                <div>
                  <span className="text-emerald-400 text-[10px] block">4. CORRIDOR SETTLED (±2%)</span>
                  <span className="text-emerald-300 font-bold">
                    {audit.settlingTime2Pct ? `${audit.settlingTime2Pct}s Recovery` : 'Unsettled'}
                  </span>
                </div>
                <span className="text-neutral-400 text-[11px]">T = {audit.recoveryTimestamp2Pct || '--'}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: DIAGNOSTIC AUDIT OBSERVATIONS */}
        <div className="scada-panel rounded-lg p-4 scada-card-glow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 border-b border-[#162238] pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase font-mono-tabular">
                Diagnostic Compliance Observations
              </h4>
            </div>

            <ul className="space-y-2 text-xs text-neutral-300">
              {audit.complianceNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-[#090e1b] p-2 rounded border border-[#141f33]">
                  <span className="text-cyan-400 font-mono-tabular font-bold mt-0.5">▶</span>
                  <span className="leading-tight text-[11px]">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CARD 3: ENGINEERING RECOMMENDATIONS & RE-TUNING */}
        <div className="scada-panel rounded-lg p-4 scada-card-glow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 border-b border-[#162238] pb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase font-mono-tabular">
                Mechatronics Recommendations
              </h4>
            </div>

            <div className="space-y-2 text-xs text-neutral-300 text-[11px]">
              <div className="bg-[#090e1b] p-2.5 rounded border border-[#141f33]">
                <div className="font-semibold text-neutral-200 mb-0.5">Integral Gain (Ki) Evaluation:</div>
                <p className="text-neutral-400 leading-tight">
                  {audit.settlingTime2Pct && audit.settlingTime2Pct < 0.5
                    ? 'Integral reset time is optimal. Integrator eliminates offset quickly without excessive reset windup.'
                    : 'Consider increasing Ki to accelerate recovery slope and reduce the duration of the speed dip.'}
                </p>
              </div>

              <div className="bg-[#090e1b] p-2.5 rounded border border-[#141f33]">
                <div className="font-semibold text-neutral-200 mb-0.5">Anti-Windup Protection:</div>
                <p className="text-neutral-400 leading-tight">
                  {audit.pwmSaturationDurationMs > 0
                    ? `Actuator was railed for ${audit.pwmSaturationDurationMs} ms. Back-calculation anti-windup clamping is essential to avoid delayed unlatching.`
                    : 'Zero rail saturation occurred. Closed-loop operation remained in the linear modulation region throughout the transient.'}
                </p>
              </div>

              <div className="bg-[#090e1b] p-2.5 rounded border border-[#141f33]">
                <div className="font-semibold text-neutral-200 mb-0.5">Feedforward Disturbance Surcharge:</div>
                <p className="text-neutral-400 leading-tight">
                  If load cells or optical parcel sensors precede the drive roller, feedforward torque injection (K_ff · TL) can proactively cancel the dip.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
