#!/usr/bin/env python
"""
ODrive parameter configuration for ROMR (hoverboard motors).

This should be run ONCE before odrive_calibration.py, or whenever you change the
mechanical/electrical setup. Sets all non-calibrated parameters: pole pairs,
encoder mode, GPIO pins, gains, limits, control mode.

Target: ODrive v3.6 (24V or 56V) with two hoverboard hub motors and hall sensors.
Firmware: 0.5.4+ (uses the newer config API).

References:
  https://docs.odriverobotics.com/v/0.5.4/hoverboard.html
"""

import sys
import time
import odrive
from odrive.enums import (
    ENCODER_MODE_HALL,
    GPIO_MODE_DIGITAL,
    CONTROL_MODE_VELOCITY_CONTROL,
    INPUT_MODE_VEL_RAMP,
    AXIS_STATE_IDLE,
)

# ---------- Robot-specific values. Tune these. ----------

# Battery pack: 36 V nominal Li-ion (10S). Full charge ~42 V.
# Leave headroom for regen above full-charge voltage.
DC_BUS_UNDERVOLTAGE = 30.0       # cut out well above cell damage
DC_BUS_OVERVOLTAGE  = 48.0       # 24V board: use 28. 56V board: 56 is fine.

# Brake resistor. If you have one wired, set its actual resistance.
# If you don't have one, set ENABLE_BRAKE_RESISTOR = False and be aware
# you cannot regen-brake safely.
ENABLE_BRAKE_RESISTOR = True
BRAKE_RESISTANCE_OHMS = 0.5      # ODrive-supplied resistor
DC_MAX_NEGATIVE_CURRENT = -8.0   # max regen current into battery

# Hoverboard motor electrical params
HOVERBOARD_KV        = 16.0
POLE_PAIRS           = 15
TORQUE_CONSTANT      = 8.27 / HOVERBOARD_KV   # ~0.517 Nm/A (estimate)
CURRENT_LIM          = 20.0      # A, peak. Hoverboard motors tolerate 20-30A bursts.
CALIB_MAX_VOLTAGE    = 4.0       # voltage during resistance calibration
CALIB_CURRENT_RANGE  = 25.0      # A; sense-gain range
CURRENT_CTRL_BW      = 100.0     # Hz; lower than default for high-L motors

# Hall encoder params
ENC_CPR              = POLE_PAIRS * 6   # 90 counts/rev
ENC_BANDWIDTH        = 100              # Hz; low because hall is coarse
CALIB_SCAN_DISTANCE  = 150              # rad; larger -> better hall offset fit

# Velocity loop
VEL_LIMIT            = 3.0       # turns/sec. Start conservative (~1.5 m/s).
                                 # Raise to 6-8 if you want faster speed.
VEL_GAIN             = 0.02 * TORQUE_CONSTANT * ENC_CPR
VEL_INTEGRATOR_GAIN  = 0.1  * TORQUE_CONSTANT * ENC_CPR

# --------------------------------------------------------


def configure_axis(ax):
    """Apply motor/encoder/controller parameters to one axis."""
    ax.motor.config.pole_pairs               = POLE_PAIRS
    ax.motor.config.torque_constant          = TORQUE_CONSTANT
    ax.motor.config.resistance_calib_max_voltage = CALIB_MAX_VOLTAGE
    ax.motor.config.requested_current_range  = CALIB_CURRENT_RANGE
    ax.motor.config.current_control_bandwidth = CURRENT_CTRL_BW
    ax.motor.config.current_lim              = CURRENT_LIM

    ax.encoder.config.mode               = ENCODER_MODE_HALL
    ax.encoder.config.cpr                = ENC_CPR
    ax.encoder.config.bandwidth          = ENC_BANDWIDTH
    ax.encoder.config.calib_scan_distance = CALIB_SCAN_DISTANCE

    ax.controller.config.vel_limit            = VEL_LIMIT
    ax.controller.config.vel_gain             = VEL_GAIN
    ax.controller.config.vel_integrator_gain  = VEL_INTEGRATOR_GAIN
    ax.controller.config.control_mode         = CONTROL_MODE_VELOCITY_CONTROL
    ax.controller.config.input_mode           = INPUT_MODE_VEL_RAMP
    ax.controller.config.vel_ramp_rate        = 2.0   # turns/sec^2, smoother starts

    # Start in IDLE; calibration script will move through states explicitly.
    ax.requested_state = AXIS_STATE_IDLE


def main():
    print("Connecting to ODrive...")
    odrv0 = odrive.find_any()
    print("ODrive found. Serial:", odrv0.serial_number)

    # Erase any existing config so we start from a known state.
    print("Erasing existing configuration...")
    try:
        odrv0.erase_configuration()
    except Exception:
        pass  # USB drops during erase; expected.

    # Reconnect after the erase/reboot.
    time.sleep(2)
    print("Reconnecting...")
    odrv0 = odrive.find_any()

    # ---- Board-level config ----
    odrv0.config.dc_bus_undervoltage_trip_level = DC_BUS_UNDERVOLTAGE
    odrv0.config.dc_bus_overvoltage_trip_level  = DC_BUS_OVERVOLTAGE
    odrv0.config.dc_max_negative_current        = DC_MAX_NEGATIVE_CURRENT
    odrv0.config.enable_brake_resistor          = ENABLE_BRAKE_RESISTOR
    if ENABLE_BRAKE_RESISTOR:
        odrv0.config.brake_resistance = BRAKE_RESISTANCE_OHMS

    # GPIO for hall sensors (ODrive v3.6 pinout per docs):
    #   Axis 0 hall -> GPIO 9, 10, 11
    #   Axis 1 hall -> GPIO 3, 4, 5
    for pin in (9, 10, 11, 3, 4, 5):
        setattr(odrv0.config, f"gpio{pin}_mode", GPIO_MODE_DIGITAL)

    # ---- Per-axis config ----
    print("Configuring axis 0...")
    configure_axis(odrv0.axis0)
    print("Configuring axis 1...")
    configure_axis(odrv0.axis1)

    # ---- Save + reboot ----
    print("Saving configuration and rebooting...")
    try:
        odrv0.save_configuration()
    except Exception as e:
        print(f"  save_configuration raised {type(e).__name__} (often normal): {e}")
    try:
        odrv0.reboot()
    except Exception:
        pass  # reboot always drops USB; expected.

    print("\nDone. Now run odrive_calibration.py with wheels free to spin.")


if __name__ == "__main__":
    main()
