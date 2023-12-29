import rosbag
import csv
import tf.transformations as tf
import math

bag = rosbag.Bag('stability_test.bag')
topics = ['/imu']  # replace '/imu' with the actual IMU topic in your rosbag file

with open('imu_data.csv', 'w') as csvfile:
    fieldnames = ['timestamp', 'angular_velocity_x', 'angular_velocity_y', 'angular_velocity_z',
                  'linear_acceleration_x', 'linear_acceleration_y', 'linear_acceleration_z',
                  'orientation_x', 'orientation_y', 'orientation_z', 'orientation_w',
                  'roll_deg', 'pitch_deg']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()

    for topic, msg, t in bag.read_messages(topics=topics):
        orientation = [msg.orientation.x, msg.orientation.y, msg.orientation.z, msg.orientation.w]
        roll, pitch, yaw = tf.euler_from_quaternion(orientation, 'rzyx')  # 'rzyx' indicates the order of rotations
        roll_deg = roll  * 180.0 / math.pi
        pitch_deg = pitch  * 180.0 / math.pi
        writer.writerow({'timestamp': str(msg.header.stamp.to_sec()),
                         'angular_velocity_x': str(msg.angular_velocity.x),
                         'angular_velocity_y': str(msg.angular_velocity.y),
                         'angular_velocity_z': str(msg.angular_velocity.z),
                         'linear_acceleration_x': str(msg.linear_acceleration.x),
                         'linear_acceleration_y': str(msg.linear_acceleration.y),
                         'linear_acceleration_z': str(msg.linear_acceleration.z),
                         'orientation_x': str(msg.orientation.x),
                         'orientation_y': str(msg.orientation.y),
                         'orientation_z': str(msg.orientation.z),
                         'orientation_w': str(msg.orientation.w),
                         'roll_deg': str(roll_deg),
                         'pitch_deg': str(pitch_deg)})

bag.close()
