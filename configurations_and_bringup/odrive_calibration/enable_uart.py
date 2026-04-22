#!/usr/bin/env python
"""
Enable UART A on the ODrive for Arduino communication.

Non-destructive: does NOT erase calibration or any other config.

Pin mapping on ODrive v3.6:
  GPIO 1 = RX (receive from Arduino TX)
  GPIO 2 = TX (transmit to Arduino RX)

Wiring to Arduino Mega:
  Mega pin 16 (TX2) --> ODrive GPIO 1
  Mega pin 17 (RX2) --> ODrive GPIO 2
  Mega GND          --> ODrive GND   (REQUIRED)
"""

import odrive
from odrive.enums import GPIO_MODE_UART_A

print("Connecting...")
odrv = odrive.find_any()
print(f"Connected. Serial: {odrv.serial_number}")

print("Before:")
print(f"  enable_uart_a   = {odrv.config.enable_uart_a}")
print(f"  uart_a_baudrate = {odrv.config.uart_a_baudrate}")
print(f"  gpio1_mode      = {odrv.config.gpio1_mode}")
print(f"  gpio2_mode      = {odrv.config.gpio2_mode}")

odrv.config.enable_uart_a = True
odrv.config.uart_a_baudrate = 115200
odrv.config.gpio1_mode = GPIO_MODE_UART_A
odrv.config.gpio2_mode = GPIO_MODE_UART_A

print("After:")
print(f"  enable_uart_a   = {odrv.config.enable_uart_a}")
print(f"  uart_a_baudrate = {odrv.config.uart_a_baudrate}")
print(f"  gpio1_mode      = {odrv.config.gpio1_mode}")
print(f"  gpio2_mode      = {odrv.config.gpio2_mode}")

print("Saving and rebooting...")
try:
    odrv.save_configuration()
except Exception as e:
    print(f"  save raised {type(e).__name__}: {e}")
try:
    odrv.reboot()
except Exception:
    pass

print("Done. ODrive UART is now ready for Arduino communication.")
