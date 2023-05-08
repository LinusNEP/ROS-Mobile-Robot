import rosbag
import csv
import tf
import geometry_msgs.msg


bag = rosbag.Bag('stability_test.bag')
topics = ['/odom']  # replace '/odom' with the actual odom topic in your rosbag file

with open('odom_data.csv', 'w') as csvfile:
    fieldnames = ['timestamp', 'position_x', 'position_y', 'position_z',
                  'orientation_x', 'orientation_y', 'orientation_z', 'orientation_w',
                  'linear_velocity_x', 'linear_velocity_y', 'linear_velocity_z',
                  'angular_velocity_x', 'angular_velocity_y', 'angular_velocity_z']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()

    for topic, msg, t in bag.read_messages(topics=topics):
        writer.writerow({'timestamp': str(msg.header.stamp.to_sec()),
                         'position_x': str(msg.pose.pose.position.x),
                         'position_y': str(msg.pose.pose.position.y),
                         'position_z': str(msg.pose.pose.position.z),
                         'orientation_x': str(msg.pose.pose.orientation.x),
                         'orientation_y': str(msg.pose.pose.orientation.y),
                         'orientation_z': str(msg.pose.pose.orientation.z),
                         'orientation_w': str(msg.pose.pose.orientation.w),
                         'linear_velocity_x': str(msg.twist.twist.linear.x),
                         'linear_velocity_y': str(msg.twist.twist.linear.y),
                         'linear_velocity_z': str(msg.twist.twist.linear.z),
                         'angular_velocity_x': str(msg.twist.twist.angular.x),
                         'angular_velocity_y': str(msg.twist.twist.angular.y),
                         'angular_velocity_z': str(msg.twist.twist.angular.z)})

bag.close()
