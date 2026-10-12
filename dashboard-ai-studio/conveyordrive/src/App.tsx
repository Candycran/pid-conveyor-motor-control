/**
 * ConveyorDrive - Industrial SCADA Control & Monitoring Dashboard
 * Mechatronics Project: Design and Simulation of a PID-Based DC Motor Speed Control System
 * for an Industrial Conveyor with Dashboard Monitoring and Load-Disturbance Recovery Analysis.
 *
 * 100% Simulation-based system (MATLAB / Simulink CSV telemetry replay).
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TelemetryPoint, SimulationDataset, LoadRecoveryAudit } from './types/telemetry';
import { performLoadRecoveryAudit } from './services/auditEngine';
import { getPresetDatasets } from './services/physicsEngine';
import { Sidebar, NavScreen } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ScreenMotorOverview } from './components/ScreenMotorOverview';
import { ScreenSpeedResponse } from './components/ScreenSpeedResponse';
import { ScreenLoadRecoveryAudit } from './components/ScreenLoadRecoveryAudit';
import { ScreenSimulationRuns } from './components/ScreenSimulationRuns';
import { ScreenSettings } from './components/ScreenSettings';
import { CsvImportModal } from './components/CsvImportModal';
import { SimulationConfigModal } from './components/SimulationConfigModal';

export default function App() {
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<NavScreen>('overview');

  // Datasets State (Starts empty so user sees neutral 'No simulation loaded' placeholders)
  const [datasets, setDatasets] = useState<SimulationDataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [comparisonDatasetId, setComparisonDatasetId] = useState<string | null>(null);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);

  // Playback engine states
  const [playbackTimeS, setPlaybackTimeS] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(true);

  // Active dataset lookup
  const activeDataset = useMemo(() => {
    return datasets.find(d => d.id === activeDatasetId) || null;
  }, [datasets, activeDatasetId]);

  // Max duration of current run
  const durationS = useMemo(() => {
    if (!activeDataset || activeDataset.data.length === 0) return 0;
    return activeDataset.data[activeDataset.data.length - 1].time_s;
  }, [activeDataset]);

  // Load Recovery Audit calculation
  const audit = useMemo<LoadRecoveryAudit | null>(() => {
    if (!activeDataset || activeDataset.data.length === 0) return null;
    return performLoadRecoveryAudit(activeDataset.data);
  }, [activeDataset]);

  // Active data point at current playback timestamp (binary search for high-frequency datasets)
  const currentPoint = useMemo<TelemetryPoint | null>(() => {
    if (!activeDataset || activeDataset.data.length === 0) return null;
    const data = activeDataset.data;
    let low = 0;
    let high = data.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (data[mid].time_s < playbackTimeS) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const idx = Math.min(data.length - 1, Math.max(0, low));
    return data[idx];
  }, [activeDataset, playbackTimeS]);

  // Playback requestAnimationFrame animation loop
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || !activeDataset || activeDataset.data.length === 0) {
      lastFrameTimeRef.current = null;
      return;
    }

    let animId: number;

    const tick = (now: number) => {
      if (lastFrameTimeRef.current !== null) {
        const deltaSeconds = (now - lastFrameTimeRef.current) / 1000;
        const advance = deltaSeconds * playbackSpeed;

        setPlaybackTimeS(prev => {
          const next = prev + advance;
          if (next >= durationS) {
            if (isLooping) {
              return 0.0;
            } else {
              setIsPlaying(false);
              return durationS;
            }
          }
          return next;
        });
      }
      lastFrameTimeRef.current = now;
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, durationS, isLooping, activeDataset]);

  // Keyboard shortcut listeners (Space = Play/Pause, ArrowLeft/Right = Step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setPlaybackTimeS(t => Math.max(0, t - 0.05));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setPlaybackTimeS(t => Math.min(durationS, t + 0.05));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [durationS]);

  // Dataset Ingestion Handlers
  const handleDatasetLoaded = (dataset: SimulationDataset) => {
    setDatasets(prev => {
      const exists = prev.findIndex(d => d.id === dataset.id);
      if (exists !== -1) {
        const copy = [...prev];
        copy[exists] = dataset;
        return copy;
      }
      return [...prev, dataset];
    });
    setActiveDatasetId(dataset.id);
    setPlaybackTimeS(0.0);
    setIsPlaying(false);
  };

  const handleQuickLoadSample = () => {
    const presets = getPresetDatasets();
    handleDatasetLoaded(presets[0]); // Load the clearly labelled 12 V open-loop browser example
  };

  const handleDeleteDataset = (id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
    if (activeDatasetId === id) {
      const remaining = datasets.filter(d => d.id !== id);
      setActiveDatasetId(remaining.length > 0 ? remaining[0].id : null);
      setPlaybackTimeS(0.0);
      setIsPlaying(false);
    }
    if (comparisonDatasetId === id) {
      setComparisonDatasetId(null);
    }
  };

  const handleStepFrame = (direction: -1 | 1) => {
    if (!activeDataset || activeDataset.data.length === 0) return;
    setIsPlaying(false);
    const dt = 1 / (activeDataset.metadata.samplingRateHz || 200);
    setPlaybackTimeS(t => Math.max(0, Math.min(durationS, t + direction * dt * 5)));
  };

  // Screen Title Mapping (Names alone without SCREEN numbers)
  const screenTitles: Record<NavScreen, string> = {
    overview: 'MOTOR OVERVIEW',
    speed_response: 'SPEED RESPONSE AND CONTROLLER ANALYSIS',
    load_recovery: 'LOAD RECOVERY AUDIT',
    simulation_runs: 'SIMULATION RUNS & COMPARISON',
    settings: 'SETTINGS & SYSTEM SPECIFICATIONS',
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070b14] text-neutral-100 font-sans antialiased">
      {/* LEFT NAVIGATION SIDEBAR */}
      <Sidebar
        currentScreen={currentScreen}
        onSelectScreen={setCurrentScreen}
        hasDataset={activeDataset !== null}
        datasetCount={datasets.length}
      />

      {/* MAIN VIEWPORT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOP STATUS & CONTROL BAR */}
        <TopBar
          currentScreenName={screenTitles[currentScreen]}
          activeDataset={activeDataset}
          datasets={datasets}
          onSelectDatasetId={setActiveDatasetId}
          onOpenImport={() => setIsImportModalOpen(true)}
          onQuickLoadSample={handleQuickLoadSample}
          playbackTimeS={playbackTimeS}
          durationS={durationS}
        />

        {/* SCROLLABLE WORKSPACE STAGE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#070b14]">
          <div className="max-w-[1500px] mx-auto w-full">
            {currentScreen === 'overview' && (
              <ScreenMotorOverview
                dataset={activeDataset}
                currentPoint={currentPoint}
                playbackTimeS={playbackTimeS}
                durationS={durationS}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                isLooping={isLooping}
                audit={audit}
                onTogglePlay={() => setIsPlaying(p => !p)}
                onSeek={t => setPlaybackTimeS(t)}
                onStepFrame={handleStepFrame}
                onSpeedChange={setPlaybackSpeed}
                onToggleLoop={() => setIsLooping(l => !l)}
                onOpenImport={() => setIsImportModalOpen(true)}
                onQuickLoadSample={handleQuickLoadSample}
              />
            )}

            {currentScreen === 'speed_response' && (
              <ScreenSpeedResponse
                dataset={activeDataset}
                datasets={datasets}
                comparisonDatasetId={comparisonDatasetId}
                onSelectComparisonId={setComparisonDatasetId}
                playbackTimeS={playbackTimeS}
                durationS={durationS}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                isLooping={isLooping}
                audit={audit}
                onTogglePlay={() => setIsPlaying(p => !p)}
                onSeek={t => setPlaybackTimeS(t)}
                onStepFrame={handleStepFrame}
                onSpeedChange={setPlaybackSpeed}
                onToggleLoop={() => setIsLooping(l => !l)}
                onOpenSimModal={() => setIsSimModalOpen(true)}
              />
            )}

            {currentScreen === 'load_recovery' && (
              <ScreenLoadRecoveryAudit
                dataset={activeDataset}
                audit={audit}
                playbackTimeS={playbackTimeS}
                onSeek={t => setPlaybackTimeS(t)}
                onOpenImport={() => setIsImportModalOpen(true)}
              />
            )}

            {currentScreen === 'simulation_runs' && (
              <ScreenSimulationRuns
                datasets={datasets}
                activeDatasetId={activeDatasetId}
                comparisonDatasetId={comparisonDatasetId}
                onSelectActiveId={setActiveDatasetId}
                onSelectComparisonId={setComparisonDatasetId}
                onDeleteDataset={handleDeleteDataset}
                onOpenImport={() => setIsImportModalOpen(true)}
                onOpenSimModal={() => setIsSimModalOpen(true)}
              />
            )}

            {currentScreen === 'settings' && <ScreenSettings />}
          </div>
        </main>
      </div>

      {/* CSV IMPORT MODAL */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onDatasetLoaded={handleDatasetLoaded}
      />

      {/* IN-BROWSER PHYSICS SIMULATION MODAL */}
      <SimulationConfigModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onRunSimulation={handleDatasetLoaded}
      />
    </div>
  );
}
