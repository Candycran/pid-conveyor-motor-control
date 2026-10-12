/**
 * StripChart - Industrial High-Precision Multi-Channel Telemetry Graph
 * High-performance SVG rendering with technical calibration axes, crosshair scrubbing,
 * tolerance bands, and Load Recovery Audit overlays.
 */

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { TelemetryPoint, LoadRecoveryAudit } from '../types/telemetry';

export interface ChannelSeries {
  id: string;
  name: string;
  unit: string;
  color: string;
  dashed?: boolean;
  strokeWidth?: number;
  getValue: (p: TelemetryPoint) => number;
  visible?: boolean;
}

interface StripChartProps {
  title: string;
  subtitle?: string;
  data: TelemetryPoint[];
  comparisonData?: TelemetryPoint[] | null;
  comparisonLabel?: string;
  channels: ChannelSeries[];
  playbackTimeS: number;
  onSeekTime: (timeS: number) => void;
  yMinDefault?: number;
  yMaxDefault?: number;
  audit?: LoadRecoveryAudit | null;
  showAuditOverlay?: boolean;
  height?: number;
  showZeroLine?: boolean;
  saturationRails?: { lower?: number; upper?: number };
  ratedLimit?: { value: number; label: string };
  timeWindow?: [number, number] | null; // Optional zoom range
}

