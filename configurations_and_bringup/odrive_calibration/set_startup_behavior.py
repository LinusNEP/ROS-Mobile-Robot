#!/usr/bin/env python
"""
Ensure ODrive startup behavior is explicit and safe.

We want:
  - Motors IDLE on power-on (no auto-arming on the ODrive side)
  - No index search (we use hall sensors, not incremental encoders)
  - No motor calibration on startup (we pre-calibrated and saved)
  - No encoder offset calibration on startup (pre-calibrated)

All of these are the factory defaults in 0.5.4, but we set them explicitly
so the config is self-documenting and survives future firmware updates.

Non-destructive: doesn't touch calibration or gains.
"""

import odrive

print("Connecting...")
odrv = odrive.find_any()
print(f"Connected. Serial: {odrv.serial_number}")

for i, ax in enumerate((odrv.axis0, odrv.axis1)):
    print(f"\n=== axis{i} ===")
    print(f"  startup_motor_calibration      : "
          f"{ax.config.startup_motor_calibration}")
    print(f"  startup_encoder_index_search   : "
          f"{ax.config.startup_encoder_index_search}")
    print(f"  startup_encoder_offset_calibration: "
          f"{ax.config.startup_encoder_offset_calibration}")
    print(f"  startup_closed_loop_control    : "
          f"{ax.config.startup_closed_loop_control}")
    print(f"  startup_sensorless_control     : "
          f"{ax.config.startup_sensorless_control}")

    # Force safe defaults.
    ax.config.startup_motor_calibration           = False
    ax.config.startup_encoder_index_search        = False
    ax.config.startup_encoder_offset_calibration  = False
    ax.config.startup_closed_loop_control         = False
    ax.config.startup_sensorless_control          = False

print("\nSaving and rebooting...")
try:
    odrv.save_configuration()
except Exception as e:
    print(f"  save raised {type(e).__name__}: {e}")
try:
    odrv.reboot()
except Exception:
    pass

print("\nDone. On next power-on both axes will boot to IDLE.")
print("Arming is now fully controlled by the Arduino + ROS.")
