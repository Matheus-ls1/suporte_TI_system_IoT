import time
from lcd_api import LcdApi

class I2cLcd(LcdApi):
    MASK_RS = 0x01
    MASK_RW = 0x02
    MASK_E  = 0x04
    SHIFT_BACKLIGHT = 3
    SHIFT_DATA      = 4

    def __init__(self, i2c, i2c_addr, num_lines, num_columns):
        self.i2c = i2c
        self.i2c_addr = i2c_addr
        self.i2c.writeto(self.i2c_addr, bytearray([0]))
        time.sleep_ms(20)
        self.hal_write_init_nibble(self.LCD_FUNCTION_8BIT)
        time.sleep_ms(5)
        self.hal_write_init_nibble(self.LCD_FUNCTION_8BIT)
        time.sleep_ms(1)
        self.hal_write_init_nibble(self.LCD_FUNCTION_8BIT)
        time.sleep_ms(1)
        self.hal_write_init_nibble(self.LCD_FUNCTION_8BIT >> 4)
        time.sleep_ms(1)
        super().__init__(num_lines, num_columns)
        self.hal_write_command(self.LCD_FUNCTION | self.LCD_FUNCTION_2LINES | self.LCD_FUNCTION_10DOTS)

    def hal_write_init_nibble(self, nibble):
        byte = ((nibble >> 4) & 0x0f) << self.SHIFT_DATA
        self.i2c.writeto(self.i2c_addr, bytearray([byte | self.MASK_E]))
        self.i2c.writeto(self.i2c_addr, bytearray([byte]))

    def hal_backlight_on(self):
        self.i2c.writeto(self.i2c_addr, bytearray([1 << self.SHIFT_BACKLIGHT]))

    def hal_backlight_off(self):
        self.i2c.writeto(self.i2c_addr, bytearray([0]))

    def hal_write_command(self, cmd):
        byte = ((cmd >> 4) & 0x0f) << self.SHIFT_DATA
        byte |= (1 << self.SHIFT_BACKLIGHT) if self.backlight else 0
        self.i2c.writeto(self.i2c_addr, bytearray([byte | self.MASK_E]))
        self.i2c.writeto(self.i2c_addr, bytearray([byte]))
        byte = (cmd & 0x0f) << self.SHIFT_DATA
        byte |= (1 << self.SHIFT_BACKLIGHT) if self.backlight else 0
        self.i2c.writeto(self.i2c_addr, bytearray([byte | self.MASK_E]))
        self.i2c.writeto(self.i2c_addr, bytearray([byte]))
        if cmd <= 3:
            time.sleep_ms(5)

    def hal_write_data(self, data):
        byte = (self.MASK_RS | (((data >> 4) & 0x0f) << self.SHIFT_DATA))
        byte |= (1 << self.SHIFT_BACKLIGHT) if self.backlight else 0
        self.i2c.writeto(self.i2c_addr, bytearray([byte | self.MASK_E]))
        self.i2c.writeto(self.i2c_addr, bytearray([byte]))
        byte = (self.MASK_RS | ((data & 0x0f) << self.SHIFT_DATA))
        byte |= (1 << self.SHIFT_BACKLIGHT) if self.backlight else 0
        self.i2c.writeto(self.i2c_addr, bytearray([byte | self.MASK_E]))
        self.i2c.writeto(self.i2c_addr, bytearray([byte]))