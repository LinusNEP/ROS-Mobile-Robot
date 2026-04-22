# ROMR ODrive Calibration & Bringup

This directory contains everything needed to bring a ROMR mobile robot online:
a hoverboard-motor robot driven by an ODrive v3.6 (firmware 0.5.4), with an
Arduino Mega handling low-level control and a Jetson Nano running ROS.

The workflow is: configure parameters, calibrate motors and halls, verify
operation over USB, wire up the Arduino, then stack ROS on top. Each step is
independent and builds on the last.

---

## Hardware

- **ODrive 3.6** (24 V or 56 V variant) with firmware 0.5.4
- **Two hoverboard hub motors** with 15 pole pairs and 3 hall sensors each
- **Arduino Mega 2560**
- **Jetson Nano** running Ubuntu 18.04 + ROS 1 Melodic (or compatible e.g., Laptop or Mini-PCs: ROS Noetic and ROS 2)
- **36 V Li-ion battery pack** (10S), optionally with brake resistor
- **RC transmitter/receiver** with at least 3 channels (for RC control)
- **Android device** with the ROS-Mobile app (for WiFi teleop)

If your setup differs e.g., different ODrive board, different motors, different
battery, then the constants at the top of `odrive_parameter_configuration.py`
**must be reviewed** before running. Voltage trip levels in particular are
safety-critical: wrong values either prevent motor start or fault on the first
hard brake.

---

## File overview

### Python — ODrive host scripts

| File | Purpose |
|---|---|
| `odrive_parameter_configuration.py` | Erases all ODrive config and applies ROMR parameters. Run **once** initially, or after firmware changes. |
| `odrive_calibration.py` | Calibrates both motors (R/L) and hall encoders. Run after parameter configuration. |
| `odrive_diagnose.py` | Reads all relevant ODrive state. Non-destructive. Use for troubleshooting. |
| `test_halls.py` | Validates hall sensor wiring by watching `hall_state` while you rotate wheels by hand. |
| `fix_hall_pullups.py` | Non-destructive fix if hall GPIOs are stuck in plain `DIGITAL` mode instead of `DIGITAL_PULL_UP`. |
| `enable_uart.py` | Enables UART A on the ODrive for Arduino communication. Non-destructive. |
| `set_startup_behavior.py` | Explicitly ensures the ODrive boots to IDLE and does not auto-arm. Non-destructive. |

### Arduino — low-level firmware

| File | Purpose |
|---|---|
| `rc_remote_control.ino` | RC teleoperation sketch. Reads 3 PWM channels, commands the ODrive over UART. Includes signal-loss failsafe and stick deadband. |
| `ros_mobile_control.ino` | ROS-compatible sketch. Subscribes to `/cmd_vel` and `/robot/arm`, publishes `/wheel_vel` for host-side odometry. |
| `gesture_handheld.ino` | Handheld transmitter: MPU6050 IMU → nRF24L01+. Maps tilt to velocity commands. Arm button must be held. |
| `gesture_receiver.ino` | Robot-side receiver: nRF24L01+ → ODrive. Standalone, no ROS required. |

### ROS — host-side (Jetson Nano)

| File | Purpose |
|---|---|
| `romr_odom_node.py` | Integrates `/wheel_vel` into `/odom` + TF. |
| `cmd_vel_watchdog.py` | Forwards `/cmd_vel_raw` → `/cmd_vel`, zeroing on input loss. Safety-critical for WiFi teleop. |
| `romr_bringup.launch` | Launches rosserial, odom node, and watchdog together. |
| `romr.service` | Optional systemd unit for auto-start on boot. |

---

## Safety rules — read first

1. **Always put the robot on a stand with wheels off the ground** until all
   bringup and directionality tests are complete. The robot moving
   unexpectedly is genuinely dangerous.
2. **Do not skip the failsafe test** (step 9 in RC bringup below). If a
   signal-loss disarm fails, the robot will not stop when you lose the
   transmitter, and at some point you will.
3. **Know where the physical power switch is.** `Ctrl-C` is not a safety
   mechanism.
4. **Keep a hand near the e-stop / battery disconnect during first runs**,
   especially for the first time under its own weight.

---

## Bringup sequence

### 1. Install prerequisites

On the host machine (your laptop or the Jetson, wherever you'll run
configuration from):

```bash
pip3 install --user odrive==0.5.4
```

The exact version matters, ODrive tool API shifted between 0.5.x and 0.6.x.
Scripts here target 0.5.4.

Verify:

```bash
odrivetool --version
```

### 2. Parameter configuration

Connect the ODrive to the host via USB. No motors need to be spinning. This
step just writes constants to flash.

