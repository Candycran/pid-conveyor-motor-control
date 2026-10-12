/**
 * MOTOR OVERVIEW
 * Primary SCADA dashboard screen displaying:
 * - 6 Prominent Telemetry Cards: Target RPM, Actual RPM, Measured RPM, PWM %, Current Ia, Load Torque TL
 * - Large Central Time-Series Graph: Actual and Encoder-Measured RPM (optionally Reference RPM)
 * - Smaller secondary chart: PWM Duty Cycle & Load Torque
 * - Industrial SCADA Schematic Illustration of the conveyor system
 * - Neutral empty states when no simulation dataset is loaded
 */

import React, { useMemo } from 'react';
import { TelemetryPoint, SimulationDataset, LoadRecoveryAudit } from '../types/telemetry';
import { StripChart, ChannelSeries } from './StripChart';
import { ConveyorSchematic } from './ConveyorSchematic';
import { PlaybackBar } from './PlaybackBar';
import {
  Gauge,
  Activity,
  Zap,
  Weight,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Play,
  Upload
} from 'lucide-react';

interface ScreenMotorOverviewProps {
  dataset: SimulationDataset | null;
  currentPoint: TelemetryPoint | null;
  playbackTimeS: number;
  durationS: number;
  isPlaying: boolean;
  playbackSpeed: number;
  isLooping: boolean;
  audit: LoadRecoveryAudit | null;
  onTogglePlay: () => void;
  onSeek: (timeS: number) => void;
  onStepFrame: (dir: -1 | 1) => void;
  onSpeedChange: (speed: number) => void;
  onToggleLoop: () => void;
  onOpenImport: () => void;
  onQuickLoadSample: () => void;
}

