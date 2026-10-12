/**
 * CsvImportModal - Telemetry Data Import and Schema Inspector
 * Supports file upload, drag-and-drop, raw text pasting, schema documentation,
 * empty CSV template downloads, and clearly labelled browser demonstration datasets.
 */

import React, { useState, useRef } from 'react';
import { parseTelemetryCsv, generateSampleCsvTemplate, REQUIRED_CSV_COLUMNS } from '../services/csvParser';
import { getPresetDatasets } from '../services/physicsEngine';
import { SimulationDataset } from '../types/telemetry';
import { Upload, FileText, CheckCircle2, AlertTriangle, Download, X, Database, ArrowRight } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (dataset: SimulationDataset) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onDatasetLoaded,
}) => {
  const [tab, setTab] = useState<'upload' | 'paste' | 'samples'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessCsv = (text: string, filename: string) => {
    setParseError(null);
    setParseWarnings([]);
    const res = parseTelemetryCsv(text, filename);
    if (!res.success || !res.dataset) {
      setParseError(res.error || 'Failed to parse CSV file.');
      setParseWarnings(res.warnings);
      return;
    }

    onDatasetLoaded(res.dataset);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      handleProcessCsv(content, file.name);
    };
    reader.onerror = () => {
      setParseError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      handleProcessCsv(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template = generateSampleCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conveyordrive_telemetry_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadPreset = (preset: SimulationDataset) => {
    onDatasetLoaded(preset);
    onClose();
  };

  const presets = getPresetDatasets();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                Import Simulation Telemetry
              </h3>
              <p className="text-xs text-neutral-400">
                Import recorded simulation data or explore separately labelled browser demonstrations.
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

        {/* Tab Strip */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-neutral-800 bg-neutral-950/40 text-xs">
          <button
            onClick={() => setTab('upload')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              tab === 'upload'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => setTab('paste')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              tab === 'paste'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Paste CSV Text
          </button>
          <button
            onClick={() => setTab('samples')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              tab === 'samples'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Browser Demos
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex flex-col gap-4">
          {tab === 'upload' && (
            <div
              onDragOver={e => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-amber-500 bg-amber-950/20'
                  : 'border-neutral-700 hover:border-neutral-500 bg-neutral-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-10 h-10 text-amber-400 mb-3" />
              <div className="text-sm font-semibold text-neutral-200">
                Click to browse or drop CSV telemetry file here
              </div>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                Compatible with MATLAB, Simulink, Python, or LabVIEW exported CSV time-series files.
              </p>
            </div>
          )}

          {tab === 'paste' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs text-neutral-400 font-mono-tabular">
                Paste Raw CSV (Header row + data lines):
              </label>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="time_s,actual_rpm,measured_rpm,pwm_percent,current_a,load_torque_nm&#10;Paste your exported Simulink CSV rows here..."
                rows={8}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-xs font-mono-tabular text-neutral-200 focus:outline-none focus:border-amber-500"
              />
              <button
                disabled={!pasteText.trim()}
                onClick={() => handleProcessCsv(pasteText, 'pasted_telemetry.csv')}
                className="self-end px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-semibold text-xs rounded transition-colors"
              >
                Parse & Load Telemetry
              </button>
            </div>
          )}

          {tab === 'samples' && (
            <div className="flex flex-col gap-2.5">
              <div className="text-xs text-neutral-400 mb-1">
                These examples are generated in your browser, NOT exported from MATLAB or Simulink:
              </div>
              {presets.map(preset => (
                <div
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset)}
                  className="p-3 bg-neutral-950/70 border border-neutral-800 hover:border-amber-500/60 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-neutral-200 group-hover:text-amber-300 transition-colors">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {preset.metadata.description}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-mono-tabular mt-1.5">
                      {preset.metadata.controllerGains ? (
                        <span>Illustrative PID: {preset.metadata.controllerGains.Kp} / {preset.metadata.controllerGains.Ki} / {preset.metadata.controllerGains.Kd}</span>
                      ) : (
                        <span>Open-loop • 12 V bus • 66.67% PWM</span>
                      )}
                      <span>·</span>
                      <span>Load after step: {preset.metadata.disturbanceEvent?.stepTorqueNm} N·m</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
                </div>
              ))}
            </div>
          )}

          {/* Validation Feedback */}
          {parseError && (
            <div className="p-3 rounded bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <span className="font-semibold">Parse Error:</span> {parseError}
              </div>
            </div>
          )}

          {parseWarnings.length > 0 && (
            <div className="p-3 rounded bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs">
              <div className="font-semibold mb-1">Warnings:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-neutral-300 text-[11px]">
                {parseWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Schema Requirement Specification Table */}
          <div className="bg-neutral-950/80 rounded-lg p-3 border border-neutral-800 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                Mandatory CSV Column Headers
              </span>
              <button
                onClick={handleDownloadTemplate}
                className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1 font-mono-tabular"
              >
                <Download className="w-3 h-3" />
                <span>Download Template (.csv)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono-tabular">
              {REQUIRED_CSV_COLUMNS.map(col => (
                <div key={col} className="bg-neutral-900 px-2 py-1 rounded border border-neutral-800 text-neutral-300">
                  <span className="text-amber-400">#</span> {col}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