```bash
python3 odrive_parameter_configuration.py
```

**This erases any existing ODrive configuration.** You should run this exactly
once at the start of the bringup process, or whenever you change firmware or
hardware. Do not rerun it casually. It wipes motor and encoder calibration
and you'll have to redo those.

Expected output ends with:

```
Done. Now run odrive_calibration.py with wheels free to spin.
```

The `ObjectLostError` during save is normal. USB drops when the ODrive
reboots.

**Review the constants at the top of the script before running** if your
hardware differs from the ROMR defaults. The ones most likely to need tuning:

| Constant | Default | When to change |
|---|---|---|
| `DC_BUS_OVERVOLTAGE` | 48.0 | Match your ODrive variant (24 V board: 28; 56 V board: 56) |
| `DC_BUS_UNDERVOLTAGE` | 30.0 | Lower for smaller battery, higher for larger |
| `BRAKE_RESISTANCE_OHMS` | 0.5 | Whatever resistor you actually have |
| `ENABLE_BRAKE_RESISTOR` | True | False if none wired |
| `VEL_LIMIT` | 3.0 turns/s | Starts conservative; raise once trusted |
| `CURRENT_LIM` | 20.0 A | Motor-dependent |

### 3. Calibration

With the robot on a stand, both wheels free to spin:

```bash
python3 odrive_calibration.py
```

You'll be prompted to confirm with `YES` (case-sensitive). The script then
runs, sequentially on each axis:

1. **Motor calibration** — a short beep. Measures phase resistance and
   inductance.
2. **Hall polarity calibration** — brief wheel motion.
3. **Encoder offset calibration** — longer wheel motion, ~150 rad scan.

Total time: 60–90 seconds.

Expected healthy values for hoverboard motors: phase resistance 0.15–0.25 Ω,
inductance 300–500 µH. Both axes should end with `encoder OK` and the run
should save successfully.

#### If calibration fails

| Symptom | Cause | Fix |
|---|---|---|
| `phase inductance 0.0` | Motor cal didn't run. Bad phase wire, undervoltage, or motor not connected | Check phase wires; verify `vbus_voltage` with `odrive_diagnose.py` |
| `encoder error 0x200` (illegal hall state) | Hall wiring, stuck hall, or EMI during motion | Run `test_halls.py`; check 5 V to halls; try re-running |
| `motor error 0x40` (phase resistance out of range) | One phase wire with high contact resistance | Reseat phase connectors |
| Script exits before axis 1 | Axis 0 failed; script aborts on first error | Fix axis 0 first, rerun |
| Halls frozen at single value in `test_halls.py` | GPIO modes wrong (plain `DIGITAL` instead of `DIGITAL_PULL_UP`) | Run `fix_hall_pullups.py` |

A flaky first-attempt failure that succeeds on retry with no changes usually
indicates marginal EMI on hall lines. It'll work, but consider physically
routing hall cables away from phase wires if it keeps recurring.

### 4. Verify calibration via Python (mandatory before Arduino)

Do not skip this. With the robot still on a stand:

```python
import odrive, time
from odrive.enums import AXIS_STATE_CLOSED_LOOP_CONTROL, AXIS_STATE_IDLE

odrv0 = odrive.find_any()

odrv0.axis0.requested_state = AXIS_STATE_CLOSED_LOOP_CONTROL
odrv0.axis1.requested_state = AXIS_STATE_CLOSED_LOOP_CONTROL
time.sleep(0.5)

odrv0.axis0.controller.input_vel = 0.5
odrv0.axis1.controller.input_vel = 0.5
time.sleep(3)

odrv0.axis0.controller.input_vel = 0
odrv0.axis1.controller.input_vel = 0
time.sleep(0.5)
odrv0.axis0.requested_state = AXIS_STATE_IDLE
odrv0.axis1.requested_state = AXIS_STATE_IDLE
```

Both wheels should spin smoothly for 3 seconds. Watch for:
- Smooth rotation (no grinding, no shaking)
- No errors — check with `dump_errors(odrv0)` in `odrivetool`
- Consistent speed between the two wheels

Which direction they spin doesn't matter yet. The Arduino sketches correct
for that via `M0_DIRECTION` / `M1_DIRECTION`.

### 5. Enable UART for Arduino

```bash
python3 enable_uart.py
```

Non-destructive; just turns on UART A and sets the baudrate to 115200.

### 6. Wire the Arduino Mega to the ODrive

Power off both devices first.

| Mega | ODrive v3.6 |
|---|---|
| Pin 16 (TX2) | GPIO 1 |
| Pin 17 (RX2) | GPIO 2 |
| GND | GND |

