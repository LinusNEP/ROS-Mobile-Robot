/*
  ROMR Gesture Handheld Transmitter.

  Hardware:
    - Arduino (Uno/Nano/Pro Mini)
    - MPU6050 IMU on I2C (SDA=A4, SCL=A5 on Uno/Nano)
    - nRF24L01+ on SPI:
        MOSI = 11, MISO = 12, SCK = 13
        CE   = 7,  CSN  = 8    (configurable below)
    - Arm button between pin 2 and GND (uses internal pullup)
    - Status LED on pin 13 (built-in)

  Behavior:
    - Reads IMU at 50 Hz
    - Complementary filter for pitch/roll
    - Pitch (nose down) = forward command
    - Roll (right)      = right turn command
    - Transmits {lin_vel, ang_vel, armed, seq, checksum} every 20 ms
    - Arm button must be HELD to arm; release disarms immediately

  Libraries needed (Arduino Library Manager):
    - RF24 by TMRh20
    - MPU6050 by Electronic Cats (or any Wire-based MPU6050 lib)
*/

#include <SPI.h>
#include <RF24.h>
#include <Wire.h>

// ---------------- Pin config ----------------
#define PIN_CE    7
#define PIN_CSN   8
#define PIN_ARM   2
#define PIN_LED   13

// ---------------- Radio config ----------------
// Pipe address must match the receiver exactly. 5 bytes, any values.
const uint8_t RADIO_ADDRESS[5] = { 'R', 'O', 'M', 'R', '1' };
#define RADIO_CHANNEL  76       // 2.476 GHz; avoid common WiFi channels

// ---------------- Tilt mapping ----------------
// Max command velocities at full tilt (tune to taste)
#define MAX_LIN_VEL    0.6f    // m/s  (conservative; raise once trusted)
#define MAX_ANG_VEL    1.2f    // rad/s

// Tilt angles
#define TILT_DEADBAND_DEG   5.0f    // below this = zero command
#define TILT_MAX_DEG       25.0f    // at or above this = max command

// Invert axes if mounting is different than documented
#define INVERT_PITCH   false   // set true if "nose down" should mean backward
#define INVERT_ROLL    false   // set true if "right tilt" should mean left turn

// ---------------- Timing ----------------
#define IMU_PERIOD_MS        20    // 50 Hz sampling
#define TX_PERIOD_MS         20    // 50 Hz transmission
#define LED_BLINK_ARMED_MS   500
#define LED_BLINK_IDLE_MS    100

// ---------------- Packet format ----------------
// Keep this EXACTLY in sync with the receiver sketch.
struct __attribute__((packed)) GesturePacket {
  int16_t lin_vel_mm_s;   // linear velocity * 1000  (m/s -> mm/s)
  int16_t ang_vel_mrad_s; // angular velocity * 1000 (rad/s -> mrad/s)
  uint8_t armed;          // 0 or 1
  uint8_t seq;            // rolling sequence number
  uint8_t checksum;       // XOR of all bytes above
};

// ---------------- Globals ----------------
RF24 radio(PIN_CE, PIN_CSN);

// MPU6050 raw registers
#define MPU6050_ADDR   0x68
#define PWR_MGMT_1     0x6B
#define ACCEL_XOUT_H   0x3B

// Calibration offsets (measured in setup)
int16_t gx_offset = 0, gy_offset = 0, gz_offset = 0;

// Filter state
float pitch_deg = 0.0f;
float roll_deg  = 0.0f;

// Timing
unsigned long last_imu_ms = 0;
unsigned long last_tx_ms = 0;
unsigned long last_led_ms = 0;
bool led_state = false;
uint8_t seq = 0;

// ---------------- MPU6050 helpers ----------------
void mpuWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

void mpuReadAll(int16_t &ax, int16_t &ay, int16_t &az,
                int16_t &gx, int16_t &gy, int16_t &gz) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(ACCEL_XOUT_H);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)14, (uint8_t)true);
  ax = (Wire.read() << 8) | Wire.read();
  ay = (Wire.read() << 8) | Wire.read();
  az = (Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read();  // temperature, ignored
  gx = (Wire.read() << 8) | Wire.read();
  gy = (Wire.read() << 8) | Wire.read();
  gz = (Wire.read() << 8) | Wire.read();
}

void calibrateGyro() {
  // Hold still for 2 seconds, average zero-rate offsets.
  long sx = 0, sy = 0, sz = 0;
  const int N = 100;
  for (int i = 0; i < N; i++) {
    int16_t ax, ay, az, gx, gy, gz;
    mpuReadAll(ax, ay, az, gx, gy, gz);
    sx += gx; sy += gy; sz += gz;
    delay(20);
  }
  gx_offset = sx / N;
  gy_offset = sy / N;
  gz_offset = sz / N;
}

// ---------------- Tilt -> velocity mapping ----------------
float tiltToCommand(float tilt_deg, float max_vel) {
  // Linear map: deadband..max -> 0..max_vel, with sign preservation
  float mag = fabs(tilt_deg);
  if (mag <= TILT_DEADBAND_DEG) return 0.0f;
  if (mag >= TILT_MAX_DEG)      return (tilt_deg > 0 ? max_vel : -max_vel);
  float frac = (mag - TILT_DEADBAND_DEG) / (TILT_MAX_DEG - TILT_DEADBAND_DEG);
  float cmd  = frac * max_vel;
  return (tilt_deg > 0) ? cmd : -cmd;
}

