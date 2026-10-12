/**
 * Load Recovery Audit for simulated conveyor telemetry.
 * Evaluation classes below are project-defined diagnostics, NOT IEC certification.
 * Step detection adapts to the recorded torque scale (e.g. 0.03 N·m).
 */
import { LoadRecoveryAudit, TelemetryPoint } from '../types/telemetry';

function emptyAudit(message: string): LoadRecoveryAudit {
  return {
    hasDisturbance: false, stepTimestamp: 0, baselineTorqueNm: 0,
    stepTorqueNm: 0, deltaTorqueNm: 0, preDisturbanceRpm: 0,
    undershootRpm: 0, speedDipRpm: 0, speedDipPercent: 0,
    troughTimestamp: 0, recoveryTimestamp1Pct: null,
    recoveryTimestamp2Pct: null, settlingTime1Pct: null,
    settlingTime2Pct: null, toleranceBand2Pct: { upper: 0, lower: 0, center: 0 },
    peakRecoveryCurrentA: 0, peakRecoveryPwmPercent: 0,
    pwmSaturationDurationMs: 0, recoverySlewRateRpmPerSec: 0,
    steadyStateErrorRpm: 0, performanceClass: 'CLASS_D', complianceNotes: [message],
  };
}

const average = (values: number[]): number =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const round = (n: number, digits = 2) => Number(n.toFixed(digits));

