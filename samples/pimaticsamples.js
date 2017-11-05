module.exports = {
samples:[
{
	// pimatic https://github.com/pimatic/rfcontroljs/blob/master/protocols.md
    brands: ["tfa", "conrad"],
    pulseLengths: [508, 2012, 3908, 7726],
    pulseCount: 86,
    psi: '02020101010102010102020201020101020202010102020101020202010102010202020102020201010103',
} ,{
    pulseLengths: [456, 1990, 3940, 9236],
    pulseCount: 74,
    psi: '01020102020201020101010101010102010101010202020101020202010102010101020103',
} ,{
    brands: ["Velleman WS8426S"],
    pulseLengths: [492, 969, 1948, 4004],
    pulseCount: 74,
    psi:'01010102020202010201010101010101020202010201020102020202010101010101010103',
} ,{
    brands: ["Xiron Temperature & Humidity Sensor"],
    pulseLengths: [544, 1056, 1984, 3880],
    pulseCount: 84,
    psi:'020201010102020201010101010101020101020102010201020202020101020202010102010101010103',
} ,{
    brands: ["Globaltronics GT-WT-01"],
    pulseLengths: [496, 2048, 4068, 8960],
    pulseCount: 76,
    psi:'0201010202010202010101010101010101020202010201010202010202020102020201010103',
comment:`
      # Bits like:
      # 0111 0001 1000 0000 1001 0001 1001 0011 0010 103
`,
} ,{
 brands: ["Easy Home Advanced"],
    pulseLengths: [ 271, 1254, 10092 ],
    pulseCount: 116,
    psi: '0101000000010101010000010001010101000000010101010000010100'+
      '0100000101000101010001000100010001010001000101000000010102',
comment:`
      # '11000111100 1011110001111001101001101110101010110101100011'
      # now we extract the data from that string
      # | 11000111100 10111100011110011010011011101010   1011    01       01      100011
      # | ?          |     systemcode                  | group | state | group2 |  unit
      # IIII IIII BxCC TTTT TTTT TTTT HHHH HHHx
      # I: 8 bit ID
      # B: 0 full battery; 1 low battery
      # C: 2bit Channel: 00 -> Ch. 1; 01 -> Ch. 2; 10 -> Ch. 3 (channel 1 in this case)
      # T: 12 bit Temperature : 0000 1001 0001 -> 145 -> 14.5 (correct)
      # H: 7bit     73% (1001 001 = 73)
`,
} ,{
    brands: ["Xiron Temperature & Humidity Sensor 2"],
    pulseLengths: [492, 992, 2028, 4012],
    pulseCount: 74,
    psi:'02020202010101020201020101010101020202010202010202020202010102020101010103',
comment:`
      # binary is now something like: '11000111000000010010101011110011100100000'
      # now we extract the temperature and humidity from that string
      # 1100 0111 0000 0001 0010 1010 1111 0011 1001 0
      # IIII IIII BxCC TTTT TTTT TTTT xxxx HHHH HHHH x
      # 0    4    8    12   16   20   24   28   32
      # I: Device ID, 8-bit unsigned Int
      # B: Low-Battery Flag (1-bit, 0=Battery OK, 1=Battery Low)
      # T: Temperature Value, 12-bit signed Int (divide decimal by 10)
      # H: Humidity, 8-bit unsigned Int
      # C: Channel (2 bits + 1, 00=1, 01=2, 10=3)
      # x: Unused
`,
} ,{
    brands: ["Prologue Temperature & Humidity Sensor"],
    pulseLengths: [480, 1960, 3908, 8784],
    pulseCount: 76,
    psi: '0201010201020102010101010102020101010102010101010202020202020101020201010103',
comment:`
      # binary is now something like: '11000111000000010010101011110011100100000'
      # now we extract the temperature and humidity from that string
      # 1100 0111 0000 0001 0010 1010 1111 0011 1001 0
      # xxxx IIII IIII CCxB TTTT TTTT TTTT HHHH HHHH xx
      # 0    4    8    12   16   20   24   28   32
      # I: Device ID, 8-bit unsigned Int
      # B: Low-Battery Flag (1-bit, 0=Battery OK, 1=Battery Low)
      # T: Temperature Value, 12-bit signed Int (divide decimal by 10)
      # H: Humidity, 8-bit unsigned Int, is always 11001100 if no humidity sensor is available
      # C: Channel (2 bits + 1, 00=1, 01=2, 10=3)
      # x: Unused
`,
} ,{
    brands: ["Globaltronics GT-WT-01 variant"],
    pulseLengths: [496, 2048, 4068, 8960],
    pulseCount: 76,
    psi: '0201010202010202010101010101010101020202010201010202010202020102020201010103',
comment:`
      # Bits like:
      # 1001 1001 0000 0100 0000 1010 0000 0011 1010 103
      # IIII IIII IIII BxCC TTTT TTTT TTTT HHHH HHHH
      # I: 8 bit ID
      # B: 0 full battery; 1 low battery
      # C: 2bit Channel: 00 -> Ch. 1; 01 -> Ch. 2; 10 -> Ch. 3 (channel 1 in this case)
      # T: 12 bit Temperature : 0000 1001 0001 -> 145 -> 14.5 (correct)
      # H: 8bit     73% (1001 001 = 73)
`,
} ,{
    brands: ["Ea2 labs Bl999"],
    pulseLengths: [500, 1850, 3900, 9000],
    pulseCount: 74,
	psi:'02020202010202010101020101010201010101010201010101010101010102020102010203',
comment:`
      # we first map: 01 => binary 0, 02 => binary 1, 03 => footer
	  # binary is now something like: '111101100010001000001000000000110101'
	  # nibble:        T1     | |     T2    | |     T3    | |     T4    | |     T5
	  #  bit:      A0|A1|A2|A3| |B0|B1|B2|B3| |C0|C1|C2|C3| |D0|D1|D2|D3| |E0|E1|E2|E3
	  #            1 |1 |1 |1 | |0 |1 |1 |0 | |0 |0 |1 |0 | |0 |0 |1 |0 | |0 |0 |0 |0
	  #
	  #  nibble:        T6    | |     T7    | |     T8    | |     T9
	  #  bit:      F0|F1|F2|F3| |G0|G1|G2|G3| |H0|H1|H2|H3| |I0|I1|I2|I3
	  #            1 |0 |0 |0 | |0 |0 |0 |0 | |0 |0 |1 |1 | |0 |1 |0 |1
	  #
	  #	A0-A3,B2-B3 - ID
	  #	B0-B1 - Channel: 01 - 1, 10 - 2, 11 - 3
	  #	C0 - battery: 0 -  ok, 1 - low
	  #	C1-C3 - unknown
	  #	D0-F3 - temperature
	  #	G0-H3 - humidity
    #	I0-I3 - check sum
`,
} ,{
    brands: ["TFA 30.3125"],
    pulseLengths: [444, 1160, 28580],
    pulseCount: 88,
    psi: '',
comment:`
      # tens place of temperature/humidity value (5 to be subtracted from temperature)
      p0 = helper.binaryToNumber(binary, 20, 23)
      # ones place of temperature/humidity value
      p1 = helper.binaryToNumber(binary, 24, 27)
      # decimal fraction of temperature/humidity value
      p2 = helper.binaryToNumber(binary, 28, 31)
      # id will change if battery is replaced
`,
} ,{
   brands: ["Mebus/Renkforce E0190T"],
    pulseLengths: [496, 960, 1940, 3904],
    pulseCount: 76,
    psi:'0101020102020102020101010101010102020202010102020202020201010102020101020003',
comment:`
      # binary is now something like: '11000111000000010010101011110011100100000'
      # now we extract the temperature and humidity from that string
      # 1100 0111 0000 0001 0010 1010 1111 0011 1001 0
      # IIII IIII xxCC TTTT TTTT TTTT xxxx xxxx xxxx xx
      # 0    4    8    12   16   20   24   28   32
      # I: Device ID, 8-bit unsigned Int
      # B: Low-Battery Flag (1-bit, 0=Battery OK, 1=Battery Low)
      # T: Temperature Value, 12-bit signed Int (divide decimal by 10)
      # H: Humidity, 8-bit unsigned Int
      # C: Channel (2 bits + 1, 00=1, 01=2, 10=3)
      # x: Unused
`,
} ,{
    brands: ["Landmann BBQ Thermometer"],
    pulseLengths: [548, 1008, 1996, 3936],
    pulseCount: 66,
    psi:'020202010101010101010101010101020101010102010201020101010201020203',
comment:`
      # binary is now something like: '11100000000000010000101010001011'
      # now we extract the temperature and humidity from that string
      # 1110 0000 0000 0001 0000 1010 1000 1011
      # IIII IICC TTTT TTTT TTTT TTTT xxxx xxxx
      # 0    4    8    12   16   20   24   28
      # I: Device ID, 6-bit unsigned Int
      # C: Channel (2 bits + 1, 00=1, 01=2, 10=3)
      # T: Temperature Value, 16-bit signed Int (divide decimal by 10)
      # x: Unused
`,
} ,{
     brands: ["Auriol", "Pollin (EWS-151)"],
     pulseLengths: [492, 969, 1948, 4004],
     pulseCount: 74,
     psi:'01010102020202010201010101010101020202010201020102020202010101010101010103',
comment:`
       # we first map: 01 => 0, 02 => 1, 03 => nothing
       # binary is now something like: '000111101000000011101010111100000000'
       # now we extract the temperature from that string
       # | 000111101000| 000011101010 | 111100000000 |
       # | ?           | Temp.        | ?            |
`,
} ,{
    brands: ["tfa", "conrad"],
    pulseLengths: [508, 2012, 3908, 7726],
    pulseCount: 86,
    psi: '02020101010102010102020201020101020202010102020101020202010102010202020102020201010103',
comment:`
      # binary is now something like: '001111011000101100011001100011010001000111'
      # based on this example : T17.8 H64 :0000001111001001000000011000000100000000117582
      # 00: don't know/care
      # 00001111 : Station ID
      # 00 : don't know/care
      # 10 : channel (00 means Ch 1, 01 Ch 2, 10 Ch3)
      # 0100 0000 0110 : temperature is sent by the sensor in °F (and not °C)
      # the lowest value that the protocol support is 90°F (000000000000).
      # Again you have to swap (321) the column order, in our example it give us 0110 0000 0100
      # which is 1540 in decimal
      # So the rule is 1540/10 - 90 = 64 °F (17.78 °C) (this rule works fine for all temp
      # positive/negative)
`,
} ,{
    brands: ["Auriol"],
    pulseLengths:  [ 526, 990, 1903, 4130, 7828, 16076 ],
    pulseCount: 92,
    psi: '11111111040203020202020202030202020203020302030203030303020303020303020202020302020202020305',
comment:`
      # binary is now something like: '0110001100000000011000011101011100110001'
      # based on this example : T18,8 H71 :1110111001010101011000011000011100010001
      # 11101110-0101-0101-011000011000-0111-0001-0001
      # 11101110 : Station ID (random after restart)
      # 0101 : Check Sum
      # 0101 : Batterie 0000=full(3V) 0100=2,6V
      # 0100 0000 0110 : temperature is sent by the sensor in °F (and not °C)
      # 0111-0001 : humidity first col is tenner, second col is one (einer) { 0111=7  0001=1  }= 71%H
      # 0001 : Channel (0001 = 1, xxxx = ?, xxxx = ?)
      # the lowest value that the protocol support is 90°F (000000000000).
      # In our example it give us 0110 0001 1000
      # which is 1560 in decimal
      # So the rule is 1560/10 - 90 = 66 °F (18,8 °C) (this rule works fine for all temp
      # positive/negative)
`,
} ,{
    brands: ["Auriol", "Ventus", "Hama", "Meteoscan", "Alecto", "Balance"],
    pulseLengths:  [ 534, 2000, 4000, 9000 ],
    pulseCount: 74,
    psi: '01020101010201020102010101020202020202010101010102020201010202010202020203',
comment:`
      #Supported stations
      #- Auriol H13726
      #- Ventus WS155
      #- Hama EWS 1500
      #- Meteoscan W155/W160
      #- Alecto WS4500
      #- Alecto WS3500
      #- Ventus W044
      #- Balance RF-WS105
      #
      # binary is now something like: '01000101 0100 011111100000 11100110 1111'
      # based on this example : T12,6 H65
      # 01000101 0100 011111100000 11100110 1111
      # 01000101 : Station ID (random after restart)
      # 0100 : states
      # 01111110000011100110 : data
      # 1111 : check sum (n8 = ( 0xf - n0 - n1 - n2 - n3 - n4 - n5 - n6 - n7) & 0xf)
      # the states showing which data is transmitted
      # 0  1  0  0
      # |  |  |  |-> 0: Scheduled transmission.
      # |  |  |  |-> 1: The transmission was initiated by pressing the button inside the sensor unit
      # |  |--|----> 00,01,10: Temperature and Humidity is transmitted. 11: Non temp/hum data
      # |----------> 0: Sensor's battery voltage is normal. 1: Battery voltage is below ~2.6 V.
      #
`,
} ,{
 brands: ["CoCo Technologies", "D-IO (Chacon)", "Intertechno", "KlikAanKlikUit", "Nexa"],
     pulseLengths: [268, 1282, 2632, 10168],
     pulseCount: 132,
     psi:'020001000101000001000100010100010001000100000101000001'+
       '000101000001000100010100000100010100010000010100000100010100000100010001000103',
comment:`
       # binary is now something like: '00100011110100100010011010010000'
       # now we extract the temperature and humidity from that string
       # | 00100011110100100010011010 |   0 |     1 | 0000 |
       # | ID                         | All | State | unit |
`,
} ,{
 brands: ["Elro", "Elro Home Easy"],
    pulseLengths: [306, 957, 9808],
    pulseCount: 50,
    psi:'01010101011001100101010101100110011001100101011002',
comment:`
      # binary is now something like: '110011000010'
      # now we extract the temperature and humidity from that string
      # |     11001 |    10000 |     1 |              0 |
      # | HouseCode | UnitCode | State | inverted state |
`,
} ,{
 brands: ["Brennenstuhl Comfort", "Elro Home Control"],
    pulseLengths: [306, 957, 9808],
    pulseCount: 50,
    psi:'01010101011001100101010101100110011001100101011002',
comment:`
      # binary is now something like: '110011000010'
      # now we extract the temperature and humidity from that string
      # |     11001 |    10000 |              1 |    0 |
      # | HouseCode | UnitCode | inverted State | State|
`,
} ,{
 brands: ["Cogex", "KlikAanKlikUit", "Intertechno", "Düwi Terminal"],
    pulseLengths: [306, 957, 9808],
    pulseCount: 50,
    psi:'01010110010101100110011001100110010101100110011002',
comment:`
      # binary is now something like: '10100 00010 00'
      # now we extract the temperature and humidity from that string
      # |    10100 | 00010 |      0 |             0 |
      # |     Unit |    ID |  fixed | inverted state|
`,
}
]
}
;
