/*
  ROMR Gesture Receiver.

  Runs on the robot's Arduino Mega. Receives GesturePacket from the
  handheld transmitter over nRF24L01+ and commands the ODrive over Serial2.

  Hardware:
    - Arduino Mega
    - nRF24L01+ on Mega's SPI:
        MOSI = 51, MISO = 50, SCK = 52
        CE   = 9,  CSN  = 10   (change below if wired differently)
    - ODrive on Serial2 (pins 16 TX, 17 RX, plus common ground)
    - Status LED on pin 13

  Safety model:
    1. Handheld's arm button must be HELD (packet.armed == 1)
    2. Packet freshness: if no valid packet in FAILSAFE_TIMEOUT_MS, disarm
    3. Checksum validation: corrupt packets are discarded
*/

#include <SPI.h>
#include <RF24.h>
#include <ODriveArduino.h>
#include <Metro.h>

// ---------------- Pin config ----------------
#define PIN_CE    9
#define PIN_CSN   10
#define PIN_LED   13

// ---------------- Radio config (MUST MATCH handheld) ----------------
const uint8_t RADIO_ADDRESS[5] = { 'R', 'O', 'M', 'R', '1' };
#define RADIO_CHANNEL   76

// ---------------- Packet format (MUST MATCH handheld) ----------------
struct __attribute__((packed)) GesturePacket {
  int16_t lin_vel_mm_s;
  int16_t ang_vel_mrad_s;
  uint8_t armed;
  uint8_t seq;
  uint8_t checksum;
};

// ---------------- Robot params ----------------
#define ROMR_WIDTH_MM        300.0f
#define WHEEL_CIRC_MM        518.362788f
#define GEAR_REV             5.0f

static const float WHEEL_CIRC_M = WHEEL_CIRC_MM / 1000.0f;
static const float ROMR_WIDTH_M = ROMR_WIDTH_MM / 1000.0f;

// Motor direction (flip if a wheel spins backward)
#define M0_DIRECTION (-1)
#define M1_DIRECTION ( 1)

// ---------------- Control parameters ----------------
#define VEL_SLEW_PER_TICK   0.05f   // turns/sec change per 10 ms tick
#define CTRL_PERIOD_MS         10
#define FAILSAFE_TIMEOUT_MS   300   // must see valid packet within this
#define DISPLAY_PERIOD_MS     100

// ---------------- State ----------------
RF24 radio(PIN_CE, PIN_CSN);
ODriveArduino odrive(Serial2);

volatile float req_lin = 0.0f;     // m/s (from latest good packet)
volatile float req_ang = 0.0f;     // rad/s
volatile bool  req_arm = false;    // handheld button state
volatile unsigned long last_packet_ms = 0;
volatile uint8_t last_seq = 0;
volatile uint32_t packet_count = 0;
volatile uint32_t checksum_fails = 0;

bool armed = false;
float cmd_right = 0.0f;
float cmd_left  = 0.0f;

Metro control_timer(CTRL_PERIOD_MS);
Metro display_timer(DISPLAY_PERIOD_MS);

// ---------------- Helpers ----------------
static inline float wheelMpsToOdrive(float v_mps) {
  return (v_mps * 1000.0f) * (GEAR_REV / WHEEL_CIRC_MM);
}

static inline float slew(float current, float target, float max_step) {
  float d = target - current;
  if (d >  max_step) d =  max_step;
  if (d < -max_step) d = -max_step;
  return current + d;
}

uint8_t computeChecksum(const GesturePacket& p) {
  const uint8_t* b = (const uint8_t*)&p;
  uint8_t sum = 0;
  for (size_t i = 0; i < sizeof(GesturePacket) - 1; i++) sum ^= b[i];
  return sum;
}

void setArmed(bool target) {
  if (target == armed) return;
  if (target) {
    Serial.println(F("ARM"));
    odrive.run_state(0, AXIS_STATE_CLOSED_LOOP_CONTROL, false);
    odrive.run_state(1, AXIS_STATE_CLOSED_LOOP_CONTROL, false);
  } else {
    Serial.println(F("DISARM"));
    odrive.SetVelocity(0, 0);
    odrive.SetVelocity(1, 0);
    odrive.run_state(0, AXIS_STATE_IDLE, false);
    odrive.run_state(1, AXIS_STATE_IDLE, false);
    cmd_right = cmd_left = 0.0f;
  }
  armed = target;
}

