/**
 * Sidebar - Left Navigation Sidebar for ConveyorDrive SCADA Console
 * Desktop-first navigation with engineering project provenance.
 */

import React from 'react';
import {
  Gauge,
  Activity,
  ShieldAlert,
  Layers,
  Settings,
  Cpu,
  Info,
  CheckCircle2,
  HardDriveDownload
} from 'lucide-react';

export type NavScreen = 'overview' | 'speed_response' | 'load_recovery' | 'simulation_runs' | 'settings';

interface SidebarProps {
  currentScreen: NavScreen;
  onSelectScreen: (screen: NavScreen) => void;
  hasDataset: boolean;
  datasetCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
  hasDataset,
  datasetCount,
}) => {
  const navItems = [
    {
      id: 'overview' as NavScreen,
      label: 'Motor Overview',
      subtitle: 'Telemetry & SCADA layout',
      icon: Gauge,
    },
    {
      id: 'speed_response' as NavScreen,
      label: 'Speed Response & Controller Analysis',
      subtitle: 'Controller transient analysis',
      icon: Activity,
    },
    {
      id: 'load_recovery' as NavScreen,
      label: 'Load Recovery Audit',
      subtitle: 'Disturbance rejection diagnostic',
      icon: ShieldAlert,
      badge: 'Key Feature',
    },
    {
      id: 'simulation_runs' as NavScreen,
      label: 'Simulation Runs & Comparison',
      subtitle: 'Comparative benchmark records',
      icon: Layers,
      count: datasetCount,
    },
    {
      id: 'settings' as NavScreen,
      label: 'Settings & Specifications',
      subtitle: 'Motor specs & kinematics',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-[#090f1d] border-r border-[#17233c] flex flex-col justify-between shrink-0 select-none">
      {/* Brand & Provenance */}
      <div>
        <div className="p-4 border-b border-[#17233c] bg-[#070c18]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>ConveyorDrive</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 font-mono-tabular">
                  SCADA
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 font-mono-tabular tracking-wider uppercase">
                PID Motor Drive Suite
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Item List */}
        <nav className="p-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono-tabular">
            Navigation
          </div>

          {navItems.map(item => {
            const isActive = currentScreen === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onSelectScreen(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-xs transition-all group ${
                  isActive
                    ? 'bg-[#131e36] text-white border border-cyan-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#0d1629] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-neutral-300'
                    }`}
                  />
                  <div>
                    <div className="font-medium leading-none">{item.label}</div>
                    <div className="text-[10px] text-neutral-400 mt-1 font-mono-tabular leading-none">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span className="text-[9px] font-mono-tabular font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">
                    {item.badge}
                  </span>
                )}

                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[10px] font-mono-tabular px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Provenance & Simulation Metadata Badge */}
      <div className="p-3 border-t border-[#17233c] bg-[#070c18]/90 text-[11px] font-mono-tabular">
        <div className="p-2.5 rounded bg-[#0b1324] border border-[#1a2845] space-y-2">
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span>PROJECT SPECIFICATION</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>

          <div className="text-[10px] text-neutral-300 font-sans leading-tight font-medium">
            PID DC Motor Speed Control & Disturbance Recovery Analysis
          </div>

          <div className="pt-1 border-t border-[#142036] space-y-1 text-[10px] text-neutral-400">
            <div className="flex items-center justify-between">
              <span>ENVIRONMENT:</span>
              <span className="text-cyan-400 font-semibold">MATLAB/Simulink</span>
            </div>
            <div className="flex items-center justify-between">
              <span>HARDWARE:</span>
              <span className="text-neutral-400">100% Simulation</span>
            </div>
            <div className="flex items-center justify-between">
              <span>STATUS:</span>
              <span className={hasDataset ? 'text-emerald-400 font-semibold' : 'text-neutral-400'}>
                {hasDataset ? 'TELEMETRY LOADED' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
