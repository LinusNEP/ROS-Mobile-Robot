#!/usr/bin/env python
"""
Dump ODrive state to figure out why motor calibration isn't measuring.
Run this after odrive_parameter_configuration.py
"""

import odrive

print("Connecting...")
odrv = odrive.find_any()
print(f"Serial: {odrv.serial_number}")
print(f"Firmware: {odrv.fw_version_major}.{odrv.fw_version_minor}.{odrv.fw_version_revision}")
print(f"Bus voltage: {odrv.vbus_voltage:.2f} V")
print(f"Bus current: {odrv.ibus:.2f} A")
print()

print(f"Brake resistor enabled:  {odrv.config.enable_brake_resistor}")
print(f"Brake resistance:        {odrv.config.brake_resistance} Ohm")
print(f"Undervoltage trip:       {odrv.config.dc_bus_undervoltage_trip_level} V")
print(f"Overvoltage trip:        {odrv.config.dc_bus_overvoltage_trip_level} V")
print(f"Max neg current:         {odrv.config.dc_max_negative_current} A")
print()

for i, ax in enumerate((odrv.axis0, odrv.axis1)):
    print(f"=== axis{i} ===")
    print(f"  current_state:           {ax.current_state}")
    print(f"  axis.error:              0x{ax.error:X}")
    print(f"  motor.error:             0x{ax.motor.error:X}")
    print(f"  encoder.error:           0x{ax.encoder.error:X}")
    print(f"  controller.error:        0x{ax.controller.error:X}")
    print(f"  motor.is_calibrated:     {ax.motor.is_calibrated}")
    print(f"  motor.pole_pairs:        {ax.motor.config.pole_pairs}")
    print(f"  motor.phase_resistance:  {ax.motor.config.phase_resistance}")
    print(f"  motor.phase_inductance:  {ax.motor.config.phase_inductance}")
    print(f"  motor.current_lim:       {ax.motor.config.current_lim}")
    print(f"  motor.calib_max_voltage: {ax.motor.config.resistance_calib_max_voltage}")
    print(f"  motor.calib_curr_range:  {ax.motor.config.requested_current_range}")
    print(f"  encoder.mode:            {ax.encoder.config.mode}")
    print(f"  encoder.cpr:             {ax.encoder.config.cpr}")
    print(f"  controller.control_mode: {ax.controller.config.control_mode}")
    print(f"  controller.vel_limit:    {ax.controller.config.vel_limit}")
    print()