export const ScreenMotorOverview: React.FC<ScreenMotorOverviewProps> = ({
  dataset,
  currentPoint,
  playbackTimeS,
  durationS,
  isPlaying,
  playbackSpeed,
  isLooping,
  audit,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onSpeedChange,
  onToggleLoop,
  onOpenImport,
  onQuickLoadSample,
}) => {
  const isLoaded = dataset !== null && currentPoint !== null;

  // Values from active point (or undefined if no dataset)
  const targetRpm = isLoaded && (currentPoint.reference_rpm ?? 0) > 0 ? currentPoint.reference_rpm : null;
  const actualRpm = isLoaded ? currentPoint.actual_rpm : null;
  const measuredRpm = isLoaded ? currentPoint.measured_rpm : null;
  const pwmPercent = isLoaded ? currentPoint.pwm_percent : null;
  const currentA = isLoaded ? currentPoint.current_a : null;
  const loadTorqueNm = isLoaded ? currentPoint.load_torque_nm : null;

  // Calculated secondary metrics
  const trackingError = targetRpm !== null && actualRpm !== null ? targetRpm - actualRpm : null;
  const sensorDelta = measuredRpm !== null && actualRpm !== null ? measuredRpm - actualRpm : null;
  const teElectromagnetic = currentA !== null && dataset?.metadata.torqueConstantNmPerA != null ? currentA * dataset.metadata.torqueConstantNmPerA : null;
  const appliedVoltage = pwmPercent !== null && dataset?.metadata.busVoltageV != null ? (pwmPercent / 100) * dataset.metadata.busVoltageV : null;

  // Multi-Channel definition for Central Speed Graph
  const speedChannels: ChannelSeries[] = useMemo(
    () => [
      {
        id: 'ref',
        name: 'Target (Ref)',
        unit: 'RPM',
        color: '#00d2ff', // Electric cyan
        dashed: true,
        strokeWidth: 1.8,
        getValue: p => p.reference_rpm ?? Number.NaN,
      },
      {
        id: 'act',
        name: 'Actual Motor Speed',
        unit: 'RPM',
        color: '#05cd99', // Phosphor emerald
        strokeWidth: 2.2,
        getValue: p => p.actual_rpm,
      },
      {
        id: 'meas',
        name: 'Encoder-Measured',
        unit: 'RPM',
        color: '#f59e0b', // Amber
        strokeWidth: 1.0,
        getValue: p => p.measured_rpm,
      },
    ],
    []
  );

  // Multi-Channel definition for Secondary PWM & Torque Chart
  const secondaryChannels: ChannelSeries[] = useMemo(
    () => [
      {
        id: 'pwm',
        name: 'PWM Duty Cycle',
        unit: '%',
        color: '#00d2ff',
        strokeWidth: 1.8,
        getValue: p => p.pwm_percent,
      },
      {
        id: 'load_torque',
        name: 'Load Torque (TL)',
        unit: 'N·m',
        color: '#f43f5e',
        strokeWidth: 2.0,
        getValue: p => p.load_torque_nm,
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 6 PROMINENT TELEMETRY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CARD 1: TARGET RPM */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Target RPM</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-cyan-400 font-mono-tabular border border-cyan-900/50">
              SETPOINT
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-cyan-400">
              {targetRpm !== null ? (
                <>
                  {targetRpm.toFixed(1)} <span className="text-xs font-normal text-neutral-400">RPM</span>
                </>
              ) : (
                <span className="text-neutral-400">-- RPM</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>MODE:</span>
            <span className="text-neutral-400">
              {isLoaded ? (targetRpm ? 'Closed-Loop Ref' : 'Open-Loop / Unset') : 'No simulation'}
            </span>
          </div>
        </div>

        {/* CARD 2: ACTUAL MOTOR RPM */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between border-emerald-900/30">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Actual Motor RPM</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-400 font-mono-tabular border border-emerald-900/50">
              ω_ROTOR
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-emerald-400">
              {actualRpm !== null ? (
                <>
                  {actualRpm.toFixed(1)} <span className="text-xs font-normal text-neutral-400">RPM</span>
                </>
              ) : (
                <span className="text-neutral-400">-- RPM</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>DEVIATION:</span>
            <span className={trackingError !== null && Math.abs(trackingError) > 10 ? 'text-amber-400' : 'text-neutral-400'}>
              {trackingError !== null ? `${trackingError > 0 ? '+' : ''}${trackingError.toFixed(1)} RPM` : '--'}
            </span>
          </div>
        </div>

        {/* CARD 3: ENCODER-MEASURED RPM */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Encoder-Measured</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-amber-400 font-mono-tabular border border-amber-900/50">
              FEEDBACK
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-amber-300">
              {measuredRpm !== null ? (
                <>
                  {measuredRpm.toFixed(1)} <span className="text-xs font-normal text-neutral-400">RPM</span>
                </>
              ) : (
                <span className="text-neutral-400">-- RPM</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>QUANT NOISE:</span>
            <span className="text-neutral-400">
              {sensorDelta !== null ? `${sensorDelta > 0 ? '+' : ''}${sensorDelta.toFixed(1)} RPM` : '--'}
            </span>
          </div>
        </div>

        {/* CARD 4: PWM DUTY CYCLE */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">PWM Duty Cycle</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-cyan-400 font-mono-tabular border border-cyan-900/50">
              EXCITATION
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-cyan-300">
              {pwmPercent !== null ? (
                <>
                  {pwmPercent.toFixed(1)} <span className="text-xs font-normal text-neutral-400">%</span>
                </>
              ) : (
                <span className="text-neutral-400">-- %</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>SATURATION:</span>
            <span className={pwmPercent !== null && pwmPercent >= 99 ? 'text-rose-400 font-bold' : 'text-neutral-400'}>
              {pwmPercent !== null ? (pwmPercent >= 99 ? '100% RAIL' : 'Linear') : '--'}
            </span>
          </div>
        </div>

        {/* CARD 5: ARMATURE CURRENT */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Armature Current</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-sky-400 font-mono-tabular border border-sky-900/50">
              Ia (AMPS)
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-sky-300">
              {currentA !== null ? (
                <>
                  {currentA.toFixed(2)} <span className="text-xs font-normal text-neutral-400">A</span>
                </>
              ) : (
                <span className="text-neutral-400">-- A</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>RATED LIMIT:</span>
            <span className="text-neutral-400">Not specified</span>
          </div>
        </div>

        {/* CARD 6: APPLIED LOAD TORQUE */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Applied Load Torque</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-rose-400 font-mono-tabular border border-rose-900/50">
              TL (N·m)
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-rose-300">
              {loadTorqueNm !== null ? (
                <>
                  {loadTorqueNm.toFixed(2)} <span className="text-xs font-normal text-neutral-400">N·m</span>
                </>
              ) : (
                <span className="text-neutral-400">-- N·m</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>PAYLOAD STATE:</span>
            <span className={loadTorqueNm !== null && loadTorqueNm > 5.0 ? 'text-amber-400 font-semibold' : 'text-neutral-400'}>
              {loadTorqueNm !== null ? (loadTorqueNm > 5.0 ? 'Step Loaded' : 'Tare Run') : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* LARGE CENTRAL TIME-SERIES SPEED GRAPH */}
      <div className="w-full">
        {dataset ? (
          <StripChart
            title="Motor Speed Response Profile (Target vs Actual vs Measured)"
            subtitle="RPM · Time-Domain Velocity Trajectory"
            data={dataset.data}
            channels={speedChannels}
            playbackTimeS={playbackTimeS}
            onSeekTime={onSeek}
            yMinDefault={0}
            yMaxDefault={Math.max(1400, (targetRpm || 1250) * 1.25)}
            audit={audit}
            showAuditOverlay={true}
            height={260}
          />
        ) : (
          /* Empty state when no simulation is imported */
          <div className="scada-panel rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[260px] border-dashed border-[#1a2742]">
            <Activity className="w-10 h-10 text-neutral-400 mb-3" />
            <div className="text-sm font-bold text-neutral-200 uppercase font-mono-tabular tracking-wide">
              No Simulation Telemetry Loaded
            </div>
            <p className="text-xs text-neutral-400 max-w-md mt-1 mb-4 leading-relaxed">
              Import a MATLAB/Simulink simulation CSV containing <code className="text-cyan-400">time_s</code>, <code className="text-emerald-400">actual_rpm</code>, and <code className="text-amber-400">measured_rpm</code> to populate the central time-series graph.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onQuickLoadSample}
                className="px-3.5 py-1.5 rounded bg-[#13203b] hover:bg-[#1a2c50] text-cyan-400 border border-cyan-800/50 text-xs font-mono-tabular font-semibold transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Load Simulink Benchmark Run</span>
              </button>
              <button
                onClick={onOpenImport}
                className="px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-[#070b14] text-xs font-mono-tabular font-bold transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV File</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MASTER PLAYBACK TIMELINE (If dataset is active) */}
      {dataset && (
        <PlaybackBar
          currentTimeS={playbackTimeS}
          durationS={durationS}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          isLooping={isLooping}
          audit={audit}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onStepFrame={onStepFrame}
          onSpeedChange={onSpeedChange}
          onToggleLoop={onToggleLoop}
        />
      )}

      {/* BOTTOM SPLIT: SECONDARY CHART & CONVEYOR SCHEMATIC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SMALLER SECONDARY CHART: PWM DUTY CYCLE & LOAD TORQUE */}
        <div className="w-full">
          {dataset ? (
            <StripChart
              title="PWM Excitation (%) & Applied Load Torque (N·m)"
              subtitle="Gate Drive vs Disturbance Torque"
              data={dataset.data}
              channels={secondaryChannels}
              playbackTimeS={playbackTimeS}
              onSeekTime={onSeek}
              yMinDefault={0}
              yMaxDefault={105}
              saturationRails={{ upper: 100, lower: 0 }}
              height={220}
            />
          ) : (
            <div className="scada-panel rounded-lg p-6 flex flex-col items-center justify-center text-center h-[260px] border-dashed border-[#1a2742]">
              <Zap className="w-8 h-8 text-neutral-400 mb-2" />
              <div className="text-xs font-bold text-neutral-200 uppercase font-mono-tabular">
                PWM & Load Torque Awaiting Data
              </div>
              <p className="text-[11px] text-neutral-400 max-w-xs mt-1">
                Chart requires duty cycle (%) and load torque (N·m) telemetry channels.
              </p>
            </div>
          )}
        </div>

        {/* INDUSTRIAL SCADA CONVEYOR SCHEMATIC */}
        <div className="w-full">
          <ConveyorSchematic
            point={currentPoint}
            gearRatio={dataset?.metadata.conveyorParams?.gearRatio || 3.5}
            rollerRadiusM={dataset?.metadata.conveyorParams?.rollerRadiusM || 0.075}
            busVoltageV={dataset?.metadata.busVoltageV}
            torqueConstantNmPerA={dataset?.metadata.torqueConstantNmPerA}
            hasKnownConveyorParams={dataset?.metadata.conveyorParams !== undefined}
          />
        </div>
      </div>
    </div>
  );
};
