/**
 * SPEED RESPONSE AND CONTROLLER ANALYSIS
 * Features:
 * - Large detailed speed-response graph with tolerance corridors
 * - Simulation playback timeline
 * - Controller-mode display for Open Loop, P, PI, and PID
 * - Performance measurement panels: steady-state error, overshoot, settling time, speed deviation
 * - Clearly designed comparison table for simulation runs
 * - Clean neutral placeholders when data or metrics are unavailable
 */

import React, { useState, useMemo } from 'react';
import { TelemetryPoint, SimulationDataset, LoadRecoveryAudit, ControllerMetrics } from '../types/telemetry';
import { StripChart, ChannelSeries } from './StripChart';
import { PlaybackBar } from './PlaybackBar';
import { calculateControllerMetrics } from '../services/comparisonEngine';
import {
  Activity,
  Sliders,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  TrendingUp,
  Percent,
  Cpu
} from 'lucide-react';

interface ScreenSpeedResponseProps {
  dataset: SimulationDataset | null;
  datasets: SimulationDataset[];
  comparisonDatasetId: string | null;
  onSelectComparisonId: (id: string | null) => void;
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
  onOpenSimModal: () => void;
}

export type ControllerMode = 'OPEN_LOOP' | 'P' | 'PI' | 'PID';

