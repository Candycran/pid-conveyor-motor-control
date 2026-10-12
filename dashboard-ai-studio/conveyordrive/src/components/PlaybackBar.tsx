/**
 * PlaybackBar - Simulation Telemetry Playback & Timeline Scrubber
 * Synchronizes multi-channel strip charts, schematic animation, and live gauges.
 */

import React from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward, Flag, Repeat } from 'lucide-react';
import { LoadRecoveryAudit } from '../types/telemetry';

interface PlaybackBarProps {
  currentTimeS: number;
  durationS: number;
  isPlaying: boolean;
  playbackSpeed: number;
  isLooping: boolean;
  audit: LoadRecoveryAudit | null;
  onTogglePlay: () => void;
  onSeek: (timeS: number) => void;
  onStepFrame: (direction: -1 | 1) => void;
  onSpeedChange: (speed: number) => void;
  onToggleLoop: () => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 1.0, 2.0, 5.0];

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  currentTimeS,
  durationS,
  isPlaying,
  playbackSpeed,
  isLooping,
  audit,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onSpeedChange,
  onToggleLoop,
}) => {
  const progressRatio = durationS > 0 ? Math.min(1, Math.max(0, currentTimeS / durationS)) : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSeek(val);
  };

  const jumpToStart = () => onSeek(0);
  const jumpToDisturbance = () => {
    if (audit && audit.hasDisturbance) {
      onSeek(audit.stepTimestamp);
    }
  };
  const jumpToSettled = () => {
    if (audit && audit.recoveryTimestamp2Pct) {
      onSeek(audit.recoveryTimestamp2Pct);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex flex-col gap-2.5 shadow-lg select-none">
      {/* Timeline Scrubber Rail */}
      <div className="flex items-center gap-3 w-full">
        <span className="text-xs font-mono-tabular font-bold text-amber-400 w-16 text-right">
          T+{currentTimeS.toFixed(3)}s
        </span>

        {/* Master Slider */}
        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={durationS || 5.0}
            step={0.005}
            value={currentTimeS}
            onChange={handleSliderChange}
            className="w-full h-2 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />

          {/* Load Disturbance Marker Pin on Slider */}
          {audit && audit.hasDisturbance && durationS > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-rose-500 rounded-xs pointer-events-none"
              style={{ left: `${(audit.stepTimestamp / durationS) * 100}%` }}
              title={`Load Step at ${audit.stepTimestamp}s`}
            />
          )}

          {/* Recovery Settled Marker Pin */}
          {audit && audit.recoveryTimestamp2Pct && durationS > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-emerald-500 rounded-xs pointer-events-none"
              style={{ left: `${(audit.recoveryTimestamp2Pct / durationS) * 100}%` }}
              title={`Settled at ${audit.recoveryTimestamp2Pct}s`}
            />
          )}
        </div>

        <span className="text-xs font-mono-tabular text-neutral-400 w-16">
          {(durationS || 5.0).toFixed(3)}s
        </span>
      </div>

      {/* Control Buttons Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-neutral-800/60">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={jumpToStart}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
            title="Reset to Start (0.00s)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => onStepFrame(-1)}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
            title="Step Back 1 Frame"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`px-3.5 py-1.5 rounded font-medium flex items-center gap-1.5 text-xs transition-colors ${
              isPlaying
                ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
                : 'bg-neutral-100 text-neutral-950 hover:bg-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={() => onStepFrame(1)}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
            title="Step Forward 1 Frame"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded transition-colors ${
              isLooping ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
            }`}
            title={isLooping ? 'Looping Enabled' : 'Loop Disabled'}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Jump-to Event Buttons */}
        <div className="flex items-center gap-1.5 text-xs font-mono-tabular">
          <span className="text-[11px] text-neutral-400 mr-1">JUMP:</span>
          {audit && audit.hasDisturbance && (
            <button
              onClick={jumpToDisturbance}
              className="px-2 py-1 rounded bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/60 transition-colors flex items-center gap-1"
            >
              <Flag className="w-3 h-3 text-rose-400" />
              <span>Load Step (T={audit.stepTimestamp}s)</span>
            </button>
          )}

          {audit && audit.recoveryTimestamp2Pct && (
            <button
              onClick={jumpToSettled}
              className="px-2 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/60 transition-colors"
            >
              <span>Settled (T={audit.recoveryTimestamp2Pct}s)</span>
            </button>
          )}
        </div>

        {/* Speed Multiplier Segmented Selector */}
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800">
          <span className="text-[10px] text-neutral-400 px-1 font-mono-tabular">SPEED:</span>
          {SPEED_OPTIONS.map(spd => (
            <button
              key={spd}
              onClick={() => onSpeedChange(spd)}
              className={`px-2 py-0.5 text-[11px] font-mono-tabular rounded transition-colors ${
                playbackSpeed === spd
                  ? 'bg-neutral-700 text-amber-300 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
