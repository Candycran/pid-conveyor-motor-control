/**
 * First-Principles DC Motor & Industrial Conveyor Belt Physics Engine
 * 
 * Electrical equation:
 *   di_a / dt = (V_a - R_a * i_a - K_e * omega_m) / L_a
 *   where V_a = V_bus * (PWM / 100)
 * 
 * Mechanical equation:
 *   d_omega_m / dt = (T_e - T_L - B_m * omega_m - T_c * sgn(omega_m)) / J_total
 *   where T_e = K_t * i_a
 *   J_total = J_rotor + J_coupling + (J_roller + m_belt_and_load * r^2) / N_gear^2
 * 
 * Controller:
 *   Discrete PID speed regulator with anti-windup clamping and derivative filter (N)
 */

import { SimulationDataset, TelemetryPoint } from '../types/telemetry';

export interface MotorSimulationConfig {
  // Motor parameters
  vBus: number; // Bus voltage (V), 12 V in current MATLAB model
  ra: number; // Armature resistance (Ohms)
  la: number; // Armature inductance (H)
  ke: number; // Back-EMF constant (V / (rad/s))
  kt: number; // Torque constant (N*m / A)
  jRotor: number; // Motor/load lumped inertia (kg*m^2)

  // Conveyor mechanics
  gearRatio: number; // Motor speed / Belt roller speed, e.g. 4.0
  rollerRadiusM: number; // Roller radius, e.g. 0.075 m
  beltAndPayloadMassKg: number; // Total linear mass (kg), e.g. 35 kg
  viscousFrictionB: number; // N*m*s/rad, e.g. 0.0025
  coulombFrictionTc: number; // N*m, e.g. 0.45

  // Controller parameters (browser demonstrations only, NOT tuned MATLAB PID gains)
  controlMode: 'open_loop' | 'pid';
  openLoopDutyPercent: number;
  kp: number;
  ki: number;
  kd: number;
  derivativeFilterN: number; // Filtering coefficient for D-term (typical 10-100)
  useFeedforward: boolean;
  kFf?: number;

  // Simulation run setup
  targetRpm: number;
  durationS: number;
  timeStepS: number; // Euler integration step, e.g. 0.0005 s (2000 Hz)
  outputSampleRateHz: number; // Downsampled output for UI, e.g. 200 Hz
  loadStepTimeS: number;
  initialLoadTorqueNm: number;
  stepLoadTorqueNm: number; // e.g. 14.5 Nm step when bulk parcel arrives
  encoderNoiseStdDevRpm: number;
}

// Day 1–3 MATLAB motor model parameters are the reference. Additional conveyor
// gearbox/payload mechanics have not yet been assigned, so the browser example
// uses zero reflected conveyor inertia and a direct-drive 1:1 placeholder.
// The MATLAB/Simulink model remains authoritative for actual project results.
export const DEFAULT_MOTOR_CONFIG: MotorSimulationConfig = {
  vBus: 12,
  ra: 2,
  la: 0.01,
  ke: 0.05,
  kt: 0.05,
  jRotor: 0.0001,
  gearRatio: 1,
  rollerRadiusM: 0,
  beltAndPayloadMassKg: 0,
  viscousFrictionB: 0.00001,
  coulombFrictionTc: 0,
  controlMode: 'open_loop',
  openLoopDutyPercent: 100 * (8 / 12),
  // Illustrative untuned values; no PID performance is claimed at Day 3.
  kp: 0.1,
  ki: 0.2,
  kd: 0,
  derivativeFilterN: 40,
  useFeedforward: false,
  targetRpm: 1500,
  durationS: 2.0,
  timeStepS: 0.0001,
  outputSampleRateHz: 200,
  loadStepTimeS: 1.0,
  initialLoadTorqueNm: 0,
  stepLoadTorqueNm: 0.03,
  encoderNoiseStdDevRpm: 0,
};

/**
 * Runs physics simulation and returns TelemetryPoint array
 */
