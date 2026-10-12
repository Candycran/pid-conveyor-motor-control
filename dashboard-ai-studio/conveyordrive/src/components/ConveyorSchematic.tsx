/**
 * ConveyorSchematic - Industrial Digital Twin & Mechanical Schematic
 * Renders the DC motor, gearbox, drive pulley, and moving conveyor belt
 * synchronized with active playback telemetry.
 */

import React, { useMemo } from 'react';
import { TelemetryPoint } from '../types/telemetry';

interface ConveyorSchematicProps {
  point: TelemetryPoint | null;
  gearRatio?: number;
  rollerRadiusM?: number;
  compact?: boolean;
  busVoltageV?: number;
  torqueConstantNmPerA?: number;
  hasKnownConveyorParams?: boolean;
}

export const ConveyorSchematic: React.FC<ConveyorSchematicProps> = ({
  point,
  gearRatio = 3.5,
  rollerRadiusM = 0.075,
  compact = false,
  busVoltageV,
  torqueConstantNmPerA,
  hasKnownConveyorParams = false,
}) => {
  const rpm = point ? point.actual_rpm : 0;
  const refRpm = point?.reference_rpm ?? null;
  const current = point ? point.current_a : 0;
  const pwm = point ? point.pwm_percent : 0;
  const loadTorque = point ? point.load_torque_nm : 0;

  // Mechanical kinematic calculations
  const motorRadS = (rpm * 2 * Math.PI) / 60;
  const beltRollerRadS = motorRadS / gearRatio;
  const linearSpeedMps = beltRollerRadS * rollerRadiusM; // v = omega * r
  const linearSpeedFpm = linearSpeedMps * 196.85; // Feet per minute

  // Electromagnetic torque estimate: Te = Kt * Ia (using Kt from the selected dataset)
  const teElectromagnetic = torqueConstantNmPerA == null ? null : current * torqueConstantNmPerA;

  // Belt animation offset based on cumulative time & linear speed
  const timeS = point ? point.time_s : 0;
  const beltPatternOffset = ((timeS * linearSpeedMps * 40) % 24).toFixed(1);

  // Rotor rotation angle in degrees
  const rotorAngleDeg = (timeS * rpm * 6) % 360;

  // Status flags
  const isLoaded = point !== null && loadTorque > 0;
  const isRunning = rpm > 10;
  const isAccelerating = refRpm !== null ? Math.abs(refRpm - rpm) > 20 : false;

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-4 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-neutral-200 uppercase tracking-wider">
            Mechanical Drive Schematic
          </span>
          <span className="text-[11px] text-neutral-400 font-mono-tabular">
            DC MOTOR ➔ {hasKnownConveyorParams ? `1:${gearRatio}` : 'illustrative'} GEARBOX ➔ CONVEYOR
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono-tabular">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 text-[11px]">BELT VELOCITY:</span>
            <span className="font-bold text-emerald-400">{hasKnownConveyorParams ? `${linearSpeedMps.toFixed(2)} m/s` : 'Not specified'}</span>
            <span className="text-[10px] text-neutral-400">{hasKnownConveyorParams ? `(${linearSpeedFpm.toFixed(0)} fpm)` : '(gear ratio / pulley unspecified)'}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-neutral-400 text-[11px]">SHAFT LOAD:</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              isLoaded ? 'bg-amber-950/80 text-amber-300 border border-amber-700/50' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {isLoaded ? `ENGAGED (${(Math.abs(loadTorque) < 0.1 ? loadTorque.toFixed(3) : loadTorque.toFixed(1))} N·m)` : 'TARE / UNLOADED'}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Technical Drawing */}
      <div className="w-full relative flex items-center justify-center py-2 select-none">
        <svg
          viewBox="0 0 740 180"
          className="w-full max-w-4xl h-auto"
        >
          <defs>
            {/* Belt pattern */}
            <pattern id="conveyorTread" width="24" height="8" patternUnits="userSpaceOnUse" patternTransform={`translate(${beltPatternOffset}, 0)`}>
              <rect width="24" height="8" fill="#1e293b" />
              <line x1="0" y1="4" x2="18" y2="4" stroke="#475569" strokeWidth="2" strokeDasharray="3,3" />
            </pattern>
            {/* Gearbox hatch */}
            <pattern id="gearHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#334155" strokeWidth="1" />
            </pattern>
          </defs>

          {/* 1. DC MOTOR HOUSING */}
          <g transform="translate(20, 35)">
            {/* Motor body outer casing with cooling fins */}
            <rect x="0" y="10" width="85" height="90" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            {/* Cooling fins */}
            <line x1="12" y1="5" x2="12" y2="105" stroke="#475569" strokeWidth="1.2" />
            <line x1="24" y1="5" x2="24" y2="105" stroke="#475569" strokeWidth="1.2" />
            <line x1="36" y1="5" x2="36" y2="105" stroke="#475569" strokeWidth="1.2" />
            <line x1="48" y1="5" x2="48" y2="105" stroke="#475569" strokeWidth="1.2" />
            <line x1="60" y1="5" x2="60" y2="105" stroke="#475569" strokeWidth="1.2" />
            <line x1="72" y1="5" x2="72" y2="105" stroke="#475569" strokeWidth="1.2" />

            {/* Terminal Box */}
            <rect x="25" y="-4" width="35" height="14" rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
            <circle cx="36" cy="3" r="2.5" fill="#ef4444" />
            <circle cx="48" cy="3" r="2.5" fill="#3b82f6" />
            <text x="42" y="-8" textAnchor="middle" fontSize="8" fill="#94a3b8" className="font-mono-tabular">
              PWM ({pwm.toFixed(0)}%)
            </text>

            {/* Rotor Core / Rotating indicator */}
            <g transform={`translate(42, 55) rotate(${rotorAngleDeg})`}>
              <circle cx="0" cy="0" r="20" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="-18" y1="0" x2="18" y2="0" stroke="#0ea5e9" strokeWidth="2" />
              <line x1="0" y1="-18" x2="0" y2="18" stroke="#0ea5e9" strokeWidth="2" />
              <circle cx="0" cy="0" r="5" fill="#f59e0b" />
            </g>

            {/* Motor Label */}
            <text x="42" y="118" textAnchor="middle" fontSize="9" fill="#cbd5e1" className="font-mono-tabular font-semibold">
              DC MOTOR
            </text>
            <text x="42" y="129" textAnchor="middle" fontSize="8" fill="#64748b" className="font-mono-tabular">
              {rpm.toFixed(0)} RPM
            </text>
          </g>

          {/* 2. MOTOR SHAFT & FLEXIBLE COUPLING */}
          <rect x="105" y="85" width="22" height="10" fill="#475569" stroke="#64748b" strokeWidth="1" />
          <line x1="116" y1="80" x2="116" y2="100" stroke="#94a3b8" strokeWidth="1.5" />

          {/* 3. REDUCTION GEARBOX (1:3.5) */}
          <g transform="translate(127, 45)">
            <rect x="0" y="15" width="55" height="70" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
            <rect x="6" y="21" width="43" height="58" fill="url(#gearHatch)" opacity="0.6" />
            {/* Gear wheels */}
            <circle cx="20" cy="50" r="14" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="2,2" />
            <circle cx="36" cy="50" r="10" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2,2" />
            <text x="27" y="100" textAnchor="middle" fontSize="9" fill="#cbd5e1" className="font-mono-tabular font-semibold">
              GEARBOX
            </text>
            <text x="27" y="111" textAnchor="middle" fontSize="8" fill="#64748b" className="font-mono-tabular">
              {hasKnownConveyorParams ? `i = ${gearRatio}:1` : 'ratio unspecified'}
            </text>
          </g>

          {/* 4. OUTPUT SHAFT */}
          <rect x="182" y="86" width="28" height="8" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />

          {/* 5. CONVEYOR BELT ASSEMBLY */}
          <g transform="translate(210, 20)">
            {/* Drive Pulley (Head roller) */}
            <circle cx="50" cy="70" r="32" fill="#1e293b" stroke="#0ea5e9" strokeWidth="2" />
            <circle cx="50" cy="70" r="10" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
            {/* Pulley rotation spoke */}
            <g transform={`translate(50, 70) rotate(${rotorAngleDeg / gearRatio})`}>
              <line x1="-28" y1="0" x2="28" y2="0" stroke="#38bdf8" strokeWidth="1.8" />
              <line x1="0" y1="-28" x2="0" y2="28" stroke="#38bdf8" strokeWidth="1.8" />
            </g>
            <text x="50" y="118" textAnchor="middle" fontSize="8" fill="#94a3b8" className="font-mono-tabular">
              DRIVE PULLEY
            </text>
            <text x="50" y="128" textAnchor="middle" fontSize="8" fill="#64748b" className="font-mono-tabular">
              {hasKnownConveyorParams ? `r = ${(rollerRadiusM * 1000).toFixed(0)}mm` : 'radius unspecified'}
            </text>

            {/* Idler Pulley (Tail roller) */}
            <circle cx="450" cy="70" r="32" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <circle cx="450" cy="70" r="10" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
            <g transform={`translate(450, 70) rotate(${rotorAngleDeg / gearRatio})`}>
              <line x1="-28" y1="0" x2="28" y2="0" stroke="#64748b" strokeWidth="1.5" />
              <line x1="0" y1="-28" x2="0" y2="28" stroke="#64748b" strokeWidth="1.5" />
            </g>
            <text x="450" y="118" textAnchor="middle" fontSize="8" fill="#94a3b8" className="font-mono-tabular">
              IDLER PULLEY
            </text>

            {/* Support Bed & Idler Rollers */}
            <line x1="82" y1="74" x2="418" y2="74" stroke="#334155" strokeWidth="3" />
            <circle cx="150" cy="65" r="12" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
            <circle cx="250" cy="65" r="12" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
            <circle cx="350" cy="65" r="12" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />

            {/* CONTINUOUS CONVEYOR BELT (Top and Bottom run) */}
            {/* Top carrying strand */}
            <rect x="50" y="34" width="400" height="8" rx="2" fill="url(#conveyorTread)" stroke="#64748b" strokeWidth="1" />
            {/* Bottom return strand */}
            <rect x="50" y="98" width="400" height="8" rx="2" fill="url(#conveyorTread)" stroke="#64748b" strokeWidth="1" />

            {/* Left curved belt wrap around drive pulley */}
            <path d="M 50,34 A 36,36 0 0,0 50,106" fill="none" stroke="#64748b" strokeWidth="8" />
            {/* Right curved belt wrap around idler pulley */}
            <path d="M 450,34 A 36,36 0 0,1 450,106" fill="none" stroke="#64748b" strokeWidth="8" />

            {/* Belt Velocity Motion Arrow */}
            {isRunning && (
              <g transform="translate(230, 24)">
                <line x1="0" y1="0" x2="45" y2="0" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrowGreen)" />
                <polygon points="45,-3 52,0 45,3" fill="#10b981" />
                <text x="24" y="-5" textAnchor="middle" fontSize="9" fill="#10b981" className="font-mono-tabular font-semibold">
                  v = {hasKnownConveyorParams ? `${linearSpeedMps.toFixed(2)} m/s` : 'Not specified'}
                </text>
              </g>
            )}

            {/* PAYLOAD ON CONVEYOR (Appears / shifts with load step) */}
            <g transform="translate(180, 0)">
              {/* Parcel Box */}
              <rect
                x="0"
                y="6"
                width="72"
                height="28"
                rx="2"
                fill={isLoaded ? '#78350f' : '#1e293b'}
                stroke={isLoaded ? '#f59e0b' : '#475569'}
                strokeWidth={isLoaded ? 2 : 1}
              />
              <line x1="36" y1="6" x2="36" y2="34" stroke={isLoaded ? '#d97706' : '#334155'} strokeWidth="1" />
              <text x="36" y="23" textAnchor="middle" fontSize="9" fill={isLoaded ? '#fef3c7' : '#94a3b8'} className="font-mono-tabular font-bold">
                {isLoaded ? `LOAD: ${(Math.abs(loadTorque) < 0.1 ? loadTorque.toFixed(3) : loadTorque.toFixed(1))} N·m` : 'TARE MASS'}
              </text>
              {/* Gravity / load downward force vector */}
              {isLoaded && (
                <g transform="translate(36, 36)">
                  <line x1="0" y1="0" x2="0" y2="16" stroke="#f59e0b" strokeWidth="2" />
                  <polygon points="-3,14 0,20 3,14" fill="#f59e0b" />
                  <text x="6" y="14" fontSize="8" fill="#f59e0b" className="font-mono-tabular">
                    TL STEP
                  </text>
                </g>
              )}
            </g>

            {/* Conveyor Bed Supports */}
            <line x1="100" y1="106" x2="100" y2="140" stroke="#334155" strokeWidth="3" />
            <line x1="400" y1="106" x2="400" y2="140" stroke="#334155" strokeWidth="3" />
            <line x1="70" y1="140" x2="430" y2="140" stroke="#1e293b" strokeWidth="3" />
          </g>
        </svg>
      </div>

      {/* Dynamic Physical Telemetry Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 text-xs font-mono-tabular">
        <div className="bg-neutral-950/70 p-2 rounded border border-neutral-800">
          <div className="text-[10px] text-neutral-400">ACTUAL ROTOR SPEED</div>
          <div className="text-sm font-bold text-emerald-400">
            {rpm.toFixed(1)} <span className="text-[10px] font-normal text-neutral-400">RPM</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            Ref: <span className="text-cyan-400">{refRpm !== null ? refRpm.toFixed(0) : '--'}</span> | Δ: {refRpm !== null ? (refRpm - rpm).toFixed(1) : '--'}
          </div>
        </div>

        <div className="bg-neutral-950/70 p-2 rounded border border-neutral-800">
          <div className="text-[10px] text-neutral-400">ARMATURE CURRENT (Ia)</div>
          <div className="text-sm font-bold text-sky-400">
            {current.toFixed(2)} <span className="text-[10px] font-normal text-neutral-400">A</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            P_elec: {busVoltageV == null ? '--' : `${(current * (pwm / 100) * busVoltageV).toFixed(0)} W`}
          </div>
        </div>

        <div className="bg-neutral-950/70 p-2 rounded border border-neutral-800">
          <div className="text-[10px] text-neutral-400">ELECTROMAGNETIC TORQUE (Te)</div>
          <div className="text-sm font-bold text-amber-400">
            {teElectromagnetic !== null ? teElectromagnetic.toFixed(2) : '--'} <span className="text-[10px] font-normal text-neutral-400">N·m</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            Load TL: <span className="text-rose-400">{(Math.abs(loadTorque) < 0.1 ? loadTorque.toFixed(3) : loadTorque.toFixed(1))} N·m</span>
          </div>
        </div>

        <div className="bg-neutral-950/70 p-2 rounded border border-neutral-800">
          <div className="text-[10px] text-neutral-400">PWM DUTY CYCLE</div>
          <div className="text-sm font-bold text-amber-300">
            {pwm.toFixed(1)} <span className="text-[10px] font-normal text-neutral-400">%</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            {pwm >= 99 ? (
              <span className="text-rose-400 font-semibold">RAIL SATURATED</span>
            ) : (
              <span className="text-emerald-400">LINEAR REGION</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
