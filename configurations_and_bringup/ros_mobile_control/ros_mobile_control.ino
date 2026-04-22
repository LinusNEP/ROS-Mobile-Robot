/*
  ROMR ROS node.

  Subscribes:
    /cmd_vel    (geometry_msgs/Twist)      commanded velocity
    /robot/arm  (std_msgs/Bool)            true = enter closed-loop, false = idle

  Publishes:
    /wheel_vel    (geometry_msgs/Vector3Stamped)  x=left m/s, y=right m/s
    /robot/armed  (std_msgs/Bool)                 true when ODrive is in closed-loop
*/

#include <HardwareSerial.h>
#include <ODriveArduino.h>

#include <ros.h>
#include <geometry_msgs/Twist.h>
#include <geometry_msgs/Vector3Stamped.h>
#include <std_msgs/Bool.h>

// --- ODrive ---
ODriveArduino odrive(Serial2);

// --- Robot params ---
#define ROMR_WIDTH_MM        300.0f
#define WHEEL_DIAMETER_MM    165.1f
#define WHEEL_CIRC_MM        518.362788f
#define GEAR_REV             5.0f

static const float WHEEL_CIRC_M = WHEEL_CIRC_MM / 1000.0f;
static const float ROMR_WIDTH_M = ROMR_WIDTH_MM / 1000.0f;

// --- ROS ---
ros::NodeHandle nh;

geometry_msgs::Vector3Stamped wheel_vel_msg;
ros::Publisher wheel_vel_pub("wheel_vel", &wheel_vel_msg);

std_msgs::Bool armed_msg;
ros::Publisher armed_pub("robot/armed", &armed_msg);

// --- State ---
volatile float req_lin = 0.0f;       // m/s
volatile float req_ang = 0.0f;       // rad/s
volatile unsigned long last_cmd_ms = 0;

bool arm_requested = false;          // latest value from /robot/arm
bool armed = false;                  // actual ODrive state we've commanded

// --- Timing ---
#define CTRL_PERIOD_MS        10     // 100 Hz control
#define PUB_PERIOD_MS         20     // 50 Hz wheel feedback
#define STATUS_PERIOD_MS     500     // 2 Hz arm state publish
#define CMD_VEL_TIMEOUT_MS   500     // auto-disarm if cmd_vel silent

unsigned long last_ctrl_ms = 0;
unsigned long last_pub_ms  = 0;
unsigned long last_status_ms = 0;

// --- Callbacks ---
void cmdVelCallback(const geometry_msgs::Twist& vel) {
  req_lin = vel.linear.x;
  req_ang = vel.angular.z;
  last_cmd_ms = millis();
}
ros::Subscriber<geometry_msgs::Twist> cmd_sub("cmd_vel", cmdVelCallback);

void armCallback(const std_msgs::Bool& msg) {
  arm_requested = msg.data;
}
ros::Subscriber<std_msgs::Bool> arm_sub("robot/arm", armCallback);

// --- Unit conversions ---
static inline float wheelMpsToOdrive(float v_mps) {
  return (v_mps * 1000.0f) * (GEAR_REV / WHEEL_CIRC_MM);
}
static inline float odriveToWheelMps(float v_odrive) {
  return v_odrive * (WHEEL_CIRC_MM / GEAR_REV) / 1000.0f;
}

// --- Arm/disarm ---
void setArmed(bool target) {
  if (target == armed) return;
  if (target) {
    odrive.run_state(0, AXIS_STATE_CLOSED_LOOP_CONTROL, false);
    odrive.run_state(1, AXIS_STATE_CLOSED_LOOP_CONTROL, false);
  } else {
    // Zero commanded velocity first, then drop to IDLE.
    odrive.SetVelocity(0, 0);
    odrive.SetVelocity(1, 0);
    odrive.run_state(0, AXIS_STATE_IDLE, false);
    odrive.run_state(1, AXIS_STATE_IDLE, false);
    req_lin = 0.0f;
    req_ang = 0.0f;
  }
  armed = target;
}

void setup() {
  nh.getHardware()->setBaud(500000);
  nh.initNode();
  nh.subscribe(cmd_sub);
  nh.subscribe(arm_sub);
  nh.advertise(wheel_vel_pub);
  nh.advertise(armed_pub);

  Serial.begin(115200);
  Serial2.begin(115200);

  // Explicitly start IDLE. Do NOT auto-arm.
  odrive.run_state(0, AXIS_STATE_IDLE, false);
  odrive.run_state(1, AXIS_STATE_IDLE, false);

  wheel_vel_msg.header.frame_id = "base_link";
}

void loop() {
  nh.spinOnce();
  unsigned long now = millis();

  // ---- Arming logic ----
  // Local watchdog: if /cmd_vel has been silent too long while armed, disarm.
  // Don't require cmd_vel to be recent just to *arm* - only to stay armed.
  bool cmd_vel_stale = armed && (now - last_cmd_ms > CMD_VEL_TIMEOUT_MS);
  bool want_armed = arm_requested && !cmd_vel_stale;
  setArmed(want_armed);

  // ---- Control loop ----
  if (now - last_ctrl_ms >= CTRL_PERIOD_MS) {
    last_ctrl_ms = now;

    if (armed) {
      float v_left  = req_lin - (req_ang * ROMR_WIDTH_M * 0.5f);
      float v_right = req_lin + (req_ang * ROMR_WIDTH_M * 0.5f);

      float sp_left  = wheelMpsToOdrive(v_left);
      float sp_right = wheelMpsToOdrive(v_right);

      // Axis 0 is mechanically reversed
      odrive.SetVelocity(0, -sp_left);
      odrive.SetVelocity(1,  sp_right);
    }
    // When not armed, don't send velocity commands; ODrive is in IDLE anyway.
  }

  // ---- Wheel feedback publish ----
  if (now - last_pub_ms >= PUB_PERIOD_MS) {
    last_pub_ms = now;

    float v0 = odrive.GetVelocity(0);
    float v1 = odrive.GetVelocity(1);

    float v_left_mps  = odriveToWheelMps(-v0);
    float v_right_mps = odriveToWheelMps( v1);

    wheel_vel_msg.header.stamp = nh.now();
    wheel_vel_msg.vector.x = v_left_mps;
    wheel_vel_msg.vector.y = v_right_mps;
    wheel_vel_msg.vector.z = 0.0f;
    wheel_vel_pub.publish(&wheel_vel_msg);
  }

  // ---- Arm status publish ----
  if (now - last_status_ms >= STATUS_PERIOD_MS) {
    last_status_ms = now;
    armed_msg.data = armed;
    armed_pub.publish(&armed_msg);
  }
}