export function performLoadRecoveryAudit(data: TelemetryPoint[]): LoadRecoveryAudit {
  if (!data || data.length < 10) return emptyAudit('At least 10 recorded telemetry points are needed for an audit.');
  const values = data.map(p => p.load_torque_nm);
  const torqueRange = Math.max(...values) - Math.min(...values);
  if (torqueRange <= 1e-9) return emptyAudit('No load torque change was recorded.');

  // A step is significant RELATIVE TO THE OBSERVED LOAD CHANGE, not an assumed
  // industrial-size fixed Nm threshold. Very small numerical noise is excluded.
  const threshold = Math.max(1e-9, torqueRange * 0.10);
  let stepIndex = -1;
  for (let i = 1; i < data.length - 5; i++) {
    if (data[i].load_torque_nm - data[i - 1].load_torque_nm >= threshold) {
      stepIndex = i;
      break;
    }
  }
  if (stepIndex < 2) return emptyAudit('No distinct, testable positive load step was detected.');

  const t0 = data[stepIndex].time_s;
  const pre = data.slice(Math.max(0, stepIndex - 25), stepIndex);
  const baselineTorque = average(pre.map(p => p.load_torque_nm));
  const baselineSpeed = average(pre.map(p => p.actual_rpm));
  // Read the post-step plateau from the tail. Do not assume a particular load magnitude.
  const postTail = data.slice(Math.max(stepIndex + 1, data.length - 15));
  const postTorque = average(postTail.map(p => p.load_torque_nm));
  const deltaTorque = postTorque - baselineTorque;
  if (deltaTorque <= 1e-9) return emptyAudit('The net load change is not a sustained positive step.');

  // A reference is available for closed-loop tests; open-loop recovery is compared
  // with the measured speed BEFORE the disturbance, not a fabricated target RPM.
  const ref = data[stepIndex].reference_rpm;
  const center = ref !== null && Number.isFinite(ref) && ref > 0 ? ref : baselineSpeed;
  if (center <= 0) return emptyAudit('Cannot measure speed recovery from a zero-speed baseline.');
  const tol1 = center * 0.01;
  const tol2 = center * 0.02;
  const toleranceBand2Pct = { lower: center - tol2, upper: center + tol2, center };

  // Search for worst post-step speed dip during the first 1.8 simulated seconds.
  let troughIndex = stepIndex;
  let minSpeed = baselineSpeed;
  for (let i = stepIndex; i < data.length; i++) {
    if (data[i].time_s > t0 + 1.8) break;
    if (data[i].actual_rpm < minSpeed) {
      minSpeed = data[i].actual_rpm;
      troughIndex = i;
    }
  }
  const dip = Math.max(0, baselineSpeed - minSpeed);
  const dipPct = baselineSpeed > 0 ? (dip / baselineSpeed) * 100 : 0;

  // Return only a recovery confirmed by a full 0.2 s *continuous* tolerance window.
  // This works with irregularly spaced CSV samples; incomplete windows do not pass.
  const findRecovery = (tolerance: number): number | null => {
    for (let i = troughIndex; i < data.length; i++) {
      if (Math.abs(data[i].actual_rpm - center) > tolerance) continue;
      const endTime = data[i].time_s + 0.2;
      let j = i;
      while (j < data.length && data[j].time_s < endTime - 1e-10) {
        if (Math.abs(data[j].actual_rpm - center) > tolerance) break;
        j++;
      }
      if (j < data.length && data[j].time_s >= endTime - 1e-10) {
        // Include the endpoint in the check.
        if (Math.abs(data[j].actual_rpm - center) <= tolerance) return data[i].time_s;
      }
    }
    return null;
  };
  const recovery2 = findRecovery(tol2);
  const recovery1 = findRecovery(tol1);
  const settling2 = recovery2 === null ? null : round(recovery2 - t0, 3);
  const settling1 = recovery1 === null ? null : round(recovery1 - t0, 3);

  const recoveryWindowEnd = recovery2 ?? data[data.length - 1].time_s;
  const transient = data.filter(p => p.time_s >= t0 && p.time_s <= recoveryWindowEnd);
  const peakCurrent = transient.length ? Math.max(...transient.map(p => Math.abs(p.current_a))) : 0;
  const peakPwm = transient.length ? Math.max(...transient.map(p => p.pwm_percent)) : 0;
  let saturationMs = 0;
  let maxSlew = 0;
  for (let i = 1; i < transient.length; i++) {
    const deltaT = transient[i].time_s - transient[i - 1].time_s;
    if (deltaT <= 0) continue;
    if (transient[i - 1].pwm_percent >= 99) saturationMs += deltaT * 1000;
    if (transient[i].time_s >= data[troughIndex].time_s) {
      maxSlew = Math.max(maxSlew, (transient[i].actual_rpm - transient[i - 1].actual_rpm) / deltaT);
    }
  }
  const tail = data.slice(Math.max(stepIndex + 1, data.length - 15));
  const residual = Math.abs(average(tail.map(p => (p.reference_rpm ?? baselineSpeed) - p.actual_rpm)));

  // Experimental categories: NOT safety ratings and NOT IEC classes.
  let cls: LoadRecoveryAudit['performanceClass'];
  if (settling2 === null) cls = 'CLASS_D';
  else if (dipPct < 5 && settling2 < 0.45 && saturationMs === 0) cls = 'CLASS_A';
  else if (dipPct < 10 && settling2 < 0.90) cls = 'CLASS_B';
  else cls = 'CLASS_C';
  const notes = [
    ref === null
      ? 'Open-loop recovery is compared with the measured pre-disturbance speed; no reference RPM was supplied.'
      : 'Recovery is evaluated against the supplied reference RPM.',
    'Classes A–D are project-defined experimental labels, not IEC compliance or safety certification.',
    settling2 === null
      ? 'No sustained return to the ±2% speed corridor was confirmed before the recording ended.'
      : `±2% recovery confirmed after ${settling2.toFixed(3)} s with a 0.2 s observation window.`,
    saturationMs > 0
      ? `PWM at or above 99% for approximately ${saturationMs.toFixed(0)} ms during the recorded recovery window.`
      : 'No PWM saturation detected during the recorded recovery window.',
    `Peak recorded transient armature current: ${peakCurrent.toFixed(2)} A. No motor thermal limit was supplied.`,
  ];
  return {
    hasDisturbance: true, stepTimestamp: round(t0, 4),
    baselineTorqueNm: round(baselineTorque, 5),
    stepTorqueNm: round(postTorque, 5), deltaTorqueNm: round(deltaTorque, 5),
    preDisturbanceRpm: round(baselineSpeed, 2), undershootRpm: round(minSpeed, 2),
    speedDipRpm: round(dip, 2), speedDipPercent: round(dipPct, 2),
    troughTimestamp: round(data[troughIndex].time_s, 4),
    recoveryTimestamp1Pct: recovery1, recoveryTimestamp2Pct: recovery2,
    settlingTime1Pct: settling1, settlingTime2Pct: settling2,
    toleranceBand2Pct: { lower: round(center - tol2, 2), upper: round(center + tol2, 2), center: round(center, 2) },
    peakRecoveryCurrentA: round(peakCurrent), peakRecoveryPwmPercent: round(peakPwm),
    pwmSaturationDurationMs: round(saturationMs, 1),
    recoverySlewRateRpmPerSec: round(maxSlew, 2),
    steadyStateErrorRpm: round(residual, 2),
    performanceClass: cls, complianceNotes: notes,
  };
}