**The ground wire is not optional.** Missing common ground is the #1 cause of
"everything looks right but no communication." The ODrive and Mega are
separately powered; the ground wire gives their UART signals a shared
reference.

The Mega gets its power from USB (during development) or a 7–12 V barrel jack
(in the field). The ODrive gets its power from the main battery. Do not try
to power one from the other.

### 7. RC bringup

See the `rc_remote_control.ino` header comments for RC receiver wiring:
- CH1 (steering) → pin 2
- CH2 (throttle) → pin 3
- CH3 (arm/disarm) → pin 18

Full bringup steps:

1. Transmitter **off**, arm switch in disarmed position.
2. Power up the ODrive, then plug USB into the Mega.
3. Open Arduino Serial Monitor at 115200 baud. Should see:
   `ROMR RC control ready. Flip arm switch to enable motors.`
4. Turn on transmitter. Watch `th`, `st`, `md` values respond to stick
   movement. `md` ≈ 1000 when arm switch is down, ≈ 2000 when up.
5. Flip arm switch. Should see `ARM: closed-loop control` in the log.
6. Gently push throttle. Check wheel direction:
   - Both forward → good
   - Both backward → flip both `M*_DIRECTION` signs
   - One each way → flip the one going wrong
7. Test steering: with throttle centered, move steering stick. Wheels should
   counter-rotate.
8. **Failsafe test:** with arm on and throttle pushed, turn the transmitter
   off. Within 300 ms wheels must stop and log shows `DISARM: idle`.

Only after step 8 passes should you put wheels on the ground.

### 8. ROS bringup on Jetson Nano

First, set up ROS networking. In `~/.bashrc` on the Nano:

```bash
export ROS_MASTER_URI=http://<nano-ip>:11311
export ROS_IP=<nano-ip>
```

Replace `<nano-ip>` with the actual LAN IP (e.g. `192.168.1.42`). The numeric
IP is important — hostname resolution from Android is unreliable.

Flash `ros_mobile_control.ino` to the Mega (replaces the RC sketch). Then on
the Nano:

```bash
roslaunch romr_bringup romr_bringup.launch
```

**Motors stay IDLE after launch.** You must arm explicitly.

In the ROS-Mobile app on your phone (same WiFi):

1. Master tab → set Master URI to `http://<nano-ip>:11311`, Master IP to
   `<nano-ip>` → Connect.
2. Dashboard → add a **Joystick** widget: topic `/cmd_vel_raw`, type
   `geometry_msgs/Twist`, axes mapped to `linear.x` (fwd/back) and
   `angular.z` (turn).
3. Dashboard → add a **Button** widget as a dead-man switch: topic
   `/robot/arm`, type `std_msgs/Bool`, on-press value `true`, on-release
   value `false`. Motors arm while the button is held and disarm when you
   release — this is the safest arming pattern for teleop.
4. Optionally add a **Logger** widget on `/robot/armed` and `/odom` to see
   feedback.

You can also arm/disarm from the Nano shell:
```bash
rostopic pub -1 /robot/arm std_msgs/Bool "data: true"
rostopic pub -1 /robot/arm std_msgs/Bool "data: false"
```

**Three layers of safety protect you:**

1. **Explicit arming**: motors won't spin until you publish `true` on
   `/robot/arm`. No boot-time or launch-time auto-arm anywhere.
2. **Arduino-side cmd_vel watchdog**: if `/cmd_vel` stops arriving for 500 ms
   while armed, the Arduino disarms the ODrive itself. Protects against
   rosserial hangs.
3. **Host-side cmd_vel_watchdog**: forwards `/cmd_vel_raw` → `/cmd_vel` and
   publishes zeros when the raw input goes silent. Protects against the
   app crashing or the phone losing WiFi.

You can verify arming works by watching `/robot/armed` — it should go true
within ~100 ms of publishing `true` on `/robot/arm`.

### 9. Optional: gesture control (third teleop mode)

An alternative teleop option that works independently of ROS and WiFi.
Uses a handheld Arduino with an MPU6050 IMU and nRF24L01+ radio to send
tilt-derived velocity commands directly to the robot's Arduino.

**Hardware on the handheld side:**
- Arduino Uno / Nano / Pro Mini
- MPU6050 IMU on I2C (SDA=A4, SCL=A5)
- nRF24L01+ on SPI (MOSI=11, MISO=12, SCK=13, CE=7, CSN=8)
- Momentary push button between pin 2 and GND (arm button)
- 3.3 V power for the nRF24 — do NOT power it from the Arduino's 5 V
  rail, use a regulator or a dedicated 3.3 V supply
