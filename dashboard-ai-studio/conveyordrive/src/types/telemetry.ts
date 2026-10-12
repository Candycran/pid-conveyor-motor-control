/**
 * ConveyorDrive - Industrial Telemetry Data Types
 */

export interface TelemetryPoint {
  time_s: number;
  reference_rpm: number | null;
  actual_rpm: number;
  measured_rpm: number;
  pwm_percent: number;
  current_a: number;
  load_torque_nm: number;
}

export interface SimulationMetadata {
  description?: string;
  samplingRateHz?: number;
  durationS?: number;
  motorRatingKw?: number;
  busVoltageV?: number;
  torqueConstantNmPerA?: number;
  motorModel?: string;
  ratedCurrentA?: number;
  ratedRpm?: number;
  controllerGains?: {
    Kp: number;
    Ki: number;
    Kd: number;
    N?: number; // Filter coefficient
  };
  conveyorParams?: {
    rollerRadiusM: number;
    beltMassKg: number;
    gearRatio: number;
  };
  disturbanceEvent?: {
    timeS: number;
    stepTorqueNm: number;
  };
}

export interface SimulationDataset {
  id: string;
  name: string;
  source: 'csv_upload' | 'physics_engine';
  filename?: string;
  data: TelemetryPoint[];
  metadata: SimulationMetadata;
  createdAt: string;
}

export interface LoadRecoveryAudit {
  hasDisturbance: boolean;
  stepTimestamp: number;
  baselineTorqueNm: number;
  stepTorqueNm: number;
  deltaTorqueNm: number;
  preDisturbanceRpm: number;
  undershootRpm: number;
  speedDipRpm: number;
  speedDipPercent: number;
  troughTimestamp: number;
  recoveryTimestamp1Pct: number | null;
  recoveryTimestamp2Pct: number | null;
  settlingTime1Pct: number | null;
  settlingTime2Pct: number | null;
  toleranceBand2Pct: {
    upper: number;
    lower: number;
    center: number;
  };
  peakRecoveryCurrentA: number;
  peakRecoveryPwmPercent: number;
  pwmSaturationDurationMs: number;
  recoverySlewRateRpmPerSec: number;
  steadyStateErrorRpm: number;
  performanceClass: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'CLASS_D';
  complianceNotes: string[];
}

export interface ControllerMetrics {
  riseTimeS: number | null;
  peakOvershootPercent: number | null;
  speedDipRpm: number | null;
  recoveryTime2PctS: number | null;
  steadyStateErrorRpm: number | null;
  iae: number | null; // Integral of Absolute Error
  itae: number | null; // Integral of Time-multiplied Absolute Error
  peakCurrentA: number;
  avgPwmPercent: number;
  energyProxy: number;
}