export const StripChart: React.FC<StripChartProps> = ({
  title,
  subtitle,
  data,
  comparisonData,
  comparisonLabel = 'Comparison Run',
  channels,
  playbackTimeS,
  onSeekTime,
  yMinDefault,
  yMaxDefault,
  audit,
  showAuditOverlay = false,
  height = 240,
  showZeroLine = false,
  saturationRails,
  ratedLimit,
  timeWindow,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [visibleChannels, setVisibleChannels] = useState<Record<string, boolean>>(() =>
    channels.reduce((acc, c) => ({ ...acc, [c.id]: c.visible !== false }), {})
  );

  const toggleChannel = (id: string) => {
    setVisibleChannels(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Dimensions
  const padding = { top: 24, right: 30, bottom: 28, left: 55 };
  const width = 880; // viewBox virtual coordinate system

  // Time boundaries
  const { tMin, tMax } = useMemo(() => {
    if (!data || data.length === 0) return { tMin: 0, tMax: 5.0 };
    if (timeWindow) {
      return { tMin: Math.max(0, timeWindow[0]), tMax: Math.max(timeWindow[0] + 0.1, timeWindow[1]) };
    }
    return {
      tMin: data[0].time_s,
      tMax: Math.max(data[0].time_s + 0.1, data[data.length - 1].time_s),
    };
  }, [data, timeWindow]);

  // Y-axis range
  const { yMin, yMax, yTicks } = useMemo(() => {
    let min = yMinDefault !== undefined ? yMinDefault : Infinity;
    let max = yMaxDefault !== undefined ? yMaxDefault : -Infinity;

    if (data && data.length > 0) {
      for (const p of data) {
        if (p.time_s < tMin || p.time_s > tMax) continue;
        for (const ch of channels) {
          if (!visibleChannels[ch.id]) continue;
          const val = ch.getValue(p);
          if (Number.isFinite(val)) {
            if (val < min) min = val;
            if (val > max) max = val;
          }
        }
      }
    }

    if (comparisonData && comparisonData.length > 0) {
      for (const p of comparisonData) {
        if (p.time_s < tMin || p.time_s > tMax) continue;
        for (const ch of channels) {
          if (!visibleChannels[ch.id]) continue;
          const val = ch.getValue(p);
          if (Number.isFinite(val)) {
            if (val < min) min = val;
            if (val > max) max = val;
          }
        }
      }
    }

    if (min === Infinity || max === -Infinity) {
      min = 0;
      max = 100;
    }

    // Add 10% breathing room if limits weren't explicit
    if (yMinDefault === undefined) {
      min = Math.floor(min - (max - min) * 0.08);
      if (showZeroLine && min > 0) min = 0;
    }
    if (yMaxDefault === undefined) {
      max = Math.ceil(max + (max - min) * 0.08);
      if (max <= min) max = min + 10;
    }

    // Generate 5 calibration ticks
    const tickCount = 4;
    const step = (max - min) / tickCount;
    const ticks: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(parseFloat((min + i * step).toFixed(1)));
    }

    return { yMin: min, yMax: max, yTicks: ticks };
  }, [data, comparisonData, channels, visibleChannels, tMin, tMax, yMinDefault, yMaxDefault, showZeroLine]);

  // Coordinate transforms
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const getX = useCallback(
    (t: number) => {
      const clamped = Math.max(tMin, Math.min(tMax, t));
      return padding.left + ((clamped - tMin) / (tMax - tMin)) * graphWidth;
    },
    [tMin, tMax, graphWidth, padding.left]
  );

  const getY = useCallback(
    (val: number) => {
      const clamped = Math.max(yMin, Math.min(yMax, val));
      return padding.top + graphHeight - ((clamped - yMin) / (yMax - yMin)) * graphHeight;
    },
    [yMin, yMax, graphHeight, padding.top]
  );

  // Time ticks (5-6 marks)
  const timeTicks = useMemo(() => {
    const ticks: number[] = [];
    const count = 5;
    const dt = (tMax - tMin) / count;
    for (let i = 0; i <= count; i++) {
      ticks.push(parseFloat((tMin + i * dt).toFixed(2)));
    }
    return ticks;
  }, [tMin, tMax]);

  // Generate SVG paths for each channel
  const paths = useMemo(() => {
    if (!data || data.length === 0) return {};
    const result: Record<string, string> = {};

    channels.forEach(ch => {
      if (!visibleChannels[ch.id]) return;
      let d = '';
      for (let i = 0; i < data.length; i++) {
        const pt = data[i];
        if (pt.time_s < tMin || pt.time_s > tMax) continue;
        const x = getX(pt.time_s);
        const value = ch.getValue(pt);
        if (!Number.isFinite(value)) { d = d ? d + ' ' : ''; continue; }
        const y = getY(value);
        d += (d.trim() === '' || d.endsWith(' ') ? 'M ' : ' L ') + `${x.toFixed(1)},${y.toFixed(1)}`;
      }
      result[ch.id] = d;
    });

    return result;
  }, [data, channels, visibleChannels, tMin, tMax, getX, getY]);

  // Comparison paths
  const comparisonPaths = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return {};
    const result: Record<string, string> = {};

    channels.forEach(ch => {
      if (!visibleChannels[ch.id]) return;
      let d = '';
      for (let i = 0; i < comparisonData.length; i++) {
        const pt = comparisonData[i];
        if (pt.time_s < tMin || pt.time_s > tMax) continue;
        const x = getX(pt.time_s);
        const value = ch.getValue(pt);
        if (!Number.isFinite(value)) { d = d ? d + ' ' : ''; continue; }
        const y = getY(value);
        d += (d.trim() === '' || d.endsWith(' ') ? 'M ' : ' L ') + `${x.toFixed(1)},${y.toFixed(1)}`;
      }
      result[ch.id] = d;
    });

    return result;
  }, [comparisonData, channels, visibleChannels, tMin, tMax, getX, getY]);

  // Mouse handler for scrubbing & inspection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - (padding.left / width) * rect.width) / ((graphWidth / width) * rect.width)));
    const targetT = tMin + ratio * (tMax - tMin);
    setHoverTime(targetT);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - (padding.left / width) * rect.width) / ((graphWidth / width) * rect.width)));
    const targetT = tMin + ratio * (tMax - tMin);
    onSeekTime(targetT);
  };

  // Find active inspection point (hover or playback)
  const activeInspectTime = hoverTime !== null ? hoverTime : playbackTimeS;
  const activePoint = useMemo(() => {
    if (!data || data.length === 0) return null;
    let closest = data[0];
    let minDiff = Math.abs(data[0].time_s - activeInspectTime);
    for (let i = 1; i < data.length; i++) {
      const diff = Math.abs(data[i].time_s - activeInspectTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = data[i];
      }
    }
    return closest;
  }, [data, activeInspectTime]);

  const activeCompPoint = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return null;
    let closest = comparisonData[0];
    let minDiff = Math.abs(comparisonData[0].time_s - activeInspectTime);
    for (let i = 1; i < comparisonData.length; i++) {
      const diff = Math.abs(comparisonData[i].time_s - activeInspectTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = comparisonData[i];
      }
    }
    return closest;
  }, [comparisonData, activeInspectTime]);

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-3.5 relative overflow-hidden flex flex-col">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-200 uppercase tracking-wider">{title}</span>
          {subtitle && <span className="text-neutral-500 font-mono-tabular">{subtitle}</span>}
        </div>

        {/* Channel Toggles & Live HUD Value */}
        <div className="flex flex-wrap items-center gap-3">
          {channels.map(ch => {
            const isVis = visibleChannels[ch.id];
            const currentVal = activePoint ? ch.getValue(activePoint) : null;
            return (
              <button
                key={ch.id}
                onClick={() => toggleChannel(ch.id)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
                  isVis
                    ? 'border-neutral-700 bg-neutral-800/80 text-neutral-200'
                    : 'border-neutral-800/50 bg-neutral-950/40 text-neutral-500 line-through'
                }`}
                title={`Toggle ${ch.name}`}
              >
                <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: ch.color }} />
                <span>{ch.name}:</span>
                <span className="font-mono-tabular font-medium text-neutral-100">
                  {currentVal !== null && Number.isFinite(currentVal) ? currentVal.toFixed(1) : '--'}
                </span>
                <span className="text-[10px] text-neutral-400">{ch.unit}</span>
              </button>
            );
          })}

          {comparisonData && (
            <div className="flex items-center gap-1 text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded font-mono-tabular">
              <span>{comparisonLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div ref={containerRef} className="relative w-full cursor-crosshair select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          <defs>
            <linearGradient id="corridorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="disturbanceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines & Y Ticks */}
          {yTicks.map(val => {
            const y = getY(val);
            return (
              <g key={val} className="text-neutral-600">
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1f2937"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748b"
                  className="font-mono-tabular select-none"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Zero Line */}
          {showZeroLine && yMin < 0 && yMax > 0 && (
            <line
              x1={padding.left}
              y1={getY(0)}
              x2={width - padding.right}
              y2={getY(0)}
              stroke="#475569"
              strokeWidth="1.2"
            />
          )}

          {/* Saturation Rails */}
          {saturationRails && (
            <>
              {saturationRails.upper !== undefined && (
                <g>
                  <line
                    x1={padding.left}
                    y1={getY(saturationRails.upper)}
                    x2={width - padding.right}
                    y2={getY(saturationRails.upper)}
                    stroke="#ef4444"
                    strokeWidth="1"
                    strokeDasharray="4,2"
                  />
                  <text
                    x={width - padding.right + 4}
                    y={getY(saturationRails.upper) + 3}
                    fontSize="9"
                    fill="#ef4444"
                    className="font-mono-tabular select-none"
                  >
                    100% RAIL
                  </text>
                </g>
              )}
              {saturationRails.lower !== undefined && (
                <line
                  x1={padding.left}
                  y1={getY(saturationRails.lower)}
                  x2={width - padding.right}
                  y2={getY(saturationRails.lower)}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="4,2"
                />
              )}
            </>
          )}

          {/* Rated Current Limit Marker */}
          {ratedLimit && ratedLimit.value >= yMin && ratedLimit.value <= yMax && (
            <g>
              <line
                x1={padding.left}
                y1={getY(ratedLimit.value)}
                x2={width - padding.right}
                y2={getY(ratedLimit.value)}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="3,3"
              />
              <text
                x={width - padding.right - 4}
                y={getY(ratedLimit.value) - 4}
                textAnchor="end"
                fontSize="9"
                fill="#f59e0b"
                className="font-mono-tabular select-none"
              >
                {ratedLimit.label}
              </text>
            </g>
          )}

          {/* X Time Ticks */}
          {timeTicks.map(t => {
            const x = getX(t);
            return (
              <g key={t}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#1f2937"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                  className="font-mono-tabular select-none"
                >
                  {t}s
                </text>
              </g>
            );
          })}

          {/* LOAD RECOVERY AUDIT OVERLAYS (Tolerance Band & Event Markers) */}
          {showAuditOverlay && audit && audit.hasDisturbance && (
            <g>
              {/* Tolerance Band Corridor ±2% */}
              {audit.toleranceBand2Pct && audit.stepTimestamp >= tMin && (
                <g>
                  <rect
                    x={getX(audit.stepTimestamp)}
                    y={getY(audit.toleranceBand2Pct.upper)}
                    width={Math.max(0, width - padding.right - getX(audit.stepTimestamp))}
                    height={Math.max(0, getY(audit.toleranceBand2Pct.lower) - getY(audit.toleranceBand2Pct.upper))}
                    fill="url(#corridorGrad)"
                    stroke="#10b981"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={width - padding.right - 4}
                    y={getY(audit.toleranceBand2Pct.upper) - 4}
                    textAnchor="end"
                    fontSize="9"
                    fill="#10b981"
                    className="font-mono-tabular select-none"
                  >
                    ±2% RECOVERY CORRIDOR
                  </text>
                </g>
              )}

              {/* Disturbance Step Impact Marker */}
              {audit.stepTimestamp >= tMin && audit.stepTimestamp <= tMax && (
                <g>
                  <line
                    x1={getX(audit.stepTimestamp)}
                    y1={padding.top}
                    x2={getX(audit.stepTimestamp)}
                    y2={height - padding.bottom}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="3,2"
                  />
                  <polygon
                    points={`${getX(audit.stepTimestamp) - 5},${padding.top} ${getX(audit.stepTimestamp) + 5},${padding.top} ${getX(audit.stepTimestamp)},${padding.top + 7}`}
                    fill="#ef4444"
                  />
                  <text
                    x={getX(audit.stepTimestamp) + 4}
                    y={padding.top + 10}
                    fontSize="9"
                    fill="#ef4444"
                    className="font-mono-tabular font-semibold select-none"
                  >
                    TL STEP +{audit.deltaTorqueNm}N·m
                  </text>
                </g>
              )}

              {/* Undershoot Trough Marker */}
              {audit.troughTimestamp >= tMin && audit.troughTimestamp <= tMax && (
                <g>
                  <circle
                    cx={getX(audit.troughTimestamp)}
                    cy={getY(audit.undershootRpm)}
                    r="4"
                    fill="#f59e0b"
                    stroke="#000"
                    strokeWidth="1"
                  />
                  <text
                    x={getX(audit.troughTimestamp) + 6}
                    y={getY(audit.undershootRpm) + 12}
                    fontSize="9"
                    fill="#f59e0b"
                    className="font-mono-tabular font-medium select-none"
                  >
                    DIP: -{audit.speedDipRpm.toFixed(1)} RPM ({audit.speedDipPercent.toFixed(1)}%)
                  </text>
                </g>
              )}

              {/* Recovery Settled Marker */}
              {audit.recoveryTimestamp2Pct && audit.recoveryTimestamp2Pct >= tMin && audit.recoveryTimestamp2Pct <= tMax && (
                <g>
                  <line
                    x1={getX(audit.recoveryTimestamp2Pct)}
                    y1={padding.top + 10}
                    x2={getX(audit.recoveryTimestamp2Pct)}
                    y2={height - padding.bottom}
                    stroke="#10b981"
                    strokeWidth="1.2"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={getX(audit.recoveryTimestamp2Pct) + 4}
                    y={padding.top + 22}
                    fontSize="9"
                    fill="#10b981"
                    className="font-mono-tabular select-none"
                  >
                    SETTLED ({audit.settlingTime2Pct}s)
                  </text>
                </g>
              )}
            </g>
          )}

          {/* COMPARISON DATA TRACES (Dotted / Contrasting trace) */}
          {comparisonData &&
            channels.map(ch => {
              if (!visibleChannels[ch.id] || !comparisonPaths[ch.id]) return null;
              return (
                <path
                  key={`comp-${ch.id}`}
                  d={comparisonPaths[ch.id]}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.6"
                  strokeDasharray="4,2"
                  strokeOpacity="0.8"
                />
              );
            })}

          {/* PRIMARY DATA TRACES */}
          {channels.map(ch => {
            if (!visibleChannels[ch.id] || !paths[ch.id]) return null;
            return (
              <path
                key={ch.id}
                d={paths[ch.id]}
                fill="none"
                stroke={ch.color}
                strokeWidth={ch.strokeWidth || 1.8}
                strokeDasharray={ch.dashed ? '4,3' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Hover Crosshair */}
          {hoverTime !== null && hoverTime >= tMin && hoverTime <= tMax && (
            <line
              x1={getX(hoverTime)}
              y1={padding.top}
              x2={getX(hoverTime)}
              y2={height - padding.bottom}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="2,2"
              pointerEvents="none"
            />
          )}

          {/* Active Playback Cursor (Amber Hairline) */}
          {playbackTimeS >= tMin && playbackTimeS <= tMax && (
            <g pointerEvents="none">
              <line
                x1={getX(playbackTimeS)}
                y1={padding.top}
                x2={getX(playbackTimeS)}
                y2={height - padding.bottom}
                stroke="#f59e0b"
                strokeWidth="1.8"
              />
              <polygon
                points={`${getX(playbackTimeS) - 4},${padding.top - 2} ${getX(playbackTimeS) + 4},${padding.top - 2} ${getX(playbackTimeS)},${padding.top + 5}`}
                fill="#f59e0b"
              />
              {/* Active data point highlight on each visible channel */}
              {activePoint &&
                channels.map(ch => {
                  if (!visibleChannels[ch.id]) return null;
                  const cy = getY(ch.getValue(activePoint));
                  return (
                    <circle
                      key={`pt-${ch.id}`}
                      cx={getX(playbackTimeS)}
                      cy={cy}
                      r="3.5"
                      fill={ch.color}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  );
                })}
            </g>
          )}
        </svg>
      </div>

      {/* Axis Footer */}
      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/60 mt-1 font-mono-tabular">
        <span>T_MIN: {tMin.toFixed(2)}s</span>
        <span className="text-neutral-400">Time Elapsed (seconds)</span>
        <span>T_MAX: {tMax.toFixed(2)}s</span>
      </div>
    </div>
  );
};
