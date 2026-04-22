#!/usr/bin/env python
"""
ODrive calibration for ROMR (hoverboard motors with hall sensors).

Run AFTER odrive_parameter_configuration.py, with the wheels free to spin
(robot on a stand, jacked up, or on its side). The calibration spins each
motor briefly and listens to the hall sensors.

Sequence per axis:
  1. AXIS_STATE_MOTOR_CALIBRATION          (measures R, L)
  2. AXIS_STATE_ENCODER_HALL_POLARITY_CALIBRATION
  3. AXIS_STATE_ENCODER_OFFSET_CALIBRATION (aligns hall to electrical frame)

We run axes sequentially, not in parallel, because simultaneous R/L
calibration on one board can trip current-sense limits.

References:
  https://docs.odriverobotics.com/v/0.5.4/hoverboard.html
"""

import sys
import time
import odrive
from odrive.enums import (
    AXIS_STATE_IDLE,
    AXIS_STATE_MOTOR_CALIBRATION,
    AXIS_STATE_ENCODER_HALL_POLARITY_CALIBRATION,
    AXIS_STATE_ENCODER_OFFSET_CALIBRATION,
)

# Expected electrical bounds for hoverboard motors.
# If a calibrated value falls outside, something is wrong (loose phase wire,
# wrong pole-pair count, shorted winding, etc.)
MIN_PHASE_INDUCTANCE = 0.0
MAX_PHASE_INDUCTANCE = 0.001    # H
MIN_PHASE_RESISTANCE = 0.0
MAX_PHASE_RESISTANCE = 0.5      # Ohm

# Max time we'll wait for a given calibration step to finish.
STEP_TIMEOUT_S = 30


def wait_idle(axis, timeout=STEP_TIMEOUT_S, label=""):
    """Block until axis returns to IDLE, or raise on timeout."""
    t0 = time.time()
    while axis.current_state != AXIS_STATE_IDLE:
        if time.time() - t0 > timeout:
            raise TimeoutError(
                f"{label}: axis did not return to IDLE within {timeout}s "
                f"(state={axis.current_state}, motor_err={axis.motor.error}, "
                f"enc_err={axis.encoder.error}, axis_err={axis.error})"
            )
        time.sleep(0.2)


def check_motor(axis, label):
    """Validate a motor calibration result. Exits on failure."""
    if axis.motor.error != 0:
        print(f"{label}: motor error 0x{axis.motor.error:X}")
        print(axis.motor)
        sys.exit(1)

    L = axis.motor.config.phase_inductance
    R = axis.motor.config.phase_resistance
    if not (MIN_PHASE_INDUCTANCE < L < MAX_PHASE_INDUCTANCE):
        print(f"{label}: phase inductance {L} H out of range "
              f"[{MIN_PHASE_INDUCTANCE}, {MAX_PHASE_INDUCTANCE}]")
        sys.exit(1)
    if not (MIN_PHASE_RESISTANCE < R < MAX_PHASE_RESISTANCE):
        print(f"{label}: phase resistance {R} Ohm out of range "
              f"[{MIN_PHASE_RESISTANCE}, {MAX_PHASE_RESISTANCE}]")
        sys.exit(1)

    if not axis.motor.is_calibrated:
        print(f"{label}: motor.is_calibrated is False after calibration.")
        sys.exit(1)

    print(f"{label}: motor OK (R={R:.4f} Ohm, L={L*1e6:.1f} uH)")


def check_encoder(axis, label):
    """Validate an encoder calibration result. Exits on failure."""
    if axis.encoder.error != 0:
        print(f"{label}: encoder error 0x{axis.encoder.error:X}")
        print(axis.encoder)
        sys.exit(1)
    if not axis.encoder.is_ready:
        print(f"{label}: encoder.is_ready is False after calibration.")
        sys.exit(1)
    print(f"{label}: encoder OK "
          f"(phase_offset={axis.encoder.config.phase_offset}, "
          f"hall_polarity={axis.encoder.config.hall_polarity})")


def calibrate_axis(axis, label):
    """Run the three calibration states on one axis."""
    print(f"\n--- {label}: motor calibration (R, L) ---")
    axis.requested_state = AXIS_STATE_MOTOR_CALIBRATION
    wait_idle(axis, label=f"{label} motor")
    check_motor(axis, label)
    axis.motor.config.pre_calibrated = True

    print(f"--- {label}: hall polarity calibration ---")
    axis.requested_state = AXIS_STATE_ENCODER_HALL_POLARITY_CALIBRATION
    wait_idle(axis, label=f"{label} hall polarity")
    if axis.encoder.error != 0:
        print(f"{label}: hall polarity error 0x{axis.encoder.error:X}")
        print(axis.encoder)
        sys.exit(1)

    print(f"--- {label}: encoder offset calibration ---")
    axis.requested_state = AXIS_STATE_ENCODER_OFFSET_CALIBRATION
    wait_idle(axis, label=f"{label} encoder offset")
    check_encoder(axis, label)
    axis.encoder.config.pre_calibrated = True


def main():
    ack = input("Are the wheels free to spin (robot on a stand)? Type YES: ")
    if ack.strip() != "YES":
        print("Aborting for safety.")
        sys.exit(0)

    print("Connecting to ODrive...")
    odrv0 = odrive.find_any()
    print("ODrive found. Serial:", odrv0.serial_number)

    # Make sure you're starting from IDLE on both axes.
    odrv0.axis0.requested_state = AXIS_STATE_IDLE
    odrv0.axis1.requested_state = AXIS_STATE_IDLE
    time.sleep(0.5)

    # Clear any latched errors from a previous attempt.
    try:
        odrv0.clear_errors()
    except AttributeError:
        # Older firmware: clear per-subsystem.
        for ax in (odrv0.axis0, odrv0.axis1):
            ax.error = 0
            ax.motor.error = 0
            ax.encoder.error = 0
            ax.controller.error = 0

    calibrate_axis(odrv0.axis0, "axis0")
    calibrate_axis(odrv0.axis1, "axis1")

    print("\nSaving configuration and rebooting...")
    try:
        odrv0.save_configuration()
    except Exception as e:
        print(f"  save_configuration raised {type(e).__name__}: {e}")
    try:
        odrv0.reboot()
    except Exception:
        # USB connection always drops on reboot; that's normal.
        pass

    print("\nCalibration complete. ODrive is ready for ROMR.")
    print("Both axes saved in velocity-control mode, pre_calibrated=True.")


if __name__ == "__main__":
    main()
