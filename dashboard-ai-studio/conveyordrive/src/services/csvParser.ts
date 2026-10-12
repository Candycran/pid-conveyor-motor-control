/**
 * Industrial CSV Telemetry Parser and Exporter
 * Supports strict and flexible header mapping for DC Motor simulation runs.
 */

import { SimulationDataset, TelemetryPoint } from '../types/telemetry';

export interface CsvParseResult {
  success: boolean;
  dataset?: SimulationDataset;
  error?: string;
  warnings: string[];
  stats?: {
    rowsParsed: number;
    durationS: number;
    samplingRateHz: number;
  };
}

// Canonical required column headers
export const REQUIRED_CSV_COLUMNS = [
  'time_s',
  'actual_rpm',
  'measured_rpm',
  'pwm_percent',
  'current_a',
  'load_torque_nm',
] as const;

export function parseTelemetryCsv(csvText: string, filename = 'imported_telemetry.csv'): CsvParseResult {
  const warnings: string[] = [];

  if (!csvText || csvText.trim().length === 0) {
    return { success: false, warnings, error: 'CSV file is empty.' };
  }

  // Split lines and trim
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    return { success: false, warnings, error: 'CSV file contains insufficient rows (header + at least 1 data row required).' };
  }

  // Detect delimiter: comma, semicolon, or tab
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes(';') && !headerLine.includes(',')) {
    delimiter = ';';
  } else if (headerLine.includes('\t')) {
    delimiter = '\t';
  }

  const rawHeaders = headerLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

  // Map header indexes using fuzzy matching
  const headerMap: Record<string, number> = {};

  const findIndex = (patterns: string[]): number => {
    for (const pat of patterns) {
      const idx = rawHeaders.findIndex(h => h === pat || h.replace(/[^a-z0-9]/g, '_').includes(pat));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  headerMap.time_s = findIndex(['time_s', 'time', 't', 'timestamp', 'time_sec']);
  headerMap.reference_rpm = findIndex(['reference_rpm', 'ref_rpm', 'rpm_ref', 'target_rpm', 'w_ref']);
  headerMap.actual_rpm = findIndex(['actual_rpm', 'act_rpm', 'rpm_act', 'speed_rpm', 'motor_rpm', 'w_act']);
  headerMap.measured_rpm = findIndex(['measured_rpm', 'meas_rpm', 'rpm_meas', 'sensor_rpm', 'encoder_rpm']);
  headerMap.pwm_percent = findIndex(['pwm_percent', 'pwm', 'duty_cycle', 'duty', 'pwm_pct']);
  headerMap.current_a = findIndex(['current_a', 'current', 'ia', 'armature_current', 'i_armature']);
  headerMap.load_torque_nm = findIndex(['load_torque_nm', 'load_torque', 'torque_nm', 'tl', 'load_nm', 't_load']);

  // Check required fields
  const missingCore: string[] = [];
  if (headerMap.time_s === -1) missingCore.push('time_s');
  if (headerMap.actual_rpm === -1) missingCore.push('actual_rpm');
  if (headerMap.measured_rpm === -1) missingCore.push('measured_rpm');
  if (headerMap.pwm_percent === -1) missingCore.push('pwm_percent');
  if (headerMap.current_a === -1) missingCore.push('current_a');
  if (headerMap.load_torque_nm === -1) missingCore.push('load_torque_nm');

  if (missingCore.length > 0) {
    return {
      success: false,
      warnings,
      error: `Missing required column(s): ${missingCore.join(', ')}. Found columns: [${rawHeaders.join(', ')}]`,
    };
  }

  if (headerMap.reference_rpm === -1) {
    warnings.push('No reference_rpm supplied: open-loop data accepted. Reference-tracking metrics will be unavailable.');
  }

  const data: TelemetryPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (row.length < 2) continue; // ignore empty or broken trailing lines

    const time_s = parseFloat(row[headerMap.time_s]);
    const reference_rpm = headerMap.reference_rpm === -1 ? null :
      (row[headerMap.reference_rpm] === '' ? null : Number(row[headerMap.reference_rpm]));
    const actual_rpm = parseFloat(row[headerMap.actual_rpm]);
    const measured_rpm = parseFloat(row[headerMap.measured_rpm]); // Blank encoder readings are invalid, never silently treated as 0
    const pwm_percent = parseFloat(row[headerMap.pwm_percent]);
    const current_a = parseFloat(row[headerMap.current_a]);
    const load_torque_nm = parseFloat(row[headerMap.load_torque_nm]);

    if (
      isNaN(time_s) ||
      (reference_rpm !== null && !Number.isFinite(reference_rpm)) ||
      !Number.isFinite(actual_rpm) ||
      !Number.isFinite(measured_rpm) ||
      !Number.isFinite(pwm_percent) ||
      !Number.isFinite(current_a) ||
      !Number.isFinite(load_torque_nm)
    ) {
      warnings.push(`Row ${i + 1} skipped due to non-numeric telemetry values.`);
      continue;
    }

    data.push({
      time_s,
      reference_rpm,
      actual_rpm,
      measured_rpm,
      pwm_percent,
      current_a,
      load_torque_nm,
    });
  }

  if (data.length < 5) {
    return {
      success: false,
      warnings,
      error: `CSV parsed only ${data.length} valid telemetry rows. At least 5 data points are required.`,
    };
  }

  // Ensure chronological order and reject ambiguous duplicate time stamps.
  data.sort((a, b) => a.time_s - b.time_s);
  if (data.some((point, i) => i > 0 && point.time_s <= data[i - 1].time_s)) {
    return { success: false, warnings, error: 'Time stamps must be distinct and increasing.' };
  }

  // Calculate sampling frequency and duration
  const durationS = parseFloat((data[data.length - 1].time_s - data[0].time_s).toFixed(3));
  const avgDeltaT = durationS / (data.length - 1);
  const samplingRateHz = avgDeltaT > 0 ? Math.round(1 / avgDeltaT) : 100;

  // Find a distinct positive load step using the scale of this particular dataset.
  // The audit performs its own validation; this metadata is informational only.
  let disturbanceEvent: { timeS: number; stepTorqueNm: number } | undefined;
  const loadValues = data.map(p => p.load_torque_nm);
  const loadRange = Math.max(...loadValues) - Math.min(...loadValues);
  if (loadRange > 1e-9) {
    const threshold = Math.max(1e-9, loadRange * 0.10);
    const index = data.findIndex((p, i) =>
      i > 0 && p.load_torque_nm - data[i - 1].load_torque_nm >= threshold
    );
    if (index > 0) {
      disturbanceEvent = { timeS: data[index].time_s, stepTorqueNm: data[index].load_torque_nm };
    }
  }

  const dataset: SimulationDataset = {
    id: `import_${Date.now()}`,
    name: filename.replace(/\.[^/.]+$/, ''),
    source: 'csv_upload',
    filename,
    data,
    metadata: {
      description: `User-imported telemetry: ${data.length} records @ ~${samplingRateHz} Hz (${durationS}s duration).`,
      samplingRateHz,
      durationS,
      disturbanceEvent,
    },
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    dataset,
    warnings,
    stats: {
      rowsParsed: data.length,
      durationS,
      samplingRateHz,
    },
  };
}

/**
 * Serializes dataset to canonical CSV string format
 */
export function exportTelemetryToCsv(dataset: SimulationDataset): string {
  const header = 'time_s,reference_rpm,actual_rpm,measured_rpm,pwm_percent,current_a,load_torque_nm\n';
  const rows = dataset.data.map(p =>
    `${p.time_s},${p.reference_rpm ?? ''},${p.actual_rpm},${p.measured_rpm},${p.pwm_percent},${p.current_a},${p.load_torque_nm}`
  );
  return header + rows.join('\n');
}

/**
 * Empty Day 3 telemetry CSV template: only column headers, no invented results.
 * reference_rpm is optional for open-loop experiments.
 */
export function generateSampleCsvTemplate(): string {
  return 'time_s,actual_rpm,measured_rpm,pwm_percent,current_a,load_torque_nm\n';
}
