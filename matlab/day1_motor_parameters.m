
% PROJECT 3: PID Conveyor Motor Control
% DAY 1: Basic DC Motor Parameters
% Values are initial modelling assumptions.

% Supply and test voltage (V)
V_supply = 12;
V_test = 8;

% Motor electrical parameters
R = 2;          % Resistance (ohms)
L = 0.01;       % Inductance (H)

% Motor mechanical parameters
J = 0.0001;     % Inertia (kg.m^2)
b = 0.00001;    % Viscous friction (N.m.s/rad)

% Motor constants
Kt = 0.05;      % Torque constant (N.m/A)
Ke = 0.05;      % Back-EMF constant (V.s/rad)

% Initial external load
T_load = 0;     % Load torque (N.m)

% Conversion factor
rad_to_rpm = 60 / (2*pi);

% Expected steady-state speed at zero load
omega_ss = (Kt * V_test) / (R*b + Kt*Ke);
rpm_ss = omega_ss * rad_to_rpm;

fprintf('Expected no-load RPM: %.2f\n', rpm_ss);


% DAY 2: PWM Configuration

duty_percent = 100 * (V_test / V_supply);

pwm_frequency_hz = 500;

pwm_period_s = 1 / pwm_frequency_hz;

fprintf('PWM Duty Cycle: %.2f%%\n', duty_percent);
fprintf('PWM Frequency: %.0f Hz\n', pwm_frequency_hz);

