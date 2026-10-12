/**
 * TopBar - Top Navigation & Status Ribbon for ConveyorDrive SCADA Console
 * Includes Simulation Mode indicator, imported dataset name, and Import CSV action.
 */

import React from 'react';
import { Upload, FileSpreadsheet, Play } from 'lucide-react';
import { SimulationDataset } from '../types/telemetry';

interface TopBarProps {
  currentScreenName: string;
  activeDataset: SimulationDataset | null;
  datasets: SimulationDataset[];
  onSelectDatasetId: (id: string) => void;
  onOpenImport: () => void;
  onQuickLoadSample: () => void;
  playbackTimeS?: number;
  durationS?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentScreenName,
  activeDataset,
  datasets,
  onSelectDatasetId,
  onOpenImport,
  onQuickLoadSample,
  playbackTimeS = 0,
  durationS = 0,
}) => {
  const isLoaded = activeDataset !== null;

  return (
    <header className="h-14 bg-[#090f1d] border-b border-[#17233c] px-4 md:px-6 flex items-center justify-between gap-4 select-none shrink-0 z-30">
      {/* Left: Breadcrumb & Clean Screen Title */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-mono-tabular font-bold tracking-wider text-cyan-400">
          CONVEYORDRIVE
        </span>
        <span className="text-neutral-600 font-mono-tabular">/</span>
        <h1 className="text-xs md:text-sm font-bold text-white tracking-wide uppercase font-mono-tabular">
          {currentScreenName}
        </h1>

        {/* Subtle active dataset indicator if loaded */}
        {isLoaded && (
          <div className="hidden xl:flex items-center gap-1.5 ml-3 pl-3 border-l border-[#1a2845] text-xs font-mono-tabular text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-neutral-300 max-w-[240px] truncate">
              {activeDataset.filename || activeDataset.name}
            </span>
          </div>
        )}
      </div>

      {/* Right: Telemetry Time, Dataset Switcher & Primary Actions */}
      <div className="flex items-center gap-3">
        {/* Playback time if dataset is loaded */}
        {isLoaded && durationS > 0 && (
          <div className="hidden sm:flex items-center text-xs font-mono-tabular text-amber-400 bg-[#0d1629] px-2.5 py-1 rounded border border-[#1a2845]">
            <span className="font-semibold">
              T+{playbackTimeS.toFixed(2)}s / {durationS.toFixed(2)}s
            </span>
          </div>
        )}

        {/* Dataset switcher dropdown if multiple runs are loaded */}
        {datasets.length > 1 && (
          <div className="hidden md:flex items-center gap-1.5 bg-[#0d1629] border border-[#1a2845] px-2.5 py-1 rounded text-xs font-mono-tabular">
            <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={activeDataset?.id || ''}
              onChange={e => onSelectDatasetId(e.target.value)}
              className="bg-transparent text-neutral-200 text-xs font-mono-tabular focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id} className="bg-[#0b1324] text-neutral-200">
                  {d.name.length > 24 ? d.name.slice(0, 24) + '...' : d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons */}
        {!isLoaded && (
          <button
            onClick={onQuickLoadSample}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#13203b] hover:bg-[#1a2c50] text-cyan-400 border border-cyan-800/40 text-xs font-mono-tabular font-medium transition-colors"
            title="Load a browser-generated demonstration (NOT MATLAB/Simulink)"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Load Browser Demo</span>
          </button>
        )}

        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-[#070b14] font-bold text-xs font-mono-tabular transition-colors shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import Simulation CSV</span>
        </button>
      </div>
    </header>
  );
};
