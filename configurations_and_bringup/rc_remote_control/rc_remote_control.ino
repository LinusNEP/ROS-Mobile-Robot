/*
  ROMR RC teleoperation.

  Receives PWM from an RC receiver on three channels:
    CH1 (pin 2)  - steering  (1000-2000 us, 1500 = center)
    CH2 (pin 3)  - throttle  (1000-2000 us, 1500 = center)
    CH3 (pin 18) - arm/disarm (>1500 us = arm motors)

  Commands the ODrive over Serial2 at 115200 baud. ODrive must be
  pre-configured for velocity control (see odrive_parameter_configuration.py).

  Safety features:
    - Signal-loss watchdog on all three channels. If any channel stops
      updating for FAILSAFE_TIMEOUT_MS, motors are forced to IDLE and zero
      velocity is commanded.
    - ISR-shared variables are marked volatile and read atomically.
    - Stick deadband around center eliminates creep from PWM drift.
    - Output slew limiting prevents step-change velocity commands.

  Tune CH1/CH2 pins per your wiring; pins 2, 3, 18 are valid external
  interrupt pins on Arduino Mega (INT0, INT1, INT3). On a Uno, pin 18
  does not exist.
*/

#include <ODriveArduino.h>
#include <Metro.h>

// --- Pin assignments ---
#define CH1_PIN      2      // steering
#define CH2_PIN      3      // throttle
#define CH3_PIN     18      // arm/disarm
#define LED_PIN     13

// --- Motor direction (flip if a wheel spins backward) ---
#define M0_DIRECTION (-1)
#define M1_DIRECTION ( 1)

// --- Control tuning ---
// Output = kp * (pwm_us - 1500). PWM range is typically +/- 500 us,
// so max output = 500 * kp in ODrive velocity units (turns/sec).
// kp = 0.004 -> ~2 turns/sec top speed. Start small, raise once trusted.
#define KP_THROTTLE   0.004f
#define KP_STEERING   0.003f

// Stick deadband in microseconds around 1500 center.
#define STICK_DEADBAND_US 20

// Max change in commanded velocity per control tick (turns/sec per tick).
// At 100 Hz control (10 ms tick) and 0.05 slew, full-range accel takes 0.4 s.
#define VEL_SLEW_PER_TICK 0.05f

// --- PWM thresholds ---
#define PWM_CENTER        1500
#define ARM_THRESHOLD     1500    // CH3 > this means armed
#define PWM_MIN_VALID      900    // below this = invalid/signal lost
#define PWM_MAX_VALID     2100    // above this = invalid/signal lost

// --- Timing (ms) ---
#define BLINK_INTERVAL_MS      200
#define DISPLAY_INTERVAL_MS     50
#define CONTROL_INTERVAL_MS     10     // 100 Hz control loop
#define ARM_INTERVAL_MS         50
#define FAILSAFE_TIMEOUT_MS    300     // must see edges on all channels within this

// --- Baud rates ---
#define PC_BAUD        115200
#define ODRIVE_BAUD    115200

// --- ISR-shared variables: MUST be volatile ---
volatile int steering_us = PWM_CENTER;
volatile int throttle_us = PWM_CENTER;
volatile int mode_us     = 0;

volatile unsigned long ch1_last_edge_ms = 0;
volatile unsigned long ch2_last_edge_ms = 0;
volatile unsigned long ch3_last_edge_ms = 0;

// --- State ---
bool motors_armed = false;
float cmd_right = 0.0f;
float cmd_left  = 0.0f;

ODriveArduino odrive(Serial2);

Metro blink_timer   (BLINK_INTERVAL_MS);
Metro display_timer (DISPLAY_INTERVAL_MS);
Metro control_timer (CONTROL_INTERVAL_MS);
Metro arm_timer     (ARM_INTERVAL_MS);

// ------------------ ISRs ------------------
// Each ISR records the most recent rising edge time and computes the pulse
// width on the falling edge. We also stamp a "last edge" time in ms so the
// main loop can detect signal loss.

void isr_ch1() {
  static unsigned long rise_us = 0;
  if (digitalRead(CH1_PIN)) {
    rise_us = micros();
  } else {
    steering_us = (int)(micros() - rise_us);
  }
  ch1_last_edge_ms = millis();
}

void isr_ch2() {
  static unsigned long rise_us = 0;
  if (digitalRead(CH2_PIN)) {
    rise_us = micros();
  } else {
    throttle_us = (int)(micros() - rise_us);
  }
  ch2_last_edge_ms = millis();
}

void isr_ch3() {
  static unsigned long rise_us = 0;
  if (digitalRead(CH3_PIN)) {
    rise_us = micros();
  } else {
    mode_us = (int)(micros() - rise_us);
  }
  ch3_last_edge_ms = millis();
}

// ------------------ Helpers ------------------

// Atomic snapshot of the ISR-shared variables.
static inline void snapshot(int &st, int &th, int &md,
                            unsigned long &t1, unsigned long &t2, unsigned long &t3) {
  noInterrupts();
  st = steering_us;
  th = throttle_us;
  md = mode_us;
  t1 = ch1_last_edge_ms;
  t2 = ch2_last_edge_ms;
  t3 = ch3_last_edge_ms;
  interrupts();
}

static inline bool pwm_valid(int us) {
  return us >= PWM_MIN_VALID && us <= PWM_MAX_VALID;
}