// ---------------- Radio poll ----------------
void pollRadio() {
  while (radio.available()) {
    GesturePacket pkt;
    radio.read(&pkt, sizeof(pkt));
    if (pkt.checksum != computeChecksum(pkt)) {
      checksum_fails++;
      continue;
    }
    req_lin = pkt.lin_vel_mm_s   / 1000.0f;
    req_ang = pkt.ang_vel_mrad_s / 1000.0f;
    req_arm = (pkt.armed != 0);
    last_packet_ms = millis();
    last_seq = pkt.seq;
    packet_count++;
  }
}

// ---------------- Setup ----------------
void setup() {
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(115200);
  Serial2.begin(115200);

  Serial.println(F("ROMR gesture receiver"));

  if (!radio.begin()) {
    Serial.println(F("FATAL: nRF24 hardware not detected"));
    while (1) {
      digitalWrite(PIN_LED, !digitalRead(PIN_LED));
      delay(50);
    }
  }
  radio.setPALevel(RF24_PA_HIGH);
  radio.setDataRate(RF24_250KBPS);
  radio.setChannel(RADIO_CHANNEL);
  radio.setPayloadSize(sizeof(GesturePacket));
  radio.setAutoAck(true);
  radio.openReadingPipe(1, RADIO_ADDRESS);
  radio.startListening();

  // Start in IDLE. Arming is driven by packets.
  odrive.run_state(0, AXIS_STATE_IDLE, false);
  odrive.run_state(1, AXIS_STATE_IDLE, false);

  Serial.println(F("Ready. Waiting for handheld..."));
}

// ---------------- Main loop ----------------
void loop() {
  pollRadio();

  if (control_timer.check()) {
    unsigned long now = millis();
    bool packet_fresh = (now - last_packet_ms) < FAILSAFE_TIMEOUT_MS;

    // Arm only when the handheld is currently transmitting armed=1
    // AND we've seen a recent packet.
    bool want_armed = packet_fresh && req_arm;
    setArmed(want_armed);

    if (armed) {
      // Differential drive inverse kinematics
      float v_left  = req_lin - (req_ang * ROMR_WIDTH_M * 0.5f);
      float v_right = req_lin + (req_ang * ROMR_WIDTH_M * 0.5f);

      // Convert to ODrive units
      float sp_left_tgt  = wheelMpsToOdrive(v_left);
      float sp_right_tgt = wheelMpsToOdrive(v_right);

      // Slew-limit in ODrive units
      cmd_left  = slew(cmd_left,  sp_left_tgt,  VEL_SLEW_PER_TICK);
      cmd_right = slew(cmd_right, sp_right_tgt, VEL_SLEW_PER_TICK);

      odrive.SetVelocity(0, M0_DIRECTION * cmd_left);
      odrive.SetVelocity(1, M1_DIRECTION * cmd_right);
    }
  }

  if (display_timer.check()) {
    unsigned long now = millis();
    unsigned long age = now - last_packet_ms;
    Serial.print(F("lin=")); Serial.print(req_lin, 2);
    Serial.print(F(" ang=")); Serial.print(req_ang, 2);
    Serial.print(F(" arm=")); Serial.print(req_arm);
    Serial.print(F(" armed=")); Serial.print(armed);
    Serial.print(F(" age=")); Serial.print(age);
    Serial.print(F("ms pkt#=")); Serial.print(packet_count);
    Serial.print(F(" csFail=")); Serial.println(checksum_fails);

    // LED: steady on = armed, slow blink = fresh link but disarmed,
    //       fast blink = no link
    bool link_fresh = (age < FAILSAFE_TIMEOUT_MS);
    static bool led = false;
    static unsigned long last_toggle = 0;
    unsigned long interval;
    if (armed)           { digitalWrite(PIN_LED, HIGH); last_toggle = now; }
    else if (link_fresh) { interval = 500; }
    else                 { interval = 100; }
    if (!armed && (now - last_toggle >= interval)) {
      led = !led;
      digitalWrite(PIN_LED, led);
      last_toggle = now;
    }
  }
}