export const ScreenSpeedResponse: React.FC<ScreenSpeedResponseProps> = ({
  dataset,
  datasets,
  comparisonDatasetId,
  onSelectComparisonId,
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
  onOpenSimModal,
}) => {
  const isLoaded = dataset !== null && dataset.data.length > 0;

  // Active controller gains (if provided in metadata)
  const gains = dataset?.metadata.controllerGains;

  // Determine active controller architecture
  const activeControllerMode: ControllerMode = useMemo(() => {
    if (!gains) return 'OPEN_LOOP';
    if (gains.Kp > 0 && gains.Ki > 0 && (gains.Kd || 0) > 0) return 'PID';
    if (gains.Kp > 0 && gains.Ki > 0) return 'PI';
    if (gains.Kp > 0) return 'P';
    return 'OPEN_LOOP';
  }, [gains]);

  // Selected mode filter tab for UI demonstration
  const [selectedModeFilter, setSelectedModeFilter] = useState<ControllerMode>(activeControllerMode);

  // Controller Metrics
  const metrics = useMemo<ControllerMetrics | null>(() => {
    if (!dataset || dataset.data.length === 0) return null;
    return calculateControllerMetrics(dataset.data);
  }, [dataset]);

  // Comparison dataset
  const comparisonDataset = useMemo(() => {
    return datasets.find(d => d.id === comparisonDatasetId) || null;
  }, [datasets, comparisonDatasetId]);

  // Multi-Channel definition for Large Speed Response Graph
  const speedChannels: ChannelSeries[] = useMemo(
    () => [
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
        id: 'meas',
        name: 'Encoder Sensor',
        unit: 'RPM',
        color: '#f59e0b',
        strokeWidth: 1.0,
        getValue: p => p.measured_rpm,
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* TOP CONTROLLER-MODE DISPLAY & GAIN HUD */}
      <div className="scada-panel rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 scada-card-glow">
        {/* Left: Mode Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-xs font-bold text-white uppercase font-mono-tabular">
                Controller Architecture
              </div>
              <div className="text-[10px] text-neutral-400 font-mono-tabular">
                Discrete Speed Loop Regulators
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#090e1b] p-1 rounded-lg border border-[#162238] font-mono-tabular text-xs">
            {(['OPEN_LOOP', 'P', 'PI', 'PID'] as ControllerMode[]).map(mode => {
              const isCurrent = activeControllerMode === mode;
              const isSelected = selectedModeFilter === mode;

              return (
                <button
                  key={mode}
                  onClick={() => setSelectedModeFilter(mode)}
                  className={`px-2.5 py-1 rounded text-[11px] transition-all font-medium ${
                    isSelected
                      ? 'bg-cyan-500 text-[#070b14] font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>{mode === 'OPEN_LOOP' ? 'Open Loop' : mode}</span>
                  {isCurrent && (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block align-middle" title="Active dataset architecture" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Controller Gains Display */}
        <div className="flex items-center gap-4 text-xs font-mono-tabular">
          <div className="flex items-center gap-3 bg-[#090e1b] px-3 py-1.5 rounded border border-[#162238]">
            <div>
              <span className="text-[10px] text-neutral-400">Kp:</span>{' '}
              <span className="text-cyan-400 font-bold">{gains?.Kp !== undefined ? gains.Kp.toFixed(2) : '--'}</span>
            </div>
            <span className="text-neutral-700">·</span>
            <div>
              <span className="text-[10px] text-neutral-400">Ki:</span>{' '}
              <span className="text-emerald-400 font-bold">{gains?.Ki !== undefined ? gains.Ki.toFixed(2) : '--'}</span>
            </div>
            <span className="text-neutral-700">·</span>
            <div>
              <span className="text-[10px] text-neutral-400">Kd:</span>{' '}
              <span className="text-amber-400 font-bold">{gains?.Kd !== undefined ? gains.Kd.toFixed(3) : '--'}</span>
            </div>
            <span className="text-neutral-700">·</span>
            <div>
              <span className="text-[10px] text-neutral-400">Filter N:</span>{' '}
              <span className="text-neutral-300 font-bold">{gains?.N !== undefined ? gains.N : '--'}</span>
            </div>
          </div>

          <button
            onClick={onOpenSimModal}
            className="px-3 py-1.5 rounded bg-[#13203b] hover:bg-[#1a2c50] text-cyan-400 border border-cyan-800/40 text-xs font-mono-tabular flex items-center gap-1.5 transition-colors font-medium"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tune Model</span>
          </button>
        </div>
      </div>

      {/* PERFORMANCE MEASUREMENT PANELS (4 REQUIRED METRICS + 2 SECONDARY) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* PANEL 1: STEADY-STATE ERROR */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Steady-State Error</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-cyan-400 font-mono-tabular">
              ε_ss
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-white">
              {metrics && metrics.steadyStateErrorRpm !== null ? (
                <>
                  {metrics.steadyStateErrorRpm.toFixed(2)} <span className="text-xs font-normal text-neutral-400">RPM</span>
                </>
              ) : (
                <span className="text-neutral-400">-- RPM</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>RESIDUAL:</span>
            <span className={metrics && metrics.steadyStateErrorRpm !== null && metrics.steadyStateErrorRpm < 1.0 ? 'text-emerald-400' : 'text-neutral-400'}>
              {metrics && metrics.steadyStateErrorRpm !== null ? (metrics.steadyStateErrorRpm < 0.5 ? 'Low Offset' : 'Residual Error') : 'No reference'}
            </span>
          </div>
        </div>

        {/* PANEL 2: PEAK OVERSHOOT */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Peak Overshoot</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-amber-400 font-mono-tabular">
              Mp (%)
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-amber-400">
              {metrics && metrics.peakOvershootPercent !== null ? (
                <>
                  {metrics.peakOvershootPercent.toFixed(1)} <span className="text-xs font-normal text-neutral-400">%</span>
                </>
              ) : (
                <span className="text-neutral-400">-- %</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>DAMPING:</span>
            <span className={metrics && metrics.peakOvershootPercent !== null && metrics.peakOvershootPercent < 5.0 ? 'text-emerald-400' : 'text-amber-400'}>
              {metrics && metrics.peakOvershootPercent !== null ? (metrics.peakOvershootPercent < 5.0 ? 'Low Overshoot' : 'Overshoot Detected') : 'No reference'}
            </span>
          </div>
        </div>

        {/* PANEL 3: SETTLING TIME */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Settling Time (±2%)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-emerald-400 font-mono-tabular">
              ts (s)
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-emerald-400">
              {metrics && metrics.recoveryTime2PctS !== null ? (
                <>
                  {metrics.recoveryTime2PctS.toFixed(2)} <span className="text-xs font-normal text-neutral-400">s</span>
                </>
              ) : (
                <span className="text-neutral-400">-- s</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>TOLERANCE:</span>
            <span className="text-neutral-400">
              {metrics && metrics.recoveryTime2PctS !== null ? '±2% Corridor' : 'Awaiting data'}
            </span>
          </div>
        </div>

        {/* PANEL 4: SPEED DEVIATION / LOAD DIP */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Speed Deviation (Dip)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-rose-400 font-mono-tabular">
              -ΔRPM
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-rose-400">
              {metrics && metrics.speedDipRpm !== null ? (
                <>
                  -{metrics.speedDipRpm.toFixed(1)} <span className="text-xs font-normal text-neutral-400">RPM</span>
                </>
              ) : (
                <span className="text-neutral-400">-- RPM</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>DYNAMIC DIP:</span>
            <span className="text-neutral-400">
              {metrics && metrics.speedDipRpm !== null ? 'Disturbance Drop' : 'No step loaded'}
            </span>
          </div>
        </div>

        {/* PANEL 5: RISE TIME */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Rise Time (10%→90%)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-cyan-400 font-mono-tabular">
              tr (s)
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-cyan-300">
              {metrics && metrics.riseTimeS !== null ? (
                <>
                  {metrics.riseTimeS.toFixed(3)} <span className="text-xs font-normal text-neutral-400">s</span>
                </>
              ) : (
                <span className="text-neutral-400">-- s</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>BANDWIDTH:</span>
            <span className="text-neutral-400">
              {metrics && metrics.riseTimeS !== null ? 'Initial Ramp' : 'Awaiting data'}
            </span>
          </div>
        </div>

        {/* PANEL 6: INTEGRAL ABSOLUTE ERROR (IAE) */}
        <div className="scada-panel rounded-lg p-3 scada-card-glow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">Cumulative Error</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091122] text-neutral-300 font-mono-tabular">
              IAE
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono-tabular text-neutral-200">
              {metrics && metrics.iae !== null ? (
                metrics.iae.toFixed(1)
              ) : (
                <span className="text-neutral-400">--</span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono-tabular pt-1 border-t border-[#162238] flex items-center justify-between">
            <span>CRITERION:</span>
            <span className="text-neutral-400">∫|e(t)|dt</span>
          </div>
        </div>
      </div>

      {/* LARGE DETAILED SPEED-RESPONSE GRAPH */}
      <div className="w-full">
        {dataset ? (
          <StripChart
            title="Detailed Speed Response & Controller Trajectory"
            subtitle="RPM · Transient Response vs Setpoint with Tolerance Corridor"
            data={dataset.data}
            comparisonData={comparisonDataset?.data}
            comparisonLabel={comparisonDataset?.name}
            channels={speedChannels}
            playbackTimeS={playbackTimeS}
            onSeekTime={onSeek}
            yMinDefault={0}
            yMaxDefault={Math.max(1400, (dataset.data[0]?.reference_rpm || 1250) * 1.25)}
            audit={audit}
            showAuditOverlay={true}
            height={280}
          />
        ) : (
          <div className="scada-panel rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[280px] border-dashed border-[#1a2742]">
            <Activity className="w-10 h-10 text-neutral-400 mb-3" />
            <div className="text-sm font-bold text-neutral-200 uppercase font-mono-tabular tracking-wide">
              Detailed Speed-Response Graph Awaiting Telemetry
            </div>
            <p className="text-xs text-neutral-400 max-w-md mt-1 mb-4 leading-relaxed">
              No simulation run loaded. Import an exported MATLAB/Simulink CSV file to inspect the velocity transient curve, overshoot, and settling corridors.
            </p>
            <button
              onClick={onOpenSimModal}
              className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-[#070b14] text-xs font-mono-tabular font-bold transition-colors flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure & Run In-Browser Physics Model</span>
            </button>
          </div>
        )}
      </div>

      {/* SIMULATION PLAYBACK TIMELINE (If dataset is active) */}
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

      {/* CLEARLY DESIGNED COMPARISON TABLE FOR SIMULATION RUNS */}
      <div className="scada-panel rounded-lg p-4 scada-card-glow">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#162238] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase font-mono-tabular">
                Simulation Runs Comparison Table
              </h3>
              <p className="text-[10px] text-neutral-400">
                Side-by-side benchmark of imported simulation datasets and controller tunings.
              </p>
            </div>
          </div>

          {datasets.length > 1 && (
            <div className="flex items-center gap-2 text-xs font-mono-tabular">
              <span className="text-neutral-400 text-[11px]">Compare Overlay:</span>
              <select
                value={comparisonDatasetId || ''}
                onChange={e => onSelectComparisonId(e.target.value ? e.target.value : null)}
                className="bg-[#090e1b] border border-[#162238] text-neutral-200 text-xs rounded px-2.5 py-1 font-mono-tabular focus:outline-none"
              >
                <option value="">-- None (No Overlay) --</option>
                {datasets
                  .filter(d => d.id !== dataset?.id)
                  .map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {datasets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono-tabular text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1a2845] text-neutral-400 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Simulation Run Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Gains (Kp / Ki / Kd)</th>
                  <th className="py-2.5 px-3">Rise Time (tr)</th>
                  <th className="py-2.5 px-3">Overshoot (Mp)</th>
                  <th className="py-2.5 px-3">Settling (ts)</th>
                  <th className="py-2.5 px-3">Speed Dip</th>
                  <th className="py-2.5 px-3">IAE</th>
                  <th className="py-2.5 px-3">Peak Current</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#142038] text-neutral-300">
                {datasets.map(d => {
                  const m = calculateControllerMetrics(d.data);
                  const isCurrent = d.id === dataset?.id;
                  const isComp = d.id === comparisonDatasetId;

                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-[#0c1424] transition-colors ${
                        isCurrent ? 'bg-[#0f1b33]/60' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                        {isCurrent && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400" title="Active Run" />
                        )}
                        {isComp && (
                          <span className="w-2 h-2 rounded-full bg-amber-400" title="Comparison Overlay" />
                        )}
                        <span>{d.name}</span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-[#091122] text-cyan-400 text-[10px] border border-cyan-900/50">
                          {d.source === 'csv_upload' ? 'CSV Import' : 'Browser Demo'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-neutral-300">
                        {d.metadata.controllerGains ? (
                          `${d.metadata.controllerGains.Kp} / ${d.metadata.controllerGains.Ki} / ${d.metadata.controllerGains.Kd}`
                        ) : (
                          '--'
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-cyan-300">
                        {m.riseTimeS !== null ? `${m.riseTimeS}s` : '--'}
                      </td>

                      <td className="py-2.5 px-3 text-amber-300">
                        {m.peakOvershootPercent !== null ? `${m.peakOvershootPercent.toFixed(1)}%` : '--'}
                      </td>

                      <td className="py-2.5 px-3 text-emerald-300">
                        {m.recoveryTime2PctS !== null ? `${m.recoveryTime2PctS}s` : 'Unsettled'}
                      </td>

                      <td className="py-2.5 px-3 text-rose-300">
                        {m.speedDipRpm !== null ? `-${m.speedDipRpm} RPM` : '--'}
                      </td>

                      <td className="py-2.5 px-3 text-neutral-200">
                        {m.iae !== null ? m.iae.toFixed(1) : '--'}
                      </td>

                      <td className="py-2.5 px-3 text-sky-300">
                        {m.peakCurrentA.toFixed(1)} A
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {!isCurrent && (
                          <button
                            onClick={() => onSelectComparisonId(isComp ? null : d.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular transition-colors ${
                              isComp
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-[#13203b] text-neutral-300 hover:text-white border border-[#1b2b4d]'
                            }`}
                          >
                            {isComp ? 'Remove Overlay' : 'Set Overlay'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-400 text-xs font-mono-tabular">
            No simulation runs currently loaded in memory.
          </div>
        )}
      </div>
    </div>
  );
};
