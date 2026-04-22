#!/usr/bin/env python
"""
Fix hall GPIO pins to use internal pullups. Non-destructive:
does NOT erase existing motor calibration.

Hall sensors are open-drain; without pullups, the signals float and the
ODrive reads stuck/random values.
"""

import time
import odrive
from odrive.enums import GPIO_MODE_DIGITAL_PULL_UP

print("Connecting...")
odrv = odrive.find_any()
print(f"Connected. Serial: {odrv.serial_number}")

# Hall GPIO pins on ODrive v3.6 with the standard hoverboard wiring:
#   axis0 -> GPIO 9, 10, 11
#   axis1 -> GPIO 3, 4, 5
HALL_PINS = (9, 10, 11, 3, 4, 5)

print("Before:")
for pin in HALL_PINS:
    mode = getattr(odrv.config, f"gpio{pin}_mode")
    print(f"  gpio{pin}_mode = {mode}")

print("Setting all hall pins to GPIO_MODE_DIGITAL_PULL_UP...")
for pin in HALL_PINS:
    setattr(odrv.config, f"gpio{pin}_mode", GPIO_MODE_DIGITAL_PULL_UP)

print("After:")
for pin in HALL_PINS:
    mode = getattr(odrv.config, f"gpio{pin}_mode")
    print(f"  gpio{pin}_mode = {mode}")

print("Saving and rebooting (ODrive will disappear from USB briefly)...")
try:
    odrv.save_configuration()
except Exception as e:
    print(f"  save raised {type(e).__name__}: {e}  (usually normal)")
try:
    odrv.reboot()
except Exception:
    pass

time.sleep(3)
print("Done. Now rerun test_halls.py and rotate each wheel.")
