#!/usr/bin/env python
"""
Hall sensor test. Run this with motors in IDLE and slowly rotate each
wheel BY HAND through one full revolution.

A healthy hall sensor setup will cycle through all 6 legal states:
    1 (001), 3 (011), 2 (010), 6 (110), 4 (100), 5 (101)
(order depends on direction, but you should see exactly those 6 values,
each multiple times per revolution)

Bad signs:
    - State 0 (000) or 7 (111) ever appears  -> disconnected/broken hall
    - Only 3 or 4 unique states seen         -> one hall stuck or dead
    - State stays constant when rotating     -> dead power (red/black wire)
"""

import time
import odrive

print("Connecting...")
odrv = odrive.find_any()
print(f"Connected. Serial: {odrv.serial_number}")
print()
print("Put both wheels in IDLE and rotate SLOWLY by hand.")
print("Watching for 20 seconds. Ctrl-C to stop early.")
print()
print(f"{'t(s)':>6}  {'ax0_hall':>10}  {'ax1_hall':>10}")

seen0 = set()
seen1 = set()
t0 = time.time()

try:
    while time.time() - t0 < 20.0:
        h0 = odrv.axis0.encoder.hall_state
        h1 = odrv.axis1.encoder.hall_state
        seen0.add(h0)
        seen1.add(h1)
        print(f"{time.time()-t0:6.2f}  {h0:>10}  {h1:>10}")
        time.sleep(0.1)
except KeyboardInterrupt:
    pass

print()
print(f"axis0 saw states: {sorted(seen0)}  ({len(seen0)} unique)")
print(f"axis1 saw states: {sorted(seen1)}  ({len(seen1)} unique)")
print()
for label, seen in (("axis0", seen0), ("axis1", seen1)):
    if 0 in seen:
        print(f"  {label}: saw state 0 (000) -> disconnected hall wire or dead 5V")
    if 7 in seen:
        print(f"  {label}: saw state 7 (111) -> disconnected hall wire or pullup stuck")
    if len(seen) < 6 and 0 not in seen and 7 not in seen:
        print(f"  {label}: only {len(seen)} states (expected 6). "
              "Rotate further, or a hall is stuck.")
    if seen == {1, 2, 3, 4, 5, 6}:
        print(f"  {label}: HALLS OK (all 6 legal states seen)")