- Small LiPo or AA pack

**Hardware on the robot side:**
- A second nRF24L01+ plugged into the Mega's SPI bus
  (MOSI=51, MISO=50, SCK=52, CE=9, CSN=10)
- Flash `gesture_receiver.ino` to the Mega (replaces RC or ROS sketch)

**Bringup:**

1. Flash `gesture_handheld.ino` to the handheld Arduino. On boot it
   calibrates the gyro (hold still for ~2 seconds, LED solid during cal).
2. Flash `gesture_receiver.ino` to the robot Mega.
3. Open Arduino Serial Monitor at 115200 on the robot side. You should
   see `lin=0.00 ang=0.00 arm=0 armed=0 age=...ms pkt#=N`. If `pkt#`
   increments and `age` stays below ~100 ms, the link is working.
4. Robot still on a stand. Hold the handheld level, press and HOLD the
   arm button. You should see `arm=1` and `armed=1` on the robot serial.
5. Gently tilt the handheld nose-down. Robot should drive forward.
   Tilt right → robot turns right. Release the arm button → motors
   disarm immediately.
6. **Failsafe test:** with motors armed, power off the handheld while
   holding the button. Within 300 ms the robot should disarm.

**Adjusting feel:**
- `MAX_LIN_VEL`, `MAX_ANG_VEL`: top speeds at full tilt
- `TILT_DEADBAND_DEG`: how much slack around level before motion starts
- `TILT_MAX_DEG`: tilt angle where you hit top speed
- `INVERT_PITCH`, `INVERT_ROLL`: flip either axis if mounting is different

**Note:** the handheld and robot must use matching `RADIO_ADDRESS` and
`RADIO_CHANNEL`. If you build multiple ROMRs, give each pair a unique
address.

### 10. Optional: headless auto-start

Once the manual launch is stable, install the systemd service:

```bash
sudo cp romr.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable romr.service
sudo systemctl start romr.service
```

Check status with `systemctl status romr` and live logs with
`journalctl -u romr -f`. Review the `User=`, paths, and environment in
`romr.service` before enabling.

---

## Troubleshooting

**Arduino is flashing but motors don't respond.** Verify UART wiring (TX on
one end → RX on the other, not TX→TX) and common ground. Test communication
independently: from `odrivetool`, confirm `odrv0.axis0.error == 0` and
`dump_errors(odrv0)` shows nothing. Then try a basic UART loopback test
before involving the ODrive.

**ROS-Mobile app connects but `/cmd_vel_raw` is empty.** The Android app's
rosjava stack needs the numeric `ROS_IP` set on the Nano — hostname won't
work. `rostopic list` should show the topic even before the app moves the
stick; if not, check firewall on the Nano (`sudo ufw status`; disable or
open port 11311 and TCPROS range).

**Robot moves but odom drifts badly.** Some drift is expected from wheel-based
odometry (no IMU fusion). Excessive drift usually means `wheel_base` is
wrong in `romr_odom_node.py`, or the motor velocity scaling in the sketch is
off. Verify by commanding 1 m/s forward, driving in a straight line, and
checking that `/odom` reports ~1 m/s.

**Calibration keeps failing with illegal hall state despite pullups being
correct.** It's likely physical EMI. Solutions in order of effort: enable
`ignore_illegal_hall_state = True` (via `retry_axis1.py`); route hall cables
away from motor phase wires; shorten hall cables; add a ferrite bead; use
shielded cable for halls.

**The ODrive loses USB connection during save.** Normal. Every
`save_configuration()` call triggers a reboot to commit flash, and USB drops
for ~2 seconds. The script's `ObjectLostError` / "disappeared" message is
expected.

---

## Recovering from a bad state

If something goes wrong and you're unsure what's in the ODrive's flash:

```bash
python3 odrive_diagnose.py
```

Gives you a full dump of config and error state. From there:

- Any `motor.error` or `encoder.error` → run `odrive_calibration.py` again
- Any `axis.error` that won't clear → power cycle and try again
- Wrong pole_pairs, cpr, or control_mode → rerun
  `odrive_parameter_configuration.py` (wipes calibration, but recovers
  known-good config)
- Truly stuck → `odrv0.erase_configuration()` in odrivetool, then restart
  the bringup sequence from step 2

---

## Acknowledgement

Calibration script structure inspired by the ODrive hoverboard tutorial
(docs.odriverobotics.com) and Austin Owens' robodog config. ROS-Mobile app
by Nils Rottmann. ROMR platform by Linus Nwankwo.