export function simulateConveyorMotor(config: MotorSimulationConfig): TelemetryPoint[] {
  const {
    vBus,
    ra,
    la,
    ke,
    kt,
    jRotor,
    gearRatio,
    rollerRadiusM,
    beltAndPayloadMassKg,
    viscousFrictionB,
    coulombFrictionTc,
    controlMode,
    openLoopDutyPercent,
    kp,
    ki,
    kd,
    derivativeFilterN,
    useFeedforward,
    targetRpm,
    durationS,
    timeStepS,
    outputSampleRateHz,
    loadStepTimeS,
    initialLoadTorqueNm,
    stepLoadTorqueNm,
    encoderNoiseStdDevRpm,
  } = config;

  // Reflected inertia of conveyor belt and rollers to the motor shaft:
  // J_equiv_motor = J_rotor + (m_belt * r^2) / N_gear^2
  const jReflectedBelt = (beltAndPayloadMassKg * Math.pow(rollerRadiusM, 2)) / Math.pow(gearRatio, 2);
  const jTotal = jRotor + jReflectedBelt;

  const totalSteps = Math.floor(durationS / timeStepS);
  const outputInterval = Math.max(1, Math.floor(1 / (outputSampleRateHz * timeStepS)));

  const points: TelemetryPoint[] = [];

  // State variables
  let ia = 0.0; // Armature current (A)
  let omega = 0.0; // Angular velocity (rad/s)
  let integralError = 0.0;
  let prevError = 0.0;
  let dFiltered = 0.0;
  // Discrete shaft-encoder approximation for the browser demonstration:
  // 100 counts/rev and a 50-ms count-difference RPM estimator, as in Day 3.
  let shaftAngleRad = 0;
  let lastEncoderCount = 0;
  let encoderMeasuredRpm = 0;
  const encoderPpr = 100;
  const encoderSampleSteps = Math.max(1, Math.round(0.05 / timeStepS));

  // Simple pseudo-random generator with fixed seed for reproducible realistic encoder noise
  let noiseSeed = 12345;
  const pseudoGauss = () => {
    noiseSeed = (noiseSeed * 9301 + 49297) % 233280;
    const u1 = noiseSeed / 233280;
    noiseSeed = (noiseSeed * 9301 + 49297) % 233280;
    const u2 = noiseSeed / 233280;
    return Math.sqrt(-2.0 * Math.log(u1 + 1e-10)) * Math.cos(2.0 * Math.PI * u2);
  };

  const radsToRpm = 60 / (2 * Math.PI);
  const rpmToRads = (2 * Math.PI) / 60;

  for (let step = 0; step <= totalSteps; step++) {
    const t = step * timeStepS;

    // Load torque disturbance schedule:
    // Ramp up initial load, then step disturbance at loadStepTimeS
    let currentLoadTorque = initialLoadTorqueNm;
    if (t >= loadStepTimeS) {
      // Smooth 20ms step transient simulating a package landing onto the moving conveyor
      const stepProgress = Math.min(1.0, (t - loadStepTimeS) / 0.025);
      currentLoadTorque = initialLoadTorqueNm + (stepLoadTorqueNm - initialLoadTorqueNm) * stepProgress;
    }

    const currentRpm = omega * radsToRpm;
    // Add realistic encoder discretization & sensor noise
    const noise = encoderNoiseStdDevRpm > 0 ? pseudoGauss() * encoderNoiseStdDevRpm : 0;
    if (step > 0 && step % encoderSampleSteps === 0) {
      const totalEncoderCount = Math.floor((shaftAngleRad * encoderPpr) / (2 * Math.PI));
      const deltaEncoderCount = totalEncoderCount - lastEncoderCount;
      encoderMeasuredRpm = (deltaEncoderCount * 60) / (encoderPpr * encoderSampleSteps * timeStepS);
      lastEncoderCount = totalEncoderCount;
    }
    const measuredRpm = Math.max(0, encoderMeasuredRpm + noise);

    // Reference speed profile: smooth S-ramp to target RPM over first 0.8s
    let refRpm = 0;
    if (t < 0.8) {
      const alpha = t / 0.8;
      // S-curve smoothstep
      refRpm = targetRpm * (3 * alpha * alpha - 2 * alpha * alpha * alpha);
    } else {
      refRpm = targetRpm;
    }

    // PID Controller (executed in discrete time)
    const errorRpm = refRpm - measuredRpm;
    const errorRads = errorRpm * rpmToRads;

    // Proportional term
    const pTerm = kp * errorRpm;

    // Filtered Derivative term
    // D(s) = (Kd * s) / (1 + s / N)
    const dRaw = kd * ((errorRpm - prevError) / timeStepS);
    const alphaD = (timeStepS * derivativeFilterN) / (1 + timeStepS * derivativeFilterN);
    dFiltered = dFiltered + alphaD * (dRaw - dFiltered);
    prevError = errorRpm;

    // Integral term with conditional anti-windup integration
    const iTerm = ki * integralError;

    // Feedforward term (voltage proportional to target speed)
    const ffTerm = useFeedforward ? (refRpm * rpmToRads * ke * (100 / vBus)) : 0;

    // Unclamped control command (% PWM)
    const unsaturatedPwm = pTerm + iTerm + dFiltered + ffTerm;

    // Actuator saturation limit [0%, 100%]
    const pwmPercent = controlMode === 'open_loop'
      ? Math.max(0, Math.min(100, openLoopDutyPercent))
      : Math.max(0, Math.min(100, unsaturatedPwm));

    // Anti-windup clamping: only integrate if not saturating, or if error opposes saturation
    const isSaturatedHigh = unsaturatedPwm > 100 && errorRpm > 0;
    const isSaturatedLow = unsaturatedPwm < 0 && errorRpm < 0;
    if (controlMode === 'pid' && !isSaturatedHigh && !isSaturatedLow) {
      integralError += errorRpm * timeStepS;
    }

    // Electrical subsystem
    const appliedVoltage = (pwmPercent / 100) * vBus;
    const backEmf = ke * omega;
    const dia_dt = (appliedVoltage - ra * ia - backEmf) / la;
    ia += dia_dt * timeStepS;
    if (ia < 0) ia = 0; // Unidirectional drive (quadrant 1)

    // Mechanical subsystem
    const torqueElectromagnetic = kt * ia;
    const frictionTorque = viscousFrictionB * omega + (omega > 0.05 ? coulombFrictionTc : 0);
    // Reflected load torque at motor shaft
    const loadTorqueAtMotorShaft = currentLoadTorque / gearRatio;

    const netTorque = torqueElectromagnetic - loadTorqueAtMotorShaft - frictionTorque;
    const domega_dt = netTorque / jTotal;
    omega += domega_dt * timeStepS;
    if (omega < 0) omega = 0;
    shaftAngleRad += omega * timeStepS;

    // Downsample and record point
    if (step % outputInterval === 0 || step === totalSteps) {
      points.push({
        time_s: parseFloat(t.toFixed(4)),
        reference_rpm: controlMode === 'open_loop' ? null : parseFloat(refRpm.toFixed(1)),
        actual_rpm: parseFloat((omega * radsToRpm).toFixed(2)),
        measured_rpm: parseFloat(measuredRpm.toFixed(2)),
        pwm_percent: parseFloat(pwmPercent.toFixed(2)),
        current_a: parseFloat(ia.toFixed(2)),
        load_torque_nm: parseFloat(currentLoadTorque.toFixed(2)),
      });
    }
  }

  return points;
}

