/**
 * SIMULATION RUNS & COMPARISON
 * Management of imported MATLAB/Simulink simulation datasets,
 * side-by-side run comparisons, and CSV export.
 */

import React from 'react';
import { SimulationDataset } from '../types/telemetry';
import { calculateControllerMetrics } from '../services/comparisonEngine';
import { exportTelemetryToCsv } from '../services/csvParser';
import {
  Layers,
  Upload,
  Download,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Play,
  Sliders,
  Check
} from 'lucide-react';

interface ScreenSimulationRunsProps {
  datasets: SimulationDataset[];
  activeDatasetId: string | null;
  comparisonDatasetId: string | null;
  onSelectActiveId: (id: string) => void;
  onSelectComparisonId: (id: string | null) => void;
  onDeleteDataset: (id: string) => void;
  onOpenImport: () => void;
  onOpenSimModal: () => void;
}

export const ScreenSimulationRuns: React.FC<ScreenSimulationRunsProps> = ({
  datasets,
  activeDatasetId,
  comparisonDatasetId,
  onSelectActiveId,
  onSelectComparisonId,
  onDeleteDataset,
  onOpenImport,
  onOpenSimModal,
}) => {
  const handleExport = (dataset: SimulationDataset) => {
    const csv = exportTelemetryToCsv(dataset);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Action Bar */}
      <div className="scada-panel rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 scada-card-glow">
        <div>
          <h3 className="text-sm font-bold text-white uppercase font-mono-tabular">
            Simulation Runs & Benchmark Archive
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Store, compare, and inspect multiple MATLAB/Simulink export datasets or in-browser physics simulations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSimModal}
            className="px-3 py-1.5 rounded bg-[#13203b] hover:bg-[#1a2c50] text-cyan-400 border border-cyan-800/40 text-xs font-mono-tabular flex items-center gap-1.5 transition-colors font-medium"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>New Physics Simulation</span>
          </button>
          <button
            onClick={onOpenImport}
            className="px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-[#070b14] text-xs font-mono-tabular font-bold transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV Dataset</span>
          </button>
        </div>
      </div>

      {/* Dataset Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map(d => {
          const isActive = d.id === activeDatasetId;
          const isComp = d.id === comparisonDatasetId;
          const metrics = calculateControllerMetrics(d.data);

          return (
            <div
              key={d.id}
              className={`scada-panel rounded-lg p-4 flex flex-col justify-between transition-all ${
                isActive ? 'border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-[#0f192d]' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-[#091122] text-cyan-400 border border-cyan-900/50">
                    {d.source === 'csv_upload' ? 'CSV IMPORT' : 'BROWSER DEMO'}
                  </span>
                  <div className="flex items-center gap-1">
                    {isActive && (
                      <span className="text-[9px] font-mono-tabular px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                        ACTIVE RUN
                      </span>
                    )}
                    {isComp && (
                      <span className="text-[9px] font-mono-tabular px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                        OVERLAY
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white line-clamp-1">{d.name}</h4>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                  {d.metadata.description || 'Loaded run: see dataset source label above.'}
                </p>

                {/* Technical specs strip */}
                <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded bg-[#090e1b] border border-[#141f33] text-[11px] font-mono-tabular">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">POINTS:</span>
                    <span className="text-neutral-200">{d.data.length} records</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">DURATION:</span>
                    <span className="text-neutral-200">
                      {(d.data[d.data.length - 1].time_s - d.data[0].time_s).toFixed(2)} s
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">RISE TIME:</span>
                    <span className="text-cyan-400">{metrics.riseTimeS ? `${metrics.riseTimeS}s` : '--'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">LOAD DIP:</span>
                    <span className="text-rose-400">{metrics.speedDipRpm ? `-${metrics.speedDipRpm} RPM` : '--'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#162238] flex items-center justify-between text-xs font-mono-tabular">
                <div className="flex items-center gap-1.5">
                  {!isActive && (
                    <button
                      onClick={() => onSelectActiveId(d.id)}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
                    >
                      Make Active
                    </button>
                  )}
                  <button
                    onClick={() => onSelectComparisonId(isComp ? null : d.id)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      isComp
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-[#13203b] text-neutral-300 hover:text-white border border-[#1a2c50]'
                    }`}
                  >
                    {isComp ? 'Remove Overlay' : 'Compare Overlay'}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExport(d)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-[#13203b] rounded transition-colors"
                    title="Export CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {datasets.length > 1 && (
                    <button
                      onClick={() => onDeleteDataset(d.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
