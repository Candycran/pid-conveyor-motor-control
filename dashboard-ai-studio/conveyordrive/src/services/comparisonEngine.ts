/** Controller comparisons. Tracking metrics require a supplied speed reference. */
import { ControllerMetrics, TelemetryPoint } from '../types/telemetry';
import { performLoadRecoveryAudit } from './auditEngine';

export function calculateControllerMetrics(data: TelemetryPoint[]): ControllerMetrics {
  const empty: ControllerMetrics = {
    riseTimeS: null, peakOvershootPercent: null, speedDipRpm: null,
    recoveryTime2PctS: null, steadyStateErrorRpm: null,
    iae: null, itae: null, peakCurrentA: 0, avgPwmPercent: 0, energyProxy: 0,
  };
  if (!data || data.length < 5) return empty;
  const audit = performLoadRecoveryAudit(data);
  const hasRef = data.every(p => p.reference_rpm !== null && Number.isFinite(p.reference_rpm));
  const tail = data.slice(-Math.max(5, Math.floor(data.length * 0.1)));
  let riseTimeS: number | null = null;
  let overshoot: number | null = null;
  let steadyError: number | null = null;
  let iae: number | null = null;
  let itae: number | null = null;
  if (hasRef) {
    const target = data[Math.floor(data.length / 2)].reference_rpm!;
    if (target > 0) {
      let t10: number | null = null;
      let t90: number | null = null;
      for (const point of data) {
        if (t10 === null && point.actual_rpm >= 0.1 * target) t10 = point.time_s;
        if (t90 === null && point.actual_rpm >= 0.9 * target) t90 = point.time_s;
        if (t10 !== null && t90 !== null) break;
      }
      if (t10 !== null && t90 !== null) riseTimeS = Number((t90 - t10).toFixed(3));
      const preStep = audit.hasDisturbance ? data.filter(p => p.time_s < audit.stepTimestamp) : data;
      overshoot = Number((100 * Math.max(0, Math.max(...preStep.map(p => p.actual_rpm)) - target) / target).toFixed(2));
    }
    steadyError = Number((Math.abs(tail.reduce((s, p) => s + (p.reference_rpm! - p.actual_rpm), 0) / tail.length)).toFixed(2));
    let totalIae = 0;
    let totalItae = 0;
    for (let i = 1; i < data.length; i++) {
      const dt = Math.max(0, data[i].time_s - data[i - 1].time_s);
      const error = Math.abs(data[i].reference_rpm! - data[i].actual_rpm);
      totalIae += error * dt;
      totalItae += data[i].time_s * error * dt;
    }
    iae = Number(totalIae.toFixed(2));
    itae = Number(totalItae.toFixed(2));
  }
  let energy = 0;
  for (let i = 1; i < data.length; i++) {
    energy += data[i].current_a ** 2 * Math.max(0, data[i].time_s - data[i - 1].time_s);
  }
  return {
    riseTimeS, peakOvershootPercent: overshoot,
    speedDipRpm: audit.hasDisturbance ? audit.speedDipRpm : null,
    recoveryTime2PctS: audit.hasDisturbance ? audit.settlingTime2Pct : null,
    steadyStateErrorRpm: steadyError, iae, itae,
    peakCurrentA: Number(Math.max(...data.map(p => Math.abs(p.current_a))).toFixed(2)),
    avgPwmPercent: Number((data.reduce((s, p) => s + p.pwm_percent, 0) / data.length).toFixed(2)),
    energyProxy: Number(energy.toFixed(2)),
  };
}
