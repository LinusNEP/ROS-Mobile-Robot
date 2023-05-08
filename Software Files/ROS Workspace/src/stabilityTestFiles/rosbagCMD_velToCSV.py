import rosbag
import csv

bag = rosbag.Bag('stability_test.bag')
topics = ['/cmd_vel']  # replace '/cmd_vel' with the actual cmd_vel topic in your rosbag file

with open('cmd_vel_data.csv', 'w') as csvfile:
    fieldnames = ['timestamp', 'linear_velocity_x', 'linear_velocity_y', 'linear_velocity_z',
                  'angular_velocity_x', 'angular_velocity_y', 'angular_velocity_z']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()

    for topic, msg, t in bag.read_messages(topics=topics):
        if hasattr(msg, 'header'):
            timestamp = str(msg.header.stamp.to_sec())
        else:
            timestamp = str(t.to_sec())
        writer.writerow({'timestamp': timestamp,
                         'linear_velocity_x': str(msg.linear.x),
                         'linear_velocity_y': str(msg.linear.y),
                         'linear_velocity_z': str(msg.linear.z),
                         'angular_velocity_x': str(msg.angular.x),
                         'angular_velocity_y': str(msg.angular.y),
                         'angular_velocity_z': str(msg.angular.z)})

bag.close()
