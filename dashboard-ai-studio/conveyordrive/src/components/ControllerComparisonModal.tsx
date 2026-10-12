/**
 * ControllerComparisonModal - Side-by-Side Controller & Tuning Comparison
 * Compares primary telemetry against reference runs, benchmarks, or alternate tunings.
 */

import React from 'react';
import { SimulationDataset } from '../types/telemetry';
import { calculateControllerMetrics } from '../services/comparisonEngine';
import { X, Check, ArrowRight, Layers, Trophy } from 'lucide-react';

interface ControllerComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: SimulationDataset[];
  primaryDatasetId: string;
  comparisonDatasetId: string | null;
  onSelectComparison: (id: string | null) => void;
}

export const ControllerComparisonModal: React.FC<ControllerComparisonModalProps> = ({
  isOpen,
  onClose,
  datasets,
  primaryDatasetId,
  comparisonDatasetId,
  onSelectComparison,
}) => {
  if (!isOpen) return null;

  const primaryDataset = datasets.find(d => d.id === primaryDatasetId);
  const comparisonDataset = datasets.find(d => d.id === comparisonDatasetId);

  const primaryMetrics = primaryDataset ? calculateControllerMetrics(primaryDataset.data) : null;
  const compMetrics = comparisonDataset ? calculateControllerMetrics(comparisonDataset.data) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                Controller & Tuning Comparison Suite
              </h3>
              <p className="text-xs text-neutral-400">
                Benchmark transient response, error integrals, and energy consumption between simulation runs.
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

        {/* Dataset Selection Selector Bar */}
        <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono-tabular">Active Primary Run:</span>
            <span className="text-xs font-bold text-neutral-200 bg-neutral-800 px-2.5 py-1 rounded border border-neutral-700">
              {primaryDataset ? primaryDataset.name : 'None'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-400 font-mono-tabular">Overlay Benchmark Run:</label>
            <select
              value={comparisonDatasetId || ''}
              onChange={e => onSelectComparison(e.target.value ? e.target.value : null)}
              className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded px-3 py-1 font-mono-tabular focus:outline-none focus:border-amber-500"
            >
              <option value="">-- None (Disable Overlay) --</option>
              {datasets
                .filter(d => d.id !== primaryDatasetId)
                .map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Scorecard Table */}
        <div className="p-4 flex-1">
          {primaryMetrics && compMetrics ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono-tabular text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Performance Metric</th>
                    <th className="py-2.5 px-3 text-neutral-300">
                      Primary ({primaryDataset?.name.slice(0, 24)}...)
                    </th>
                    <th className="py-2.5 px-3 text-amber-300">
                      Comparison ({comparisonDataset?.name.slice(0, 24)}...)
                    </th>
                    <th className="py-2.5 px-3">Advantage / Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  {/* Rise Time */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-200">
                      Rise Time (tr, 10%→90%)
                    </td>
                    <td className="py-2.5 px-3">
                      {primaryMetrics.riseTimeS !== null ? `${primaryMetrics.riseTimeS} s` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {compMetrics.riseTimeS !== null ? `${compMetrics.riseTimeS} s` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3">
                      {primaryMetrics.riseTimeS !== null && compMetrics.riseTimeS !== null ? (
                        <span className={primaryMetrics.riseTimeS <= compMetrics.riseTimeS ? 'text-emerald-400' : 'text-neutral-400'}>
                          {primaryMetrics.riseTimeS <= compMetrics.riseTimeS ? 'Primary faster' : 'Comparison faster'} (Δ {Math.abs(primaryMetrics.riseTimeS - compMetrics.riseTimeS).toFixed(3)}s)
                        </span>
                      ) : '--'}
                    </td>
                  </tr>

                  {/* Overshoot */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-200">
                      Peak Overshoot (%)
                    </td>
                    <td className="py-2.5 px-3">
                      {primaryMetrics.peakOvershootPercent !== null ? `${primaryMetrics.peakOvershootPercent.toFixed(1)}%` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {compMetrics.peakOvershootPercent !== null ? `${compMetrics.peakOvershootPercent.toFixed(1)}%` : '--'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={primaryMetrics.peakOvershootPercent !== null && compMetrics.peakOvershootPercent !== null ? (primaryMetrics.peakOvershootPercent <= compMetrics.peakOvershootPercent ? 'text-emerald-400' : 'text-amber-400') : 'text-neutral-500'}>
                        {primaryMetrics.peakOvershootPercent !== null && compMetrics.peakOvershootPercent !== null ? (primaryMetrics.peakOvershootPercent <= compMetrics.peakOvershootPercent ? 'Primary less overshoot' : 'Comparison less overshoot') : '--'}
                      </span>
                    </td>
                  </tr>

                  {/* Speed Dip */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-200">
                      Load Step Speed Dip
                    </td>
                    <td className="py-2.5 px-3">
                      {primaryMetrics.speedDipRpm !== null ? `-${primaryMetrics.speedDipRpm} RPM` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {compMetrics.speedDipRpm !== null ? `-${compMetrics.speedDipRpm} RPM` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3">
                      {primaryMetrics.speedDipRpm !== null && compMetrics.speedDipRpm !== null ? (
                        <span className={primaryMetrics.speedDipRpm <= compMetrics.speedDipRpm ? 'text-emerald-400' : 'text-neutral-400'}>
                          {primaryMetrics.speedDipRpm <= compMetrics.speedDipRpm ? 'Primary stiffer drive' : 'Comparison stiffer'} (Δ {Math.abs(primaryMetrics.speedDipRpm - compMetrics.speedDipRpm).toFixed(1)} RPM)
                        </span>
                      ) : '--'}
                    </td>
                  </tr>

                  {/* Recovery Time (±2%) */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-200">
                      Disturbance Settling (±2%)
                    </td>
                    <td className="py-2.5 px-3">
                      {primaryMetrics.recoveryTime2PctS !== null ? `${primaryMetrics.recoveryTime2PctS} s` : 'Did not settle'}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {compMetrics.recoveryTime2PctS !== null ? `${compMetrics.recoveryTime2PctS} s` : 'Did not settle'}
                    </td>
                    <td className="py-2.5 px-3">
                      {primaryMetrics.recoveryTime2PctS !== null && compMetrics.recoveryTime2PctS !== null ? (
                        <span className={primaryMetrics.recoveryTime2PctS <= compMetrics.recoveryTime2PctS ? 'text-emerald-400' : 'text-amber-400'}>
                          {primaryMetrics.recoveryTime2PctS <= compMetrics.recoveryTime2PctS ? 'Primary settles faster' : 'Comparison settles faster'}
                        </span>
                      ) : '--'}
                    </td>
                  </tr>

                  {/* IAE */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-200">
                      IAE (Integral Absolute Error)
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {primaryMetrics.iae !== null ? primaryMetrics.iae.toFixed(1) : '--'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-300">
                      {compMetrics.iae !== null ? compMetrics.iae.toFixed(1) : '--'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={primaryMetrics.iae !== null && compMetrics.iae !== null && primaryMetrics.iae < compMetrics.iae ? 'text-emerald-400' : 'text-neutral-400'}>
                        {primaryMetrics.iae !== null && compMetrics.iae !== null ? (primaryMetrics.iae < compMetrics.iae ? 'Primary - Lower cumulative error' : 'Comparison - Lower cumulative error') : 'No reference supplied'}
                      </span>
                    </td>
                  </tr>

                  {/* ITAE */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-200">
                      ITAE (Time-Weighted Error)
                    </td>
                    <td className="py-2.5 px-3">
                      {primaryMetrics.itae !== null ? primaryMetrics.itae.toFixed(1) : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {compMetrics.itae !== null ? compMetrics.itae.toFixed(1) : '--'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={primaryMetrics.itae !== null && compMetrics.itae !== null && primaryMetrics.itae < compMetrics.itae ? 'text-emerald-400' : 'text-neutral-400'}>
                        {primaryMetrics.itae !== null && compMetrics.itae !== null ? (primaryMetrics.itae < compMetrics.itae ? 'Primary rejects persistent tail error' : 'Comparison rejects tail') : 'No reference supplied'}
                      </span>
                    </td>
                  </tr>

                  {/* Peak Current */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-200">
                      Peak Inrush Current (Ia)
                    </td>
                    <td className="py-2.5 px-3">
                      {primaryMetrics.peakCurrentA.toFixed(1)} A
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {compMetrics.peakCurrentA.toFixed(1)} A
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={primaryMetrics.peakCurrentA <= compMetrics.peakCurrentA ? 'text-emerald-400' : 'text-amber-400'}>
                        {primaryMetrics.peakCurrentA <= compMetrics.peakCurrentA ? 'Primary milder electrical stress' : 'Comparison milder stress'}
                      </span>
                    </td>
                  </tr>

                  {/* Steady State Error */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-200">
                      Steady-State Error (ε_ss)
                    </td>
                    <td className="py-2.5 px-3">
                      {primaryMetrics.steadyStateErrorRpm !== null ? `${primaryMetrics.steadyStateErrorRpm.toFixed(2)} RPM` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {compMetrics.steadyStateErrorRpm !== null ? `${compMetrics.steadyStateErrorRpm.toFixed(2)} RPM` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400">
                      {primaryMetrics.steadyStateErrorRpm !== null && compMetrics.steadyStateErrorRpm !== null
                        ? (Math.abs(primaryMetrics.steadyStateErrorRpm - compMetrics.steadyStateErrorRpm) < 0.2
                            ? 'Similar steady-state errors'
                            : primaryMetrics.steadyStateErrorRpm < compMetrics.steadyStateErrorRpm
                              ? 'Primary tighter' : 'Comparison tighter')
                        : 'No reference supplied'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-500 flex flex-col items-center">
              <Trophy className="w-10 h-10 text-neutral-600 mb-2" />
              <p className="text-sm font-semibold text-neutral-400">Select a Benchmark Run to Compare</p>
              <p className="text-xs text-neutral-500 max-w-sm mt-1">
                Choose an alternate tuning or simulation dataset from the dropdown above to display side-by-side performance indicators.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <span>IAE = ∫|e(t)|dt · ITAE = ∫t|e(t)|dt</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-medium transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
