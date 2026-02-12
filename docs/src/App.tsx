import { useEffect, useRef, useState } from 'react';
// Copy Button Component
function CopyButton({ commands }: { commands: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(commands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-[#666666] hover:text-[#d0ff59] transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          Copy
        </>
      )}
    </button>
  );
}
import { 
  Cpu, Settings, Hand, Box, ChevronRight, Download, 
  BookOpen, Github, Menu, X, Battery, Zap, Gauge, 
  Maximize, Weight, Timer, Layers, Radio, Smartphone,
  Move, Code, Terminal, ExternalLink, Play, CheckCircle2,
  Wrench, AlertCircle, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
    );

    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { href: '#specs', label: 'Specifications' },
    { href: '#features', label: 'Features' },
    { href: '#hardware', label: 'Hardware' },
    { href: '#software', label: 'Software' },
    { href: '#setup', label: 'Setup' },
    { href: '#gallery', label: 'Gallery' },
    { href: '#build', label: 'Build' },
  ];

  const specs = [
    { icon: Weight, label: 'Max Payload', value: '90', unit: 'kg', progress: 90 },
    { icon: Gauge, label: 'Max Speed', value: '3.33', unit: 'm/s', progress: 83 },
    { icon: Battery, label: 'Battery', value: '36V', unit: '4400mAh', progress: 100 },
    { icon: Maximize, label: 'Dimensions', value: '0.46×0.34×0.43', unit: 'm', progress: 75 },
    { icon: Zap, label: 'Motor Power', value: '700', unit: 'W', progress: 70 },
    { icon: Timer, label: 'Runtime', value: '~8', unit: 'hours', progress: 80 },
  ];

  const features = [
    {
      icon: Settings,
      title: 'ROS Compatible',
      description: 'Full compatibility with ROS Melodic and ROS Noetic. Easily portable to ROS 2.',
      image: '${import.meta.env.BASE_URL}feature-ros.png'
    },
    {
      icon: Cpu,
      title: 'SLAM Support',
      description: 'Built-in support for Hector-SLAM, Cartographer, Gmapping, and RTAB-Map.',
      image: 'feature-slam.png'
    },
    {
      icon: Hand,
      title: 'Gesture Control',
      description: 'Intuitive IMU-based gesture control for non-expert operators.',
      image: 'feature-gesture.png'
    },
    {
      icon: Box,
      title: 'Simulation Ready',
      description: 'Complete Gazebo simulation with URDF models and virtual sensors.',
      image: 'feature-simulation.png'
    }
  ];

  const hardwareLayers = [
    {
      title: 'Chassis & Motors',
      components: ['Aluminum 40×40mm profiles', 'Hoverboard BLDC motors (2×)', 'Swivel caster wheel'],
      color: 'from-gray-700 to-gray-600'
    },
    {
      title: 'Power Systems',
      components: ['36V 4400mAh Li-Ion battery', 'Power bank 2400mA', 'ODrive 56V controller'],
      color: 'from-green-900 to-green-700'
    },
    {
      title: 'Compute',
      components: ['NVIDIA Jetson Nano B01', 'Arduino Mega Rev 3', 'nRF24L01+ wireless module'],
      color: 'from-blue-900 to-blue-700'
    },
    {
      title: 'Sensors',
      components: ['Ouster 3D LiDAR', 'RPLiDAR A2 M8', 'Intel RealSense D435i', 'Intel RealSense T265', 'ELP 4K Monocular Camera', 'MPU-9250 IMU'],
      color: 'from-purple-900 to-purple-700'
    }
  ];

  const controlMethods = [
    {
      id: 'rc',
      title: 'RC Controller',
      icon: Radio,
      description: 'Traditional remote control using Turnigy 9X 8-channel transmitter.',
      code: `// RC Control Setup
void setup() {
  pinMode(THROTTLE_PIN, INPUT);
  pinMode(STEERING_PIN, INPUT);
  Serial.begin(115200);
}`
    },
    {
      id: 'mobile',
      title: 'ROS Mobile',
      icon: Smartphone,
      description: 'Android app for intuitive touchscreen control via WiFi.',
      code: `// ROS Mobile Interface
roslaunch romr bringup.launch
rosserial_python serial_node.py
# Connect via ROS-Mobile App`
    },
    {
      id: 'gesture',
      title: 'Gesture Control',
      icon: Move,
      description: 'IMU-based hand tilt control for intuitive operation.',
      code: `// Gesture Control
imu_data = read_MPU9250()
pitch = imu_data.pitch  // Forward/Back
roll = imu_data.roll    // Left/Right
set_velocity(pitch, roll)`
    }
  ];

  const buildSteps = [
    {
      title: 'Assemble Chassis',
      description: 'Cut aluminum profiles and assemble the base frame using corner brackets.',
      details: ['Cut P1 profiles to size', 'Tap M8 threads', 'Assemble with P3 brackets']
    },
    {
      title: 'Mount Electronics',
      description: 'Install Jetson Nano, Arduino, ODrive, and wire all connections.',
      details: ['Mount bottom base plate', 'Install ODrive controller', 'Connect motor phases']
    },
    {
      title: 'Calibrate Motors',
      description: 'Use odrivetool to configure and calibrate BLDC motors.',
      details: ['Run calibration script', 'Set velocity gains', 'Test motor response']
    },
    {
      title: 'Flash Software',
      description: 'Upload Arduino sketches and configure ROS workspace.',
      details: ['Install ROS packages', 'Upload control sketches', 'Launch bringup']
    }
  ];

  const galleryImages = [
    { src: 'gallery-1.jpg', alt: 'ROMR in laboratory' },
    { src: 'gallery-2.jpg', alt: 'LiDAR scanning' },
    { src: 'gallery-3.jpg', alt: 'SLAM visualization' },
    { src: 'gallery-4.jpg', alt: 'Electronics close-up' },
    { src: 'gallery-5.jpg', alt: 'Gesture control demo' },
    { src: 'gallery-6.jpg', alt: 'Gazebo simulation' },
  ];

  const setupSteps = [
    {
      title: 'Jetson Nano Setup',
      icon: Cpu,
      description: 'Install JetPack and ROS on the NVIDIA Jetson Nano',
      commands: [
        '# 1. Download Jetson Nano Developer Kit SD Card Image',
        '# Visit: https://developer.nvidia.com/embedded/learn/get-started-jetson-nano-devkit',
        '',
        '# 2. Install ROS Melodic (Ubuntu 18.04) or ROS Noetic (Ubuntu 20.04)',
        'sudo sh -c \'echo "deb http://packages.ros.org/ros/ubuntu $(lsb_release -sc) main" > /etc/apt/sources.list.d/ros-latest.list\'',
        'sudo apt-key adv --keyserver hkp://ha.pool.sks-keyservers.net:80 --recv-key C1CF6E31E6BADE8868B172B4F42ED6FBAB17C654',
        'sudo apt update',
        'sudo apt install ros-melodic-desktop-full',
        '',
        '# 3. Initialize rosdep',
        'sudo rosdep init',
        'rosdep update',
        '',
        '# 4. Create ROS workspace',
        'mkdir -p ~/catkin_ws/src',
        'cd ~/catkin_ws/',
        'catkin_make',
        'echo "source ~/catkin_ws/devel/setup.bash" >> ~/.bashrc'
      ]
    },
    {
      title: 'ODrive Motor Calibration',
      icon: Zap,
      description: 'Configure and calibrate the BLDC motors using odrivetool',
      commands: [
        '# 1. Install ODrive tools',
        'pip3 install odrive',
        '',
        '# 2. Connect to ODrive via USB',
        'odrivetool',
        '',
        '# 3. Configure motor parameters (in odrivetool shell)',
        'odrv0.axis0.motor.config.pole_pairs = 15',
        'odrv0.axis0.motor.config.resistance_calib_max_voltage = 4',
        'odrv0.axis0.motor.config.requested_current_range = 25',
        'odrv0.axis0.motor.config.current_control_bandwidth = 100',
        '',
        '# 4. Configure encoder',
        'odrv0.axis0.encoder.config.mode = ENCODER_MODE_HALL',
        'odrv0.axis0.encoder.config.cpr = 90',
        '',
        '# 5. Run calibration',
        'odrv0.axis0.requested_state = AXIS_STATE_FULL_CALIBRATION_SEQUENCE',
        '',
        '# 6. Save configuration',
        'odrv0.save_configuration()',
        'odrv0.reboot()'
      ]
    },
    {
      title: 'Arduino Setup',
      icon: Code,
      description: 'Upload control sketches to Arduino Mega',
      commands: [
        '# 1. Install Arduino IDE',
        'sudo apt install arduino',
        '',
        '# 2. Install ROS serial library',
        'sudo apt install ros-melodic-rosserial-arduino',
        'sudo apt install ros-melodic-rosserial',
        '',
        '# 3. Install ODriveArduino library',
        '# Download from: https://github.com/odriverobotics/ODrive/tree/master/Arduino',
        '# In Arduino IDE: Sketch → Include Library → Add .ZIP Library',
        '',
        '# 4. Upload ROMR control sketch',
        '# Open: romr_remote_control.ino',
        '# Select Board: Arduino Mega 2560',
        '# Select Port: /dev/ttyACM0',
        '# Click Upload',
        '',
        '# 5. Install Metro library for timing',
        '# Download: https://github.com/thomasfredericks/Metro-Arduino-Wiring'
      ]
    },
    {
      title: 'RPLidar Setup',
      icon: Maximize,
      description: 'Configure the RPLidar A2 M8 for SLAM',
      commands: [
        '# 1. Clone RPLidar ROS package',
        'cd ~/catkin_ws/src',
        'git clone https://github.com/Slamtec/rplidar_ros.git',
        '',
        '# 2. Build the package',
        'cd ~/catkin_ws',
        'catkin_make',
        '',
        '# 3. Add user to dialout group',
        'sudo usermod -a -G dialout $USER',
        '',
        '# 4. Check USB port',
        'ls -l /dev | grep ttyUSB',
        '',
        '# 5. Launch RPLidar node',
        'roslaunch rplidar_ros rplidar.launch',
        '',
        '# 6. View scan data in RViz',
        'rosrun rviz rviz',
        '# Set Fixed Frame: laser',
        '# Add LaserScan topic: /scan'
      ]
    },
    {
      title: 'ROS Environment',
      icon: Terminal,
      description: 'Set up the complete ROS workspace and launch files',
      commands: [
        '# 1. Download ROMR ROS files',
        'cd ~/catkin_ws/src',
        'git clone https://github.com/your-repo/romr_ros.git',
        '',
        '# 2. Install dependencies',
        'cd ~/catkin_ws',
        'rosdep install --from-paths src --ignore-src -r -y',
        '',
        '# 3. Build workspace',
        'catkin_make',
        '',
        '# 4. Source workspace',
        'source ~/catkin_ws/devel/setup.bash',
        '',
        '# 5. Launch ROMR bringup',
        'roslaunch romr bringup.launch',
        '',
        '# 6. Start rosserial for Arduino communication',
        'rosrun rosserial_python serial_node.py /dev/ttyACM0',
        '',
        '# 7. Test motor control',
        'rostopic pub /cmd_vel geometry_msgs/Twist "linear: {x: 0.5}, angular: {z: 0.0}"'
      ]
    },
    {
      title: 'SLAM Configuration',
      icon: Box,
      description: 'Set up Hector-SLAM for mapping and navigation',
      commands: [
        '# 1. Install Hector-SLAM',
        'cd ~/catkin_ws/src',
        'git clone https://github.com/tu-darmstadt-ros-pkg/hector_slam.git',
        '',
        '# 2. Build',
        'cd ~/catkin_ws',
        'catkin_make',
        '',
        '# 3. Configure frame parameters',
        '# Edit: ~/catkin_ws/src/hector_slam/hector_mapping/launch/mapping_default.launch',
        '# Set: <param name=\"pub_map_odom_transform\" value=\"true\"/>',
        '# Set: <param name=\"map_frame\" value=\"map\" />',
        '# Set: <param name=\"base_frame\" value=\"base_link\" />',
        '',
        '# 4. Launch Hector-SLAM',
        'roslaunch hector_slam hector_slam.launch',
        '',
        '# 5. Save map',
        'rosrun map_server map_saver -f ~/my_map'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 grid-bg animate-grid-pulse pointer-events-none z-0" />
      
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrollY > 100 ? 'bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#3d3d3d]' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="#" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#d0ff59] rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold text-xl tracking-tight">ROMR</span>
            </a>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#cccccc] hover:text-[#d0ff59] transition-colors custom-expo"
                >
                  {link.label}
                </a>
              ))}
              <Button 
                size="sm" 
                className="bg-[#d0ff59] text-black hover:bg-[#b8e650] font-medium"
                onClick={() => window.open('https://doi.org/10.17605/OSF.IO/K83X7', '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#141414] border-b border-[#3d3d3d]">
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-[#cccccc] hover:text-[#d0ff59]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <Badge 
                variant="outline" 
                className="mb-6 border-[#d0ff59] text-[#d0ff59] animate-fade-in"
                style={{ animationDelay: '0.2s' }}
              >
                OPEN SOURCE HARDWARE
              </Badge>
              
              <h1 
                className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-4 animate-slide-up"
                style={{ animationDelay: '0.4s', opacity: 0 }}
              >
                <span className="text-gradient">ROMR</span>
              </h1>
              
              <p 
                className="text-xl sm:text-2xl text-[#cccccc] mb-4 animate-slide-up"
                style={{ animationDelay: '0.5s', opacity: 0 }}
              >
                ROS-based Open-source Mobile Robot
              </p>
              
              <p 
                className="text-[#666666] mb-8 max-w-lg mx-auto lg:mx-0 animate-slide-up"
                style={{ animationDelay: '0.6s', opacity: 0 }}
              >
                A low-cost, high-payload autonomous platform designed for research, 
                logistics, and education. Fully compatible with ROS/ROS2.
              </p>
              
              <div 
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up"
                style={{ animationDelay: '0.7s', opacity: 0 }}
              >
                <Button 
                  size="lg" 
                  className="bg-[#d0ff59] text-black hover:bg-[#b8e650] font-semibold"
                  onClick={() => window.open('https://doi.org/10.17605/OSF.IO/K83X7', '_blank')}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Get Started
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-[#3d3d3d] hover:border-[#d0ff59] hover:text-[#d0ff59]"
                  onClick={() => document.getElementById('specs')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              
              {/* Quick Stats */}
              <div 
                className="flex gap-8 mt-12 justify-center lg:justify-start animate-slide-up"
                style={{ animationDelay: '0.8s', opacity: 0 }}
              >
                <div>
                  <div className="text-3xl font-bold text-[#d0ff59]">90kg</div>
                  <div className="text-sm text-[#666666]">Payload</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#d0ff59]">&lt;$1500</div>
                  <div className="text-sm text-[#666666]">Cost</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#d0ff59]">GPL v3</div>
                  <div className="text-sm text-[#666666]">License</div>
                </div>
              </div>
            </div>
            
            {/* Right Content - Robot Image */}
            <div 
              className="relative animate-float"
              style={{ 
                transform: `translateY(${scrollY * 0.1}px) rotateY(${scrollY * 0.02}deg)`,
                perspective: '1000px'
              }}
            >
              <div className="relative">
                <img
                  src="/robot-hero.png"
                  alt="ROMR Robot"
                  className="w-full max-w-lg mx-auto drop-shadow-2xl"
                />
                {/* Status LED */}
                <div className="absolute top-1/4 right-1/4 w-3 h-3 bg-[#d0ff59] rounded-full animate-pulse-glow" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight className="w-6 h-6 text-[#666666] rotate-90" />
        </div>
      </section>

      {/* Specifications Section */}
      <section 
        id="specs" 
        className="py-24 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${
            visibleSections.has('specs') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Technical Specifications</h2>
            <p className="text-[#666666] max-w-2xl mx-auto">
              Engineered for performance and reliability. Every component carefully selected 
              to deliver maximum capability at minimum cost.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specs.map((spec, index) => (
              <Card 
                key={spec.label}
                className={`bg-[#141414] border-[#3d3d3d] hover:border-[#d0ff59]/50 hover:glow-green transition-all duration-500 group ${
                  visibleSections.has('specs') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <spec.icon className="w-8 h-8 text-[#d0ff59] group-hover:rotate-12 transition-transform duration-500" />
                    <span className="text-xs text-[#666666] mono">{spec.unit}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-1">{spec.value}</div>
                  <div className="text-sm text-[#cccccc]">{spec.label}</div>
                  <Progress 
                    value={spec.progress} 
                    className="mt-4 h-1 bg-[#3d3d3d]"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features" 
        className="py-24 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${
            visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Key Features</h2>
            <p className="text-[#666666] max-w-2xl mx-auto">
              Built with cutting-edge robotics technology for researchers, educators, and hobbyists.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className={`bg-[#141414] border-[#3d3d3d] overflow-hidden group hover:border-[#d0ff59]/50 transition-all duration-500 ${
                  visibleSections.has('features') ? 'opacity-100 translate-x-0' : 'opacity-0 ' + (index % 2 === 0 ? '-translate-x-8' : 'translate-x-8')
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="grid sm:grid-cols-2 gap-0">
                  <div className="p-6 flex flex-col justify-center">
                    <feature.icon className="w-10 h-10 text-[#d0ff59] mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-[#666666] text-sm">{feature.description}</p>
                  </div>
                  <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center p-6">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full max-w-[180px] object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Hardware Architecture Section */}
      <section 
        id="hardware" 
        className="py-24 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${
            visibleSections.has('hardware') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Hardware Architecture</h2>
            <p className="text-[#666666] max-w-2xl mx-auto">
              Modular design using off-the-shelf components for easy customization and repair.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Layer Stack */}
            <div className="space-y-4">
              {hardwareLayers.map((layer, index) => (
                <div 
                  key={layer.title}
                  className={`relative transition-all duration-700 ${
                    visibleSections.has('hardware') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className={`bg-gradient-to-r ${layer.color} p-px rounded-xl`}>
                    <div className="bg-[#141414] rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <Layers className="w-5 h-5 text-[#d0ff59]" />
                        <h3 className="font-bold">{layer.title}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {layer.components.map((component) => (
                          <Badge 
                            key={component} 
                            variant="secondary" 
                            className="bg-[#1a1a1a] text-[#cccccc] border-0"
                          >
                            {component}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Wiring Diagram */}
            <div 
              className={`bg-[#141414] rounded-2xl p-8 border border-[#3d3d3d] transition-all duration-700 ${
                visibleSections.has('hardware') ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}
              style={{ transitionDelay: '400ms' }}
            >
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Code className="w-5 h-5 text-[#d0ff59]" />
                System Architecture
              </h3>
              <div className="space-y-4 mono text-sm">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-[#666666]">NVIDIA Jetson Nano</span>
                  <span className="text-[#3d3d3d]">→</span>
                  <span className="text-[#cccccc]">High-level Control</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-[#666666]">Arduino Mega</span>
                  <span className="text-[#3d3d3d]">→</span>
                  <span className="text-[#cccccc]">Low-level Control</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-[#666666]">ODrive V3.6</span>
                  <span className="text-[#3d3d3d]">→</span>
                  <span className="text-[#cccccc]">Motor Control</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-[#666666]">Sensors</span>
                  <span className="text-[#3d3d3d]">→</span>
                  <span className="text-[#cccccc]">LiDAR, IMU, Cameras</span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-[#3d3d3d]">
                <div className="text-xs text-[#666666] mb-2">Communication</div>
                <div className="flex gap-2">
                  <Badge className="bg-[#1a1a1a] text-[#cccccc]">UART</Badge>
                  <Badge className="bg-[#1a1a1a] text-[#cccccc]">I2C</Badge>
                  <Badge className="bg-[#1a1a1a] text-[#cccccc]">SPI</Badge>
                  <Badge className="bg-[#1a1a1a] text-[#cccccc]">WiFi</Badge>
                  <Badge className="bg-[#1a1a1a] text-[#cccccc]">USB</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Software & Control Section */}
      <section 
        id="software" 
        className="py-24 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${
            visibleSections.has('software') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Software & Control</h2>
            <p className="text-[#666666] max-w-2xl mx-auto">
              Multiple control interfaces for different use cases and skill levels.
            </p>
          </div>
          
          <Tabs defaultValue="rc" className="w-full">
            <div className="grid lg:grid-cols-3 gap-8">
              <div 
                className={`lg:col-span-1 transition-all duration-700 ${
                  visibleSections.has('software') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                }`}
              >
                <TabsList className="flex flex-col w-full h-auto gap-2 bg-transparent">
                  {controlMethods.map((method) => (
                    <TabsTrigger 
                      key={method.id}
                      value={method.id}
                      className="w-full justify-start gap-3 p-4 data-[state=active]:bg-[#141414] data-[state=active]:border-[#d0ff59] border border-transparent rounded-xl transition-all"
                    >
                      <method.icon className="w-5 h-5" />
                      <span>{method.title}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              
              <div 
                className={`lg:col-span-2 transition-all duration-700 ${
                  visibleSections.has('software') ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
                style={{ transitionDelay: '200ms' }}
              >
                {controlMethods.map((method) => (
                  <TabsContent key={method.id} value={method.id} className="mt-0">
                    <Card className="bg-[#141414] border-[#3d3d3d]">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <method.icon className="w-6 h-6 text-[#d0ff59]" />
                          {method.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[#666666] mb-6">{method.description}</p>
                        <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#3d3d3d]">
                          <div className="flex items-center gap-2 mb-3">
                            <Terminal className="w-4 h-4 text-[#d0ff59]" />
                            <span className="text-xs text-[#666666]">Example Code</span>
                          </div>
                          <pre className="mono text-sm text-[#cccccc] overflow-x-auto">
                            <code>{method.code}</code>
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </div>
            </div>
          </Tabs>
        </div>
      </section>

      {/* Setup Guide Section */}
      <section 
        id="setup" 
        className="py-24 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${
            visibleSections.has('setup') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <Badge 
              variant="outline" 
              className="mb-4 border-[#d0ff59] text-[#d0ff59]"
            >
              GETTING STARTED
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Setup Guide</h2>
            <p className="text-[#666666] max-w-2xl mx-auto">
              Follow these step-by-step instructions to set up your ROMR from scratch. 
              Each section includes the necessary commands and configurations.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {setupSteps.map((step, index) => (
              <Card 
                key={step.title}
                className={`bg-[#141414] border-[#3d3d3d] overflow-hidden transition-all duration-700 hover:border-[#d0ff59]/50 ${
                  visibleSections.has('setup') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#d0ff59]/10 flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-[#d0ff59]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                      <p className="text-sm text-[#666666]">{step.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#3d3d3d] overflow-x-auto">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#d0ff59]" />
                        <span className="text-xs text-[#666666]">Terminal</span>
                      </div>
                      <CopyButton commands={step.commands.join('\n')} />
                    </div>
                    <pre className="mono text-xs text-[#cccccc]">
                      <code>{step.commands.join('\n')}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Quick Start Tips */}
          <div 
            className={`mt-12 bg-gradient-to-r from-[#d0ff59]/10 to-transparent rounded-2xl p-8 border border-[#d0ff59]/30 transition-all duration-700 ${
              visibleSections.has('setup') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#d0ff59]" />
              Quick Start Tips
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#d0ff59] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#cccccc]">Use a 32GB+ microSD card for Jetson Nano</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#d0ff59] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#cccccc]">Connect 22nF capacitors to hall sensors for noise filtering</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#d0ff59] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#cccccc]">Use separate power sources for ODrive and Jetson to avoid ground loops</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#d0ff59] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#cccccc]">Wait for ODrive calibration to complete before sending commands</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#d0ff59] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#cccccc]">Add 50W power resistor when running on battery</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#d0ff59] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#cccccc]">Use udev rules for consistent USB device naming</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Wiring Reference */}
          <div 
            className={`mt-8 bg-[#141414] rounded-2xl p-8 border border-[#3d3d3d] transition-all duration-700 ${
              visibleSections.has('setup') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '700ms' }}
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#d0ff59]" />
              Key Wiring Connections
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-[#d0ff59] mb-2">ODrive → Motors</h4>
                <ul className="text-xs text-[#666666] space-y-1">
                  <li>M0: Motor 0 phases (any order)</li>
                  <li>M1: Motor 1 phases (any order)</li>
                  <li>J4: Hall sensors (5 wires)</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#d0ff59] mb-2">Arduino → ODrive</h4>
                <ul className="text-xs text-[#666666] space-y-1">
                  <li>RX (Pin 18) → ODrive TX</li>
                  <li>TX (Pin 17) → ODrive RX</li>
                  <li>GND → GND</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#d0ff59] mb-2">RC Receiver → Arduino</h4>
                <ul className="text-xs text-[#666666] space-y-1">
                  <li>CH1 → Pin 2 (Throttle)</li>
                  <li>CH2 → Pin 3 (Steering)</li>
                  <li>CH3 → Pin 18 (Enable)</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#d0ff59] mb-2">MPU-9250 → Arduino</h4>
                <ul className="text-xs text-[#666666] space-y-1">
                  <li>VCC → 3.3V</li>
                  <li>GND → GND</li>
                  <li>SDA → Pin 20</li>
                  <li>SCL → Pin 21</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section 
        id="gallery" 
        className="py-24 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${
            visibleSections.has('gallery') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Gallery</h2>
            <p className="text-[#666666] max-w-2xl mx-auto">
              See ROMR in action - from lab testing to real-world deployment.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryImages.map((image, index) => (
              <div 
                key={image.src}
                className={`group relative overflow-hidden rounded-xl aspect-video bg-[#141414] transition-all duration-700 hover:scale-[1.02] ${
                  visibleSections.has('gallery') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <img 
                  src={image.src} 
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4">
                    <p className="text-sm text-white">{image.alt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Build Instructions Section */}
      <section 
        id="build" 
        className="py-24 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${
            visibleSections.has('build') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Build Your Own</h2>
            <p className="text-[#666666] max-w-2xl mx-auto">
              Follow these steps to assemble your ROMR from scratch.
            </p>
          </div>
          
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#d0ff59] via-[#3d3d3d] to-[#3d3d3d] hidden md:block" />
            
            <div className="space-y-8">
              {buildSteps.map((step, index) => (
                <div 
                  key={step.title}
                  className={`relative flex gap-8 transition-all duration-700 ${
                    visibleSections.has('build') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {/* Timeline Node */}
                  <div className="hidden md:flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[#141414] border-2 border-[#d0ff59] flex items-center justify-center font-bold text-[#d0ff59] z-10">
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Content Card */}
                  <Card className="flex-1 bg-[#141414] border-[#3d3d3d] hover:border-[#d0ff59]/50 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <span className="md:hidden w-8 h-8 rounded-full bg-[#d0ff59] text-black flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        {step.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[#666666] mb-4">{step.description}</p>
                      <div className="space-y-2">
                        {step.details.map((detail) => (
                          <div key={detail} className="flex items-center gap-2 text-sm text-[#cccccc]">
                            <CheckCircle2 className="w-4 h-4 text-[#d0ff59]" />
                            {detail}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#141414] to-[#0a0a0a]" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, #d0ff59 0%, transparent 50%)',
          }}
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Ready to Build the <span className="text-gradient">Future</span>?
          </h2>
          <p className="text-xl text-[#666666] mb-10 max-w-2xl mx-auto">
            Join the open-source robotics community. Download the design files, 
            build your ROMR, and start innovating today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-[#d0ff59] text-black hover:bg-[#b8e650] font-semibold text-lg px-8"
              onClick={() => window.open('https://doi.org/10.17605/OSF.IO/K83X7', '_blank')}
            >
              <Download className="w-5 h-5 mr-2" />
              Download Files
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-[#3d3d3d] hover:border-[#d0ff59] hover:text-[#d0ff59] text-lg px-8"
              onClick={() => window.open('https://osf.io/ku8ag', '_blank')}
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-8 text-[#666666]">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              <span className="text-sm">Open Source</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <span className="text-sm">Documentation</span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              <span className="text-sm">Community</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#3d3d3d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#d0ff59] rounded-lg flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-black" />
                </div>
                <span className="font-bold text-xl">ROMR</span>
              </div>
              <p className="text-sm text-[#666666]">
                ROS-based Open-source Mobile Robot for research, education, and logistics.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-[#666666]">
                <li><a href="https://doi.org/10.17605/OSF.IO/K83X7" className="hover:text-[#d0ff59] transition-colors">Design Files</a></li>
                <li><a href="https://osf.io/ku8ag" className="hover:text-[#d0ff59] transition-colors">Demo Video</a></li>
                <li><a href="#" className="hover:text-[#d0ff59] transition-colors">Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Paper</h4>
              <ul className="space-y-2 text-sm text-[#666666]">
                <li><a href="https://doi.org/10.1016/j.ohx.2023.e00426" className="hover:text-[#d0ff59] transition-colors">HardwareX Journal</a></li>
                <li><span className="text-[#3d3d3d]">DOI: 10.1016/j.ohx.2023.e00426</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Institution</h4>
              <p className="text-sm text-[#666666]">
                Chair of Cyber-Physical Systems<br />
                Montanuniversität Leoben<br />
                Austria
              </p>
            </div>
          </div>
          
          <div className="pt-8 border-t border-[#3d3d3d] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#666666]">
              © 2023 Nwankwo et al. Published under CC BY-NC-ND 4.0.
            </p>
            <p className="text-sm text-[#666666]">
              Funded by DFG #430054590 (TRAIN)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
