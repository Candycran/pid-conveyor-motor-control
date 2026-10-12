/**
 * DriveDocsView - Conveyor Drive Engineering & Standards Reference
 * Detailed documentation of DC motor equations, conveyor mechanics, and recovery audit criteria.
 */

import React from 'react';
import { BookOpen, ShieldCheck, Cpu, Download } from 'lucide-react';
import { generateSampleCsvTemplate } from '../services/csvParser';

export const DriveDocsView: React.FC = () => {
  const handleDownloadTemplate = () => {
    const template = generateSampleCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conveyordrive_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6 text-neutral-300">
      {/* Title */}
      <div className="border-b border-neutral-800 pb-4">
        <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <span>ConveyorDrive Motor Modelling and Evaluation Notes</span>
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Motor modelling equations and illustrative project-defined disturbance-recovery criteria; no standards certification.
        </p>
      </div>

      {/* Grid of 2 Technical Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Motor & Belt Dynamics */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>1. Continuous Physical Dynamics</span>
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            The conveyor drive is actuated by a permanent magnet DC motor coupled through a speed reduction gearhead to the drive roller.
          </p>

          <div className="bg-neutral-950 p-3 rounded border border-neutral-800 font-mono-tabular text-xs space-y-2">
            <div>
              <span className="text-amber-400 font-semibold block">Armature Circuit:</span>
              <span className="text-neutral-300">L_a · (di_a / dt) = V_a - R_a · i_a - K_e · ω_m</span>
            </div>
            <div>
              <span className="text-amber-400 font-semibold block">Mechanical Torque Balance:</span>
              <span className="text-neutral-300">J_total · (dω_m / dt) = K_t · i_a - T_L(t) - B · ω_m</span>
            </div>
            <div>
              <span className="text-amber-400 font-semibold block">Reflected Conveyor Inertia:</span>
              <span className="text-neutral-300">J_total = J_rotor + (m_belt · r_roller²) / N_gear²</span>
            </div>
          </div>
        </div>

        {/* Card 2: PID Controller & Anti-Windup */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>2. Discrete PID Speed Regulator</span>
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Velocity loop executes in discrete time with conditional anti-windup integration to limit integral windup during heavy package impact.
          </p>

          <div className="bg-neutral-950 p-3 rounded border border-neutral-800 font-mono-tabular text-xs space-y-2">
            <div>
              <span className="text-emerald-400 font-semibold block">Control Law:</span>
              <span className="text-neutral-300">u(t) = K_p · e(t) + K_i · ∫e(τ)dτ + K_d · (de/dt)_filtered</span>
            </div>
            <div>
              <span className="text-emerald-400 font-semibold block">Actuator Saturation:</span>
              <span className="text-neutral-300">PWM = clamp(u(t), 0%, 100%)</span>
            </div>
            <div>
              <span className="text-emerald-400 font-semibold block">Derivative Filter (Pole N):</span>
              <span className="text-neutral-300">D(s) = (K_d · s) / (1 + s / N)</span>
            </div>
          </div>
        </div>
      </div>

      {/* IEC Classification Standards Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-neutral-100 mb-2">
          Project-Defined Experimental Recovery Categories (Not IEC Standards)
        </h3>
        <p className="text-xs text-neutral-400 mb-4">
          Conveyor drives undergo sudden transient load steps when parcels transfer onto the belt. For comparison within this project, recovery is evaluated using indicative speed dip and settling thresholds; the categories are not certified industrial limits:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-tabular text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase">
                <th className="py-2 px-3">Classification Tier</th>
                <th className="py-2 px-3">Speed Dip (ΔRPM %)</th>
                <th className="py-2 px-3">Recovery Settling Time (±2%)</th>
                <th className="py-2 px-3">Actuator Rail Saturation</th>
                <th className="py-2 px-3">Interpretation Only</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-400">Class A: High-Performance</td>
                <td className="py-2.5 px-3">&lt; 5.0% dip</td>
                <td className="py-2.5 px-3">&lt; 0.45 seconds</td>
                <td className="py-2.5 px-3 text-emerald-400">No detected PWM saturation</td>
                <td className="py-2.5 px-3">Strong response for the tested scenario</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-blue-400">Class B: Good Recovery</td>
                <td className="py-2.5 px-3">&lt; 10.0% dip</td>
                <td className="py-2.5 px-3">&lt; 0.90 seconds</td>
                <td className="py-2.5 px-3 text-neutral-400">&lt; Record PWM saturation separately</td>
                <td className="py-2.5 px-3">Good response in this experiment</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-400">Class C: Marginal / Sluggish</td>
                <td className="py-2.5 px-3">&gt; 10.0% dip</td>
                <td className="py-2.5 px-3">&gt; 0.90 seconds</td>
                <td className="py-2.5 px-3 text-amber-400">&gt; 100 ms deep saturation</td>
                <td className="py-2.5 px-3">Bulk aggregate, mining belts (non-critical speed)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-rose-400">Class D: Not Recovered</td>
                <td className="py-2.5 px-3">Excessive</td>
                <td className="py-2.5 px-3">Fails to settle within ±2% band</td>
                <td className="py-2.5 px-3 text-rose-400">Prolonged saturation / windup</td>
                <td className="py-2.5 px-3">Unstable / Inadequate drive motor sizing</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Schema & Template Download */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
            Sample Telemetry Template
          </h4>
          <p className="text-xs text-neutral-400 mt-0.5">
            Download a pre-formatted comma-separated CSV header with canonical units for MATLAB / Simulink exports.
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download CSV Template</span>
        </button>
      </div>
    </div>
  );
};
