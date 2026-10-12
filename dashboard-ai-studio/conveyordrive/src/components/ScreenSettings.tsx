/**
 * SETTINGS & SYSTEM SPECIFICATIONS
 * Hardware specifications, simulation model parameters,
 * MATLAB/Simulink export guidance, and schema references.
 */

import React from 'react';
import { Cpu, BookOpen, Download, Settings } from 'lucide-react';
import { generateSampleCsvTemplate } from '../services/csvParser';
import { DEFAULT_MOTOR_CONFIG as motor } from '../services/physicsEngine';

export const ScreenSettings: React.FC = () => {
  const handleDownloadTemplate = () => {
    const template = generateSampleCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conveyordrive_matlab_export_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Title */}
      <div className="scada-panel rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 scada-card-glow">
        <div>
          <h3 className="text-sm font-bold text-white uppercase font-mono-tabular">
            Mechatronics System Model & Settings
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            CURRENT PROJECT MODEL: 12 V MATLAB/Simulink DC motor (Day 1–3 parameters). No physical hardware. Motor parameters are modelling assumptions, not measured equipment specifications.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-[#070b14] text-xs font-mono-tabular font-bold transition-colors flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download MATLAB Export Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DC Motor Electrical Specs */}
        <div className="scada-panel rounded-lg p-4 scada-card-glow space-y-3">
          <div className="flex items-center gap-2 border-b border-[#162238] pb-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase font-mono-tabular">
              1. MATLAB / Simulink DC Motor Parameters (12 V)
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono-tabular">
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">NOMINAL BUS VOLTAGE</span>
              <span className="text-white font-bold">{motor.vBus.toFixed(1)} V DC</span>
            </div>
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">ARMATURE RESISTANCE (Ra)</span>
              <span className="text-white font-bold">{motor.ra} Ω</span>
            </div>
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">ARMATURE INDUCTANCE (La)</span>
              <span className="text-white font-bold">{(motor.la * 1000).toFixed(0)} mH</span>
            </div>
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">TORQUE CONSTANT (Kt)</span>
              <span className="text-white font-bold">{motor.kt} N·m / A</span>
            </div>
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">BACK-EMF CONSTANT (Ke)</span>
              <span className="text-white font-bold">{motor.ke} V / (rad/s)</span>
            </div>
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">LUMPED MOTOR INERTIA (J)</span>
              <span className="text-white font-bold">{motor.jRotor} kg·m²</span>
            </div>
          </div>
        </div>

        {/* Conveyor Kinematics */}
        <div className="scada-panel rounded-lg p-4 scada-card-glow space-y-3">
          <div className="flex items-center gap-2 border-b border-[#162238] pb-2">
            <Settings className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase font-mono-tabular">
              2. Current Conveyor Modelling Status
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono-tabular">
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">SPEED REDUCTION GEARBOX</span>
              <span className="text-amber-300 font-bold">Not specified yet</span>
            </div>
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">DRIVE ROLLER RADIUS</span>
              <span className="text-amber-300 font-bold">Not specified yet</span>
            </div>
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">BELT & PAYLOAD MASS</span>
              <span className="text-amber-300 font-bold">Not specified yet</span>
            </div>
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">VISCOUS FRICTION (B)</span>
              <span className="text-white font-bold">{motor.viscousFrictionB} N·m·s/rad</span>
            </div>
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">COULOMB FRICTION (Tc)</span>
              <span className="text-neutral-300 font-bold">Not in Day 3 model</span>
            </div>
            <div className="bg-[#090e1b] p-2 rounded border border-[#141f33]">
              <span className="text-[10px] text-neutral-400 block">EXTRA CONVEYOR INERTIA</span>
              <span className="text-neutral-300 font-bold">Not modelled separately yet</span>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Our conveyor is currently represented by an external shaft load torque, not a separate gearbox/belt mass model.
            Day 2 test: T_load rises from 0 to 0.03 N·m at 1.0 s. These are planned test inputs, not measured results.
            The browser demo uses the same 12 V motor parameters and an averaged 8 V drive, but MATLAB/Simulink is authoritative.
          </p>
        </div>
      </div>

      {/* MATLAB / Simulink Export Specification Card */}
      <div className="scada-panel rounded-lg p-4 scada-card-glow space-y-3">
        <div className="flex items-center gap-2 border-b border-[#162238] pb-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white uppercase font-mono-tabular">
            3. Example MATLAB / Simulink Export (adapt to your own signal names)
          </h4>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          The signal names below are illustrative placeholders and are not automatically created by Simulink. Our 12 V model uses an 8 V average drive for the 66.67% open-loop PWM test. Export your actual logged signals using the names in your own Simulink workspace. A reference RPM is not required on Day 3.
        </p>

        <pre className="p-3 bg-[#070b14] border border-[#141f33] rounded text-[11px] font-mono-tabular text-cyan-300 overflow-x-auto leading-relaxed">
{`% MATLAB / Simulink CSV Export Helper for ConveyorDrive
time_s = out.tout;
% reference_rpm = out.w_ref.Data; % Optional on Days 1-3
actual_rpm = out.w_act.Data;
measured_rpm = out.w_meas.Data;   % With encoder quantization noise
pwm_percent = out.pwm.Data;       % Clamped between 0 and 100%
current_a = out.ia.Data;          % Armature current in Amps
load_torque_nm = out.TL.Data;     % Conveyor disturbance torque

% Export table
telemetryTable = table(time_s, actual_rpm, measured_rpm, pwm_percent, current_a, load_torque_nm);
writetable(telemetryTable, 'simulink_conveyor_run.csv');`}
        </pre>
      </div>
    </div>
  );
};
