/**
 * SimulationConfigModal - First-Principles Physics Simulator
 * Allows engineers to tune PID controller gains, conveyor parameters, and disturbance loads
 * to synthesize client-side physics simulation data.
 */

import React, { useState } from 'react';
import { DEFAULT_MOTOR_CONFIG, MotorSimulationConfig, simulateConveyorMotor } from '../services/physicsEngine';
import { SimulationDataset } from '../types/telemetry';
import { Sliders, Play, RotateCcw, X, Cpu } from 'lucide-react';

interface SimulationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSimulation: (dataset: SimulationDataset) => void;
}

export const SimulationConfigModal: React.FC<SimulationConfigModalProps> = ({
  isOpen,
  onClose,
  onRunSimulation,
}) => {
  const [config, setConfig] = useState<MotorSimulationConfig>({ ...DEFAULT_MOTOR_CONFIG });
  const [simName, setSimName] = useState('Browser Demo — 12 V Motor');

  if (!isOpen) return null;

  const handleReset = () => {
    setConfig({ ...DEFAULT_MOTOR_CONFIG });
  };

  const handleExecute = () => {
    const data = simulateConveyorMotor(config);
    const dataset: SimulationDataset = {
      id: `physics_${Date.now()}`,
      name: simName || 'Synthesized DC Motor Run',
      source: 'physics_engine',
      data,
      metadata: {
        description: `Independent browser example (${config.controlMode === 'open_loop' ? 'open-loop averaged PWM' : 'illustrative PID'}): load changes from ${config.initialLoadTorqueNm} to ${config.stepLoadTorqueNm} N·m. Not a Simulink export.`,
        samplingRateHz: config.outputSampleRateHz,
        durationS: config.durationS,
        busVoltageV: config.vBus,
        torqueConstantNmPerA: config.kt,
        motorModel: '12 V motor parameter-matched browser approximation; NOT MATLAB/Simulink data', 
        ...(config.controlMode === 'pid' ? { controllerGains: {
          Kp: config.kp, Ki: config.ki, Kd: config.kd, N: config.derivativeFilterN,
        }} : {}),
        // Conveyor geometry has not been specified in MATLAB; do not fabricate belt speed.

        disturbanceEvent: {
          timeS: config.loadStepTimeS,
          stepTorqueNm: config.stepLoadTorqueNm,
        },
      },
      createdAt: new Date().toISOString(),
    };

    onRunSimulation(dataset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                In-Browser Physics Simulation Model
              </h3>
              <p className="text-xs text-neutral-400">
                12 V motor parameters from Day 1–3; browser approximation only, not Simulink data.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 flex flex-col gap-4 text-xs font-mono-tabular">
          {/* Run Name */}
          <div>
            <label className="text-neutral-400 block mb-1">Simulation Run Label</label>
            <input
              type="text"
              value={simName}
              onChange={e => setSimName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-1.5 text-neutral-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800 space-y-2">
            <label className="font-bold text-cyan-400 uppercase text-[11px] block">Controller demonstration mode</label>
            <select
              value={config.controlMode}
              onChange={e => setConfig({ ...config, controlMode: e.target.value as 'open_loop' | 'pid' })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-2 text-neutral-100"
            >
              <option value="open_loop">Open-loop averaged PWM (Day 2–3)</option>
              <option value="pid">Illustrative browser PID (not yet tuned in Simulink)</option>
            </select>
            {config.controlMode === 'open_loop' ? (
              <label className="block text-neutral-300">Fixed PWM duty cycle: {config.openLoopDutyPercent.toFixed(2)}%
                <input type="range" min="0" max="100" step="0.1" value={config.openLoopDutyPercent}
                  onChange={e => setConfig({ ...config, openLoopDutyPercent: Number(e.target.value) })}
                  className="w-full mt-1 accent-cyan-500" />
                <span className="text-neutral-400">Average applied voltage: {(config.vBus * config.openLoopDutyPercent / 100).toFixed(2)} V</span>
              </label>
            ) : (
              <p className="text-amber-300 text-[11px]">These PID gains are illustrative and not validated MATLAB controller gains.</p>
            )}
          </div>

          {/* Section 1: PID Controller Gains */}
          {config.controlMode === 'pid' && <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
            <span className="font-bold text-amber-400 uppercase text-[11px] block mb-2.5">
              1. PID Speed Regulator Tuning
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-neutral-400 block mb-1">Proportional (Kp): {config.kp.toFixed(2)}</label>
                <input
                  type="range"
                  min={0.2}
                  max={6.0}
                  step={0.05}
                  value={config.kp}
                  onChange={e => setConfig({ ...config, kp: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Integral (Ki): {config.ki.toFixed(2)}</label>
                <input
                  type="range"
                  min={0.1}
                  max={12.0}
                  step={0.1}
                  value={config.ki}
                  onChange={e => setConfig({ ...config, ki: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Derivative (Kd): {config.kd.toFixed(3)}</label>
                <input
                  type="range"
                  min={0.0}
                  max={0.25}
                  step={0.005}
                  value={config.kd}
                  onChange={e => setConfig({ ...config, kd: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-neutral-800/80">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={config.useFeedforward}
                  onChange={e => setConfig({ ...config, useFeedforward: e.target.checked })}
                  className="rounded accent-amber-500"
                />
                <span>Enable Disturbance / Velocity Feedforward (K_ff)</span>
              </label>
            </div>
          </div>}

          {/* Section 2: Setpoint & Disturbance */}
          <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
            <span className="font-bold text-amber-400 uppercase text-[11px] block mb-2.5">
              2. Operating Setpoint & Conveyor Disturbance
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-neutral-400 block mb-1">{config.controlMode === 'pid' ? 'Illustrative PID Target Speed (RPM)' : 'Open-loop: no target RPM'}</label>
                <input
                  type="number"
                  disabled={config.controlMode === 'open_loop'}
                  value={config.targetRpm}
                  onChange={e => setConfig({ ...config, targetRpm: parseFloat(e.target.value) || 1500 })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-neutral-100"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Step Disturbance (N·m)</label>
                <input
                  type="number"
                  step={0.005}
                  value={config.stepLoadTorqueNm}
                  onChange={e => setConfig({ ...config, stepLoadTorqueNm: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-neutral-100"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Step Time (s)</label>
                <input
                  type="number"
                  step={0.1}
                  value={config.loadStepTimeS}
                  onChange={e => setConfig({ ...config, loadStepTimeS: parseFloat(e.target.value) || 1.0 })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-neutral-100"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Physical System Parameters */}
          <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
            <span className="font-bold text-amber-400 uppercase text-[11px] block mb-2.5">
              3. DC Motor & Conveyor Mechanics
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
              <div>
                <span className="text-neutral-400 block">Bus Voltage (V)</span>
                <span className="text-neutral-200">{config.vBus} V</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Armature Ra</span>
                <span className="text-neutral-200">{config.ra} Ω</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Inductance La</span>
                <span className="text-neutral-200">{(config.la * 1000).toFixed(0)} mH</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Gearbox Ratio</span>
                <span className="text-neutral-300">Not defined in MATLAB yet</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Belt Mass (kg)</span>
                <span className="text-neutral-300">Not modelled yet</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Roller Radius</span>
                <span className="text-neutral-300">Not defined yet</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Duration (s)</span>
                <span className="text-neutral-200">{config.durationS} s</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Sample Rate</span>
                <span className="text-neutral-200">{config.outputSampleRateHz} Hz</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Synthesize & Load</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