/**
 * Optional, clearly labelled 12 V BROWSER open-loop example.
 * Uses current Day 1–3 motor parameters and an AVERAGED 8 V PWM voltage.
 * This is an independent numerical approximation, not imported Simulink data.
 */
export function getPresetDatasets(): SimulationDataset[] {
  const config = { ...DEFAULT_MOTOR_CONFIG };
  return [{
    id: 'browser_demo_day3_open_loop_12v',
    name: 'Browser Demo: 12 V Motor, Open Loop (8 V average)',
    source: 'physics_engine',
    filename: 'browser_demo_12v_open_loop.csv',
    data: simulateConveyorMotor(config),
    metadata: {
      description: 'Independent 12 V averaged-voltage browser example with a 0.03 N·m load step. NOT exported from MATLAB/Simulink and NOT a PID result.',
      samplingRateHz: config.outputSampleRateHz,
      durationS: config.durationS,
      busVoltageV: config.vBus,
      torqueConstantNmPerA: config.kt,
      motorModel: '12 V Day 1–3 parameter-matched browser approximation; MATLAB/Simulink remains the source of validated results.',
      disturbanceEvent: { timeS: config.loadStepTimeS, stepTorqueNm: config.stepLoadTorqueNm },
    },
    createdAt: new Date().toISOString(),
  }];
}