uint8_t computeChecksum(const GesturePacket& p) {
  const uint8_t* b = (const uint8_t*)&p;
  uint8_t sum = 0;
  // Checksum covers everything except the checksum byte itself
  for (size_t i = 0; i < sizeof(GesturePacket) - 1; i++) sum ^= b[i];
  return sum;
}

// ---------------- Setup ----------------
void setup() {
  pinMode(PIN_ARM, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);

  Serial.begin(115200);
  Serial.println(F("ROMR gesture handheld"));

  Wire.begin();
  Wire.setClock(400000);

  // Wake MPU6050 (PWR_MGMT_1 = 0 clears sleep bit)
  mpuWrite(PWR_MGMT_1, 0x00);
  delay(100);

  Serial.println(F("Calibrating gyro... hold still for 2 seconds"));
  digitalWrite(PIN_LED, HIGH);
  calibrateGyro();
  digitalWrite(PIN_LED, LOW);
  Serial.print(F("Gyro offsets: "));
  Serial.print(gx_offset); Serial.print(' ');
  Serial.print(gy_offset); Serial.print(' ');
  Serial.println(gz_offset);

  // Radio
  if (!radio.begin()) {
    Serial.println(F("FATAL: nRF24 hardware not detected"));
    while (1) {
      digitalWrite(PIN_LED, !digitalRead(PIN_LED));
      delay(50);  // rapid blink = hardware failure
    }
  }
  radio.setPALevel(RF24_PA_HIGH);
  radio.setDataRate(RF24_250KBPS);   // longer range than 1Mbps/2Mbps
  radio.setChannel(RADIO_CHANNEL);
  radio.setPayloadSize(sizeof(GesturePacket));
  radio.setAutoAck(true);
  radio.setRetries(3, 5);            // 3*250us delay, 5 retries
  radio.openWritingPipe(RADIO_ADDRESS);
  radio.stopListening();

  Serial.println(F("Ready. Hold arm button + tilt to drive."));
}

// ---------------- Main loop ----------------
void loop() {
  unsigned long now = millis();

  // ---- IMU update ----
  if (now - last_imu_ms >= IMU_PERIOD_MS) {
    float dt = (now - last_imu_ms) / 1000.0f;
    last_imu_ms = now;

    int16_t ax_raw, ay_raw, az_raw, gx_raw, gy_raw, gz_raw;
    mpuReadAll(ax_raw, ay_raw, az_raw, gx_raw, gy_raw, gz_raw);

    // Accelerometer -> angle (degrees).
    // MPU6050 default range is +/- 2g, LSB = 16384 per g.
    // Pitch = rotation around Y axis (nose up/down)
    // Roll  = rotation around X axis (left/right tilt)
    float ax = ax_raw / 16384.0f;
    float ay = ay_raw / 16384.0f;
    float az = az_raw / 16384.0f;
    float accel_pitch = atan2(-ax, sqrt(ay*ay + az*az)) * 180.0f / PI;
    float accel_roll  = atan2( ay, az) * 180.0f / PI;

    // Gyro -> deg/sec. Default range +/- 250 deg/s, LSB = 131.
    float gy_dps = (gy_raw - gy_offset) / 131.0f;
    float gx_dps = (gx_raw - gx_offset) / 131.0f;

    // Complementary filter: 98% gyro integration + 2% accel
    pitch_deg = 0.98f * (pitch_deg + gy_dps * dt) + 0.02f * accel_pitch;
    roll_deg  = 0.98f * (roll_deg  + gx_dps * dt) + 0.02f * accel_roll;
  }

  // ---- Transmit packet ----
  if (now - last_tx_ms >= TX_PERIOD_MS) {
    last_tx_ms = now;

    // Arm = button held (active-low with pullup)
    bool arm_held = (digitalRead(PIN_ARM) == LOW);

    float p = INVERT_PITCH ? -pitch_deg : pitch_deg;
    float r = INVERT_ROLL  ? -roll_deg  : roll_deg;

    float lin = tiltToCommand(p, MAX_LIN_VEL);   // m/s
    float ang = tiltToCommand(r, MAX_ANG_VEL);   // rad/s (right tilt = +z rot)
    // Convention: positive angular.z = left turn in ROS. Flip sign so right tilt = right turn.
    ang = -ang;

    // If not armed, force zeros in the payload too (belt + suspenders).
    if (!arm_held) { lin = 0.0f; ang = 0.0f; }

    GesturePacket pkt;
    pkt.lin_vel_mm_s   = (int16_t)(lin * 1000.0f);
    pkt.ang_vel_mrad_s = (int16_t)(ang * 1000.0f);
    pkt.armed          = arm_held ? 1 : 0;
    pkt.seq            = seq++;
    pkt.checksum       = computeChecksum(pkt);

    // Non-blocking write; we don't care about per-packet ACK success
    // because the receiver has its own freshness watchdog.
    radio.write(&pkt, sizeof(pkt));
  }

  // ---- LED ----
  bool arm_held = (digitalRead(PIN_ARM) == LOW);
  unsigned long interval = arm_held ? LED_BLINK_ARMED_MS : LED_BLINK_IDLE_MS;
  if (now - last_led_ms >= interval) {
    last_led_ms = now;
    led_state = !led_state;
    digitalWrite(PIN_LED, led_state);
  }
}