static inline float slew(float current, float target, float max_step) {
  float d = target - current;
  if (d >  max_step) d =  max_step;
  if (d < -max_step) d = -max_step;
  return current + d;
}

// ------------------ Main tasks ------------------

void set_armed(bool arm) {
  if (arm == motors_armed) return;
  if (arm) {
    Serial.println(F("ARM: closed-loop control"));
    odrive.run_state(0, AXIS_STATE_CLOSED_LOOP_CONTROL, false);
    odrive.run_state(1, AXIS_STATE_CLOSED_LOOP_CONTROL, false);
  } else {
    Serial.println(F("DISARM: idle"));
    odrive.SetVelocity(0, 0);
    odrive.SetVelocity(1, 0);
    odrive.run_state(0, AXIS_STATE_IDLE, false);
    odrive.run_state(1, AXIS_STATE_IDLE, false);
    cmd_right = cmd_left = 0.0f;
  }
  motors_armed = arm;
}

void control_task() {
  int st, th, md;
  unsigned long t1, t2, t3;
  snapshot(st, th, md, t1, t2, t3);

  unsigned long now = millis();
  bool ch1_alive = (now - t1) < FAILSAFE_TIMEOUT_MS && pwm_valid(st);
  bool ch2_alive = (now - t2) < FAILSAFE_TIMEOUT_MS && pwm_valid(th);
  bool ch3_alive = (now - t3) < FAILSAFE_TIMEOUT_MS && pwm_valid(md);
  bool rc_ok = ch1_alive && ch2_alive && ch3_alive;

  if (!rc_ok) {
    // Signal loss: force disarm and command zero.
    set_armed(false);
    return;
  }

  // Apply deadband.
  int th_off = th - PWM_CENTER;
  int st_off = st - PWM_CENTER;
  if (abs(th_off) < STICK_DEADBAND_US) th_off = 0;
  if (abs(st_off) < STICK_DEADBAND_US) st_off = 0;

  float throttle_cmd = KP_THROTTLE * (float)th_off;
  float steering_cmd = KP_STEERING * (float)st_off;

  // Differential mix.
  float target_right = throttle_cmd + steering_cmd;
  float target_left  = throttle_cmd - steering_cmd;

  // Slew-limit to prevent jerky steps.
  cmd_right = slew(cmd_right, target_right, VEL_SLEW_PER_TICK);
  cmd_left  = slew(cmd_left,  target_left,  VEL_SLEW_PER_TICK);

  if (motors_armed) {
    odrive.SetVelocity(0, M0_DIRECTION * cmd_right);
    odrive.SetVelocity(1, M1_DIRECTION * cmd_left);
  }
}

void arm_task() {
  // Only honored if all three RC channels are alive; handled in control_task
  // via set_armed(false) on signal loss.
  unsigned long now = millis();
  bool ch3_alive = (now - ch3_last_edge_ms) < FAILSAFE_TIMEOUT_MS;
  if (!ch3_alive) return;

  bool want_armed = (mode_us > ARM_THRESHOLD);
  set_armed(want_armed);
}

void blink_task() {
  // Steady 200ms blink when RC is alive, fast blink when signal lost.
  unsigned long now = millis();
  bool rc_ok = (now - ch1_last_edge_ms < FAILSAFE_TIMEOUT_MS)
            && (now - ch2_last_edge_ms < FAILSAFE_TIMEOUT_MS)
            && (now - ch3_last_edge_ms < FAILSAFE_TIMEOUT_MS);
  static bool led_state = false;
  static unsigned long last_toggle = 0;
  unsigned long interval = rc_ok ? BLINK_INTERVAL_MS : 50;
  if (now - last_toggle >= interval) {
    led_state = !led_state;
    digitalWrite(LED_PIN, led_state);
    last_toggle = now;
  }
}

void display_task() {
  int st, th, md;
  unsigned long t1, t2, t3;
  snapshot(st, th, md, t1, t2, t3);
  Serial.print(F("th=")); Serial.print(th);
  Serial.print(F(" st=")); Serial.print(st);
  Serial.print(F(" md=")); Serial.print(md);
  Serial.print(F(" armed=")); Serial.print(motors_armed);
  Serial.print(F(" cmdR=")); Serial.print(cmd_right, 3);
  Serial.print(F(" cmdL=")); Serial.println(cmd_left, 3);
}

// ------------------ Arduino entry points ------------------

void setup() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(CH1_PIN, INPUT);
  pinMode(CH2_PIN, INPUT);
  pinMode(CH3_PIN, INPUT);

  Serial.begin(PC_BAUD);
  Serial2.begin(ODRIVE_BAUD);

  attachInterrupt(digitalPinToInterrupt(CH1_PIN), isr_ch1, CHANGE);
  attachInterrupt(digitalPinToInterrupt(CH2_PIN), isr_ch2, CHANGE);
  attachInterrupt(digitalPinToInterrupt(CH3_PIN), isr_ch3, CHANGE);

  // Make sure the ODrive starts idle. Don't auto-arm on boot.
  delay(200);
  odrive.run_state(0, AXIS_STATE_IDLE, false);
  odrive.run_state(1, AXIS_STATE_IDLE, false);

  Serial.println(F("ROMR RC control ready. Flip arm switch to enable motors."));
}

void loop() {
  if (blink_timer.check())   blink_task();
  if (display_timer.check()) display_task();
  if (control_timer.check()) control_task();
  if (arm_timer.check())     arm_task();
}
