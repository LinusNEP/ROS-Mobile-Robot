close all
clc
clear

% ========= Read the data from the CSV files ================
cmd_vel_data = readtable('cmd_vel_data.csv');
odom_data = readtable('odom_data.csv');
imu_data = readtable('imu_data.csv');
imu_data1 = readtable('imu_data1.csv');

% ===========  Extract the relevant columns  ===============
% cmd_vel_data
cmd_vel_timestamp = cmd_vel_data{:,1};
linear_velocity_x = cmd_vel_data{:,2};

% odom_data
odom_timestamp = odom_data{:,1};
odom_position_x = odom_data{:,2};
odom_position_y = odom_data{:,3};
odom_position_z = odom_data{:,4};

odom_orientation_x = odom_data{:,5};
odom_orientation_y = odom_data{:,6};
odom_orientation_z = odom_data{:,7};
odom_orientation_w = odom_data{:,8};

% imu_data
imu_timestamp = imu_data{:,1};
imu_timestamp1 = imu_data1{:,1};

imu_angular_velocity_x = imu_data{:,2};
imu_angular_velocity_y = imu_data{:,3};
imu_angular_velocity_z = imu_data{:,4};
imu_linear_acceleration_x = imu_data{:,5};
imu_linear_acceleration_y = imu_data{:,6};
imu_orientation_x = imu_data{:,8};
imu_orientation_y = imu_data{:,9};
imu_orientation_z = imu_data{:,10};

imu_roll_deg = imu_data1{:,23};
imu_pitch_deg = imu_data1{:,22};


% ============= Interpolate the data ===================
%   target length of the interpolated matrix
target_length = 1337;
interp_imu_timestamp1 = interp1(1:length(imu_timestamp1), imu_timestamp1, linspace(1, length(imu_timestamp1), target_length))';


% ================= Plot the relevant data =================
figure;
subplot(2,3,1);
plot(odom_position_x, odom_position_y)
xlabel('x-pose (m)')
ylabel('y-pose (m)')
grid minor

subplot(2,3,2);
plot(odom_timestamp, odom_position_y,'r')
hold on
plot(odom_timestamp, odom_position_x, 'b')
xlabel('Time (s)')
ylabel('Position (m)')
legend ('x-pose', 'y-pose')
grid minor

subplot(2,3,3);
plot(cmd_vel_timestamp, linear_velocity_x)
hold on
plot(interp_imu_timestamp1, imu_roll_deg)
%xlim([100 250])
xlabel('Time (s)')
ylabel('Values')
legend ('Linear velocity (m/s)', 'Tilt angle (radians)')
grid minor

subplot(2,3,4);
plot(imu_timestamp, imu_angular_velocity_z, 'r')
hold on
plot(imu_timestamp, imu_angular_velocity_y, 'g')
hold on
plot(imu_timestamp, imu_angular_velocity_x, 'b')
xlabel('Time (s)')
ylabel('Angular velocity (rad/s)')
legend ('z-axis', 'y-axis' , 'x-axis')
grid minor

subplot(2,3,5);
plot(imu_timestamp, imu_orientation_x, 'r')
hold on
plot(imu_timestamp, imu_orientation_y, 'y')
xlabel('Time (s)')
ylabel('Orientation (rad)')
legend ('x-axis', 'y-axis')
grid minor

subplot(2,3,6);
plot(imu_timestamp, imu_linear_acceleration_x, 'g')
hold on
plot(imu_timestamp, imu_linear_acceleration_y, 'c')
xlabel('Time (s)')
ylabel('Linear acceleration (m/s^2)')
legend ('x-axis', 'y-axis')
grid minor









