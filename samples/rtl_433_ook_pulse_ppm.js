module.exports = {
r_devices:[
/** acurite.c
    Acurite weather stations and temperature / humidity sensors

    Copyright (c) 2015, Jens Jenson, Helge Weissig, David Ray Thompson, Robert Terzi

    Devices decoded:
    - 5-n-1 weather sensor, Model; VN1TXC, 06004RM
    - 5-n-1 pro weather sensor, Model: 06014RM
    - 896 Rain gauge, Model: 00896
    - 592TXR / 06002RM Tower sensor (temperature and humidity)
      (Note: Some newer sensors share the 592TXR coding for compatibility.
    - 609TXC "TH" temperature and humidity sensor (609A1TX)
    - Acurite 986 Refrigerator / Freezer Thermometer
    - Acurite 606TX temperature sensor
    - Acurite 6045M Lightning Detector (Work in Progress)
    - Acurite 00275rm and 00276rm temp. and humidity with optional probe.
// ** Acurite 5n1 functions **

#define ACURITE_TXR_BITLEN        56
#define ACURITE_5N1_BITLEN        64
#define ACURITE_6045_BITLEN        72
*/
/* r_device acurite_rain_896 =  */{
    name:           "Acurite 896 Rain Gauge",
    modulation:     "OOK_PULSE_PPM",
    short_width:    1000,
    long_width:     2000,
    gap_limit:      3500,
    reset_limit:    5000,
    decodefn:      "acurite_rain_896_decode",
// Disabled by default due to false positives on oregon scientific v1 protocol see issue #353
    disabled:       1,
    fields:         "acurite_rain_gauge_output_fields",
},
/*
static char *acurite_th_output_fields[] = {
    "model",
    "id",
    "battery",
    "temperature_C",
    "humidity",
    "status",
    NULL,
},
*/
/* r_device acurite_th =  */{
    name:           "Acurite 609TXC Temperature and Humidity Sensor",
    modulation:     "OOK_PULSE_PPM",
    short_width:    1000,
    long_width:     2000,
    gap_limit:      3000,
    reset_limit:    10000,
    decodefn:      "acurite_th_decode",
    disabled:       0,
    fields:         "acurite_th_output_fields",
},
/*
 * For Acurite 592 TXR Temp/Humidity, but
 * Should match Acurite 592TX, 5-n-1, etc.
 * /
static char *acurite_txr_output_fields[] = {
    "model",
    "subtype",
    "message_type", // TODO: remove this
    "id",
    "sensor_id", // TODO: remove this
    "channel",
    "sequence_num",
    "battery_low", // TODO: remove this
    "battery_ok",
    "battery",
    "temperature_C",
    "temperature_F",
    "humidity",
    "wind_speed_mph", // TODO: remove this
    "wind_speed_kph", // TODO: remove this
    "wind_avg_mi_h",
    "wind_avg_km_h",
    "wind_dir_deg",
    "rain_inch", // TODO: remove this
    "rain_in",
    "rain_mm",
    NULL,
},
*/
/* r_device acurite_txr =  */{
    name:           "Acurite 592TXR Temp/Humidity, 5n1 Weather Station, 6045 Lightning",
    modulation:     "OOK_PULSE_PWM",
    short_width:    220,  // short pulse is 220 us + 392 us gap
    long_width:     408,  // long pulse is 408 us + 204 us gap
    sync_width:     620,  // sync pulse is 620 us + 596 us gap
    gap_limit:      500,  // longest data gap is 392 us, sync gap is 596 us
    reset_limit:    4000, // packet gap is 2192 us
    decodefn:      "acurite_txr_decode",
    disabled:       0,
    fields:         "acurite_txr_output_fields",
},

/*
 * Acurite 00986 Refrigerator / Freezer Thermometer
 *
 * Temperature only, Pulse Position
 *
 * A preamble: 2x of 216 us pulse + 276 us gap, 4x of 1600 us pulse + 1560 us gap
 * 39 bits of data: 220 us pulses with short gap of 520 us or long gap of 880 us
 * A transmission consists of two packets that run into each other.
 * There should be 40 bits of data though. But the last bit can't be detected.
 * /
static char *acurite_986_output_fields[] = {
    "model",
    "id",
    "channel",
    "battery",
    "temperature_F",
    "status",
    NULL,
},
*/
/* r_device acurite_986 =  */{
    name:           "Acurite 986 Refrigerator / Freezer Thermometer",
    modulation:     "OOK_PULSE_PPM",
    short_width:    520,
    long_width:     880,
    gap_limit:      1280,
    reset_limit:    4000,
    decodefn:      "acurite_986_decode",
    disabled:       0,
    fields:         "acurite_986_output_fields",
},

/*
 * Acurite 00606TX Tower Sensor
 *
 * Temperature only
 *
 * /

static char *acurite_606_output_fields[] = {
    "model",
    "id",
    "battery",
    "temperature_C",
    "mic",
    NULL,
},
*/
/* r_device acurite_606 =  */{
    name:           "Acurite 606TX Temperature Sensor",
    // actually tests/acurite/02/gfile002.cu8, check this
    //modulation:     "OOK_PULSE_PWM",
    //short_width:    576,
    //long_width:     1076,
    //gap_limit:      1200,
    //reset_limit:    12000,
    modulation:     "OOK_PULSE_PPM",
    short_width:    2000,
    long_width:     4000,
    gap_limit:      7000,
    reset_limit:    10000,
    decodefn:      "acurite_606_decode",
    disabled:       0,
    fields:         "acurite_606_output_fields",
},
/*** @file
    AlectoV1 Weather Sensor protocol.
*/
/** @fn int alectov1_callback(r_device *decoder, bitbuffer_t *bitbuffer)
AlectoV1 Weather Sensor decoder.
Documentation also at http://www.tfd.hu/tfdhu/files/wsprotocol/auriol_protocol_v20.pdf

Also Unitec W186-F (bought from Migros).

PPM with pulse width 500 us, long gap 4000 us, short gap 2000 us, sync gap 9000 us.

Some sensors transmit 8 long pulses (1-bits) as first row.
Some sensors transmit 3 lone pulses (sync bits) between packets.

Message Format: (9 nibbles, 36 bits):
Please note that bytes need to be reversed before processing!

Format for Temperature Humidity:

    IIIICCII BMMP TTTT TTTT TTTT HHHHHHHH CCCC
    RC       Type Temperature___ Humidity Checksum

- I: 8 bit Random Device ID, includes 2 bit channel (X, 1, 2, 3)
- B: 1 bit Battery status (0 normal, 1 voltage is below ~2.6 V)
- M: 2 bit Message type, Temp/Humidity if not '11' else wind/rain sensor
- P: 1 bit a 0 indicates regular transmission, 1 indicates requested by pushbutton
- T: 12 bit Temperature (two's complement)
- H: 8 bit Humidity BCD format
- C: 4 bit Checksum

Format for Rain:

    IIIIIIII BMMP 1100 RRRR RRRR RRRR RRRR CCCC
    RC       Type      Rain                Checksum

- I: 8 bit Random Device ID, includes 2 bit channel (X, 1, 2, 3)
- B: 1 bit Battery status (0 normal, 1 voltage is below ~2.6 V)
- M: 2 bit Message type, Temp/Humidity if not '11' else wind/rain sensor
- P: 1 bit a 0 indicates regular transmission, 1 indicates requested by pushbutton
- R: 16 bit Rain (bitvalue * 0.25 mm)
- C: 4 bit Checksum

Format for Windspeed:

    IIIIIIII BMMP 1000 0000 0000 WWWWWWWW CCCC
    RC       Type                Windspd  Checksum

- I: 8 bit Random Device ID, includes 2 bit channel (X, 1, 2, 3)
- B: 1 bit Battery status (0 normal, 1 voltage is below ~2.6 V)
- M: 2 bit Message type, Temp/Humidity if not '11' else wind/rain sensor
- P: 1 bit a 0 indicates regular transmission, 1 indicates requested by pushbutton
- W: 8 bit Windspeed  (bitvalue * 0.2 m/s, correction for webapp = 3600/1000 * 0.2 * 100 = 72)
- C: 4 bit Checksum


Format for Winddirection & Windgust:

    IIIIIIII BMMP 111D DDDD DDDD GGGGGGGG CCCC
    RC       Type      Winddir   Windgust Checksum

- I: 8 bit Random Device ID, includes 2 bit channel (X, 1, 2, 3)
- B: 1 bit Battery status (0 normal, 1 voltage is below ~2.6 V)
- M: 2 bit Message type, Temp/Humidity if not '11' else wind/rain sensor
- P: 1 bit a 0 indicates regular transmission, 1 indicates requested by pushbutton
- D: 9 bit Wind direction
- G: 8 bit Windgust (bitvalue * 0.2 m/s, correction for webapp = 3600/1000 * 0.2 * 100 = 72)
- C: 4 bit Checksum
*/
/* r_device alectov1 =  */{
    name:           "AlectoV1 Weather Sensor (Alecto WS3500 WS4500 Ventus W155/W044 Oregon)",
    modulation:     "OOK_PULSE_PPM",
    short_width:    2000,
    long_width:     4000,
    gap_limit:      7000,
    reset_limit:    10000,
    decodefn:      "alectov1_callback",
    disabled:       0,
    fields: "output_fields",
},
/** @file
    Ambient Weather TX-8300 (also sold as TFA 30.3211.02).

    Copyright (C) 2018 ionum-projekte and Roger

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/** @fn int ambientweather_tx8300_callback(r_device *decoder, bitbuffer_t *bitbuffer)
Ambient Weather TX-8300 (also sold as TFA 30.3211.02).

1970us pulse with variable gap (third pulse 3920 us).
Above 79% humidity, gap after third pulse is 5848 us.

- Bit 1 : 1970us pulse with 3888 us gap
- Bit 0 : 1970us pulse with 1936 us gap

74 bit (2 bit preamble and 72 bit data => 9 bytes => 18 nibbles)
The preamble seems to be a repeat counter (00, and 01 seen),
the first 4 bytes are data,
the second 4 bytes the same data inverted,
the last byte is a checksum.

Preamble format (2 bits):

    [1 bit (0)] [1 bit rolling count]

Payload format (32 bits):

    HHHHhhhh ??CCNIII IIIITTTT ttttuuuu

- H = First BCD digit humidity (the MSB might be distorted by the demod)
- h = Second BCD digit humidity, invalid humidity seems to be 0x0e
- ? = Likely battery flag, 2 bits
- C = Channel, 2 bits
- N = Negative temperature sign bit
- I = ID, 7-bit
- T = First BCD digit temperature
- t = Second BCD digit temperature
- u = Third BCD digit temperature

The Checksum seems to covers the 4 data bytes and is something like Fletcher-8.
*/
/* r_device ambientweather_tx8300 =  */{
        name:        "Ambient Weather TX-8300 Temperature/Humidity Sensor",
        modulation:  "OOK_PULSE_PPM",
        short_width: 2000,
        long_width:  4000,
        gap_limit:   6500,
        reset_limit: 8000,
        decodefn:   "ambientweather_tx8300_callback",
        disabled:    0,
        fields:      "output_fields",
},
/** @file
    Auriol AFW 2 A1 sensor.

    Copyright (C) 2019 LiberationFrequency

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/

/**
Lidl Auriol AFW 2 A1 sensor (IAN 311588).

Technical data for the external sensor:
- Temperature measuring range/accuracy:       -20 to +65°C (-4 to +149°F) / ±1.5 °C (± 2.7 °F)
- Relative humidity measuring range/accuracy: 20 to 99% / ± 5%
- Relative humidity resolution:               1%
- Transmission frequencies:                   433 MHz (ch1:~433919300,ch2:~433915200,ch3:~433918000, various?)
- Transmission output:                        < 10 dBm / < 10 mW

The ID is retained even if the batteries are changed.
The device has three channels and a transmit button.

Data layout:
The sensor transmits 12 identical messages of 36 bits in a single package each ~60 seconds, depending on the temperature.
e.g.:

    [00] {36} 90 80 ba a3 a0 : 10010000 10000000 10111010 10100011 1010
    ...
    [11] {36} 90 80 ba a3 a0 : ...
     0           1           2           3           4
     9    0      8    0      b    a      a    3      a    0
    |1001|0000| |1000|0000| |1011|1010| |1010|0011| |1010|
    |id       | |chan|temp            | |fix |hum        |
    --------------------------------------------------------
    10010000  = id=0x90=144; 8 bit
    1         = battery_ok; 1 bit
    0         = tx_button; 1 bit
    00        = channel; 2 bit
    0000      = temperature leading sign,
                1110=0xe(-51.1°C to -25.7°C),
                1111=0xf(-25.6°C to - 0.1°C),
                0000=0x0(  0.0°C to  25,5°C),
                0001=0x1( 25.6°C to  51.1°C),
                0010=0x2( 51.2°C to  76.7°C); 4 bit
    10111010  = temperature=0xba=186=18,6°C; 8 bit
    1010      = fixed; 4 bit
    0011 1010 = humidity=0x3a=58%; 8 bit
*/
// ToDo: The timings have come about through trial and error. Audit this against weak signals!
/* r_device auriol_afw2a1 =  */{
        name:        "Auriol AFW2A1 temperature/humidity sensor",
        modulation:  "OOK_PULSE_PPM",
        short_width: 576,
        long_width:  1536,
        sync_width:  0, // No sync bit used
        gap_limit:   2012,
        reset_limit: 3954,
        decodefn:   "auriol_afw2a1_decode",
        disabled:    0, // No side effects known.
        fields:      "output_fields",
},
/** @file
    Biltema-Rain sensor.

    Copyright (C) 2017 Timopen, cleanup by Benjamin Larsson

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
Biltema-Rain sensor.

Based on the springfield.c code, there is a lack of samples and data
thus the decoder is disabled by default.

- nibble[0] and nibble[1] is the id, changes with every reset.
- nibble[2] first bit is battery (0=OK).
- nibble[3] bit 1 is tx button pressed.
- nibble[3] bit 2 = below zero, subtract temperature with 1024. I.e. 11 bit 2's complement.
- nibble[3](bit 3 and 4) + nibble[4] + nibble[5] is the temperature in Celsius with one decimal.
- nibble[2](bit 2-4) + nibble[6] + nibble[7] is the rain rate, increases 25!? with every tilt of
  the teeter (1.3 mm rain) after 82 tilts it starts over but carries the rest to the next round
  e.g tilt 82 = 2 divide by 19.23 to get mm.
- nibble[8] is checksum, have not figured it out yet. Last bit is sync? or included in checksum?.
*/
/* r_device bt_rain =  */{
        name:        "Biltema rain gauge",
        modulation:  "OOK_PULSE_PPM",
        short_width: 1940,
        long_width:  3900,
        gap_limit:   4100,
        reset_limit: 8800,
        decodefn:   "bt_rain_decode",
        disabled:    1,
        fields:      "output_fields",
},

/** @file
    Decoder for Digitech XC-0324 temperature sensor.

    Copyright (C) 2018 Geoff Lee

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/** @fn static int xc0324_callback(r_device *decoder, bitbuffer_t *bitbuffer)
Digitech XC-0324 device.

The encoding is pulse position modulation
(i.e. gap width contains the modulation information)
- pulse is about 400 us
- short gap is (approx) 520 us
- long gap is (approx) 1000 us

Deciphered using two transmitters.

A transmission package is 148 bits
(plus or minus one or two due to demodulation or transmission errors).

Each transmission contains 3 repeats of the 48 bit message,
with 2 zero bits separating each repetition.

A 48 bit message consists of:
- byte 0: preamble (for synchronisation), 0x5F
- byte 1: device id
- byte 2 and the first nibble of byte 3: encodes the temperature
    as a 12 bit integer,
    transmitted in least significant bit first order
    in tenths of degree Celsius
    offset from -40.0 degrees C (minimum temp spec of the device)
- byte 4: constant (in all my data) 0x80
    _maybe_ a battery status ???
- byte 5: a check byte (the XOR of bytes 0-4 inclusive)
    each bit is effectively a parity bit for correspondingly positioned bit
    in the real message

This decoder is associated with a tutorial entry in the
rtl_433 wiki describing the way the transmissions were deciphered.
See https://github.com/merbanan/rtl_433/wiki/digitech_xc0324.README.md

The tutorial is "by a newbie, for a newbie", ie intended to assist newcomers
who wish to learn how to decipher a new device, and develop a rtl_433 device
decoder from scratch for the first time.

To illustrate stages in the deciphering process, this decoder includes some
debug style trace messages that would normally be removed. Specifically,
running this decoder with debug level :
- `-vvv` simulates what might be seen early in the deciphering process, when
    only the modulation scheme and parameters have been discovered,
- `-vv` simulates what might be seen once the synchronisation/preamble and
    message length has been uncovered, and it is time to start work on
    deciphering individual fields in the message,
    with no debug flags set provides the final (production stage) results,
    and
- `-vvvv` is a special "finished development" output.  It provides a file of
        reference values, to be included with the test data for future
        regression test purposes.

#define XC0324_DEVICE_BITLEN      148
#define XC0324_MESSAGE_BITLEN     48
#define XC0324_MESSAGE_BYTELEN    (XC0324_MESSAGE_BITLEN + 7)/ 8
#define XC0324_DEVICE_STARTBYTE   0x5F
#define XC0324_DEVICE_MINREPEATS  3
*/
/* r_device digitech_xc0324 =  */{
    name:           "Digitech XC-0324 temperature sensor",
    modulation:     "OOK_PULSE_PPM",
    short_width:    520, // = 130 * 4
    long_width:     1000, // = 250 * 4
    reset_limit:    3000,
    decodefn:      "xc0324_callback",
    disabled:       1, // stop debug output from spamming unsuspecting users
    fields:         "output_fields",
},
/* Decoder for UHF Dish Remote Control 6.3, tested with genuine Dish remote.
 *
 * Copyright (C) 2018 David E. Tiller
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * The device uses PPM encoding,
 * 0 is encoded as 400 us pulse and 1692 uS gap,
 * 1 is encoded as 400 us pulse and 2812 uS gap.
 * The device sends 7 transmissions per button press approx 6000 uS apart.
 * A transmission starts with a 400 uS start bit and a 6000 uS gap.
 *
 * Each packet is 16 bits in length.
 * Packet bits: BBBBBB10 101X1XXX
 * B = Button pressed, big-endian
 * X = unknown, possibly channel

#define MYDEVICE_BITLEN      16
#define MYDEVICE_MINREPEATS  3
*/
/* r_device dish_remote_6_3 =  */{
    name:          "Dish remote 6.3",
    modulation:    "OOK_PULSE_PPM",
    short_width:   1692,
    long_width:    2812,
    gap_limit:     4500,
    reset_limit:   9000,
    decodefn:     "dish_remote_6_3_callback",
    disabled:      1,
    fields:        "output_fields",
},
/* r_device elv_em1000 =  */{
    name:           "ELV EM 1000",
    modulation:     "OOK_PULSE_PPM",
    short_width:    500,  // guessed, no samples available
    long_width:     1000, // guessed, no samples available
    gap_limit:      7250,
    reset_limit:    30000,
    decodefn:      "em1000_callback",
    disabled:       1,
    fields:         "elv_em1000_output_fields",
},
/** @file
    Esperanza EWS-103 sensor on 433.92Mhz.

    Copyright (C) 2015 Alberts Saulitis
    Enhanced (C) 2019 Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.
*/
/**
Largely the same as kedsum, s3318p.
\sa kedsum.c s3318p.c

Frame structure:

    Byte:      0        1        2        3        4
    Nibble:    1   2    3   4    5   6    7   8    9   10
    Type:   00 IIIIIIII ??CCTTTT TTTTTTTT HHHHHHHH FFFFXXXX

- 0: Preamble
- I: Random device ID
- C: Channel (1-3)
- T: Temperature (Little-endian)
- H: Humidity (Little-endian)
- F: Flags
- X: CRC-4 poly 0x3 init 0x0 xor last 4 bits

Sample Data:

    Esperanze EWS: TemperatureF=55.5 TemperatureC=13.1 Humidity=74 Device_id=0 Channel=1

    bitbuffer:: Number of rows: 14
    [00] {0} :
    [01] {0} :
    [02] {42} 00 53 e5 69 02 00 : 00000000 01010011 11100101 01101001 00000010 00
    [03] {0} :
    [04] {42} 00 53 e5 69 02 00 : 00000000 01010011 11100101 01101001 00000010 00
    [05] {0} :
    [06] {42} 00 53 e5 69 02 00 : 00000000 01010011 11100101 01101001 00000010 00
    [07] {0} :
    [08] {42} 00 53 e5 69 02 00 : 00000000 01010011 11100101 01101001 00000010 00
    [09] {0} :
    [10] {42} 00 53 e5 69 02 00 : 00000000 01010011 11100101 01101001 00000010 00
    [11] {0} :
    [12] {42} 00 53 e5 69 02 00 : 00000000 01010011 11100101 01101001 00000010 00
    [13] {0} :
*/
/* r_device esperanza_ews =  */{
    name:           "Esperanza EWS",
    modulation:     "OOK_PULSE_PPM",
    short_width:    2000,
    long_width:     4000,
    gap_limit:      4400,
    reset_limit:    9400,
    decodefn:      "esperanza_ews_callback",
    disabled:       0,
    fields:         "output_fields",
},
/** @file
    Eurochron temperature and humidity sensor.

    Copyright (c) 2019 by Oliver WeyhmÃ¼ller

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
Eurochron temperature and humidity sensor.

Datagram format:

    IIIIIIII B00P0000 HHHHHHHH TTTTTTTT TTTT

- I: ID (new ID will be generated at battery change!)
- B: Battery low
- P: TX-Button pressed
- H: Humidity (%)
- T: Temperature (Â°C10)
- 0: Unknown / always zero

Device type identification is only possible by datagram length
and some zero bits. Therefore this device is disabled
by default (as it could easily trigger false alarms).

Observed update intervals:
- transmission time slot every 12 seconds
- at least once within 120 seconds (with stable values)
- down to 12 seconds (with rapidly changing values)
*/
/* r_device eurochron =  */{
        name:          "Eurochron temperature and humidity sensor",
        modulation:    "OOK_PULSE_PPM",
        short_width:   1016,
        long_width:    2024,
        gap_limit:     2100,
        reset_limit:   8200,
        decodefn:     "eurochron_decode",
        disabled:      1,
        fields:        "output_fields",
},

/** @file
    Simple FS20 remote decoder.

    Copyright (C) 2019 Dominik Pusch <dominik.pusch@koeln.de>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License version 3 as
    published by the Free Software Foundation.
*/

/*
Simple FS20 remote decoder.

Frequency: use rtl_433 -f 868.35M

fs20 protocol frame info from http://www.fhz4linux.info/tiki-index.php?page=FS20+Protocol

    preamble  hc1    parity  hc2    parity  address  parity  cmd    parity  chksum  parity  eot
    13 bit    8 bit  1 bit   8 bit  1 bit   8 bit    1 bit   8 bit  1 bit   8 bit   1 bit   1 bit

with extended commands

    preamble  hc1    parity  hc2    parity  address  parity  cmd    parity  ext    parity  chksum  parity  eot
    13 bit    8 bit  1 bit   8 bit  1 bit   8 bit    1 bit   8 bit  1 bit   8 bit  1 bit   8 bit   1 bit   1 bit

checksum and parity are not checked by this decoder.
Command extensions are also not decoded. feel free to improve!
*/
/* r_device fs20 =  */{
        name:        "FS20",
        modulation:  "OOK_PULSE_PPM",
        short_width: 400,
        long_width:  600,
        reset_limit: 9000,
        decodefn:   "fs20_decode",
        disabled:    1, // missing MIC and no sample data
        fields:      "output_fields",
},
/*
 * FT-004-B Temperature Sensor
 *
 * The sensor sends a packet every 60 seconds. Each frame of 46 bits
 * is sent 3 times without padding/pauses.
 * Format: FFFFFFFF ???????? ???????? tttttttt TTT????? ??????
 *         Fixed type code: 0xf4, Temperature (t=lsb, T=msb), Unknown (?)
 *
 *     {137} 2f cf 24 78 21 c8 bf 3c 91 e0 87 22 fc f2 47 82 1c 80
 *     {137} 2f ce 24 72 a1 70 bf 38 91 ca 85 c2 fc e2 47 2a 17 00
 *
 * Aligning at [..] (insert 2 bits) we get:
 *           2f cf 24 78 21 c8 [..] 2f cf 24 78 21 c8 [..] 2f cf 24 78 21 c8
 *           2f ce 24 72 a1 70 [..] 2f ce 24 72 a1 70 [..] 2f ce 24 72 a1 70
 *
 * Copyright (C) 2017 George Hopkins <george-hopkins@null.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* r_device ft004b =  */{
    name:          "FT-004-B Temperature Sensor",
    modulation:    "OOK_PULSE_PPM",
    short_width:   1956,
    long_width:    3900,
    gap_limit:     4000,
    reset_limit:   4000,
    decodefn:     "ft004b_callback",
    disabled:      0,
    fields:        "output_fields",
},
/* Generic temperature sensor 1
 *
 * Copyright (C) 2015 Alexandre Coffignal
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 */
/*
10 24 bits frames

    IIIIIIII BBTTTTTT TTTTTTTT

- I: 8 bit ID
- B: 2 bit? Battery ?
- T: 12 bit Temp
*/
/* r_device generic_temperature_sensor =  */{
    name:          "Generic temperature sensor 1",
    modulation:    "OOK_PULSE_PPM",
    short_width:   2000,
    long_width:    4000,
    gap_limit:     4800,
    reset_limit:   10000,
    decodefn:     "generic_temperature_sensor_callback",
    disabled:      0,
    fields:        "output_fields",
},
/** @file
    Globaltronics Quigg BBQ GT-TMBBQ-05

    Copyright (C) 2019 Olaf Glage

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.
*/
/**
Globaltronics Quigg BBQ GT-TMBBQ-05.

BBQ thermometer sold at Aldi (germany)
Simple device, no possibility to select channel. Single temperature measurement.

The temperature is transmitted in Fahrenheit with an addon of 90. Accuracy is 10 bit. No decimals.
One data row contains 33 bits and is repeated 8 times. Each followed by a 0-row. So we have 16 rows in total.
First bit seem to be a static 0. By ignoring this we get nice byte boundaries.
Next 8 bits are static per device (even after battery change)
Next 8 bits contain the lower 8 bits of the temperature.
Next 8 bits are static per device (even after battery change)
Next 2 bits contain the upper 2 bits of the temperature
Next 1 bit is unknown
Next 1 bit is an odd parity bit
Last 4 bits are the sum of the preceeding 5 nibbles (mod 0xf)

Here's the data I used to reverse engineer, more sampes in rtl_test

    y001001001100010000111100110010110  [HI]
    y001001001010101010111100110010000 [507]
    y001001001010011010111100110010111  [499]
    y001001001110101110111100101010110  [381]
    y001001001110000000111100101011110  [358]
    y001001001001011010111100101010001  [211]
    y001001001001000000111100101000011  [198]
    y001001001111010110111100100000110  [145]
    y001001001101100010111100100001001  [89]
    y001001001101011010111100100010101  [83]
    y001001001101010110111100100010011  [81]
    y001001001101010010111100100000000  [79]
    y001001001101010000111100100010000  [78]
    y001001001101001110111100100011111  [77]
    y001001001101001100111100100001101  [76]
    y001001001101001010111100100001100  [75]
    y001001001101000110111100100001010  [73]
    y001001001100010100111100100010000  [48]
    y001001001011011110111100100000010  [21]
    y001001001011001110111100100011011  [13]
    y001001001010010010111100100011011  [LO]

PRE:9b TL:8h ID:8h TH:2b 6h

second device:
011100110101001001011001100010001  73
011100110101010111011001100011000  81

Frame structure:
    Byte:   H 1        2        3        4
    Type:   0 SSSSSSSS tttttttt ssssssss TT?Pcccc

- S: static per device (even after battery change)
- t: temperature+90 F lower 8 bits
- s: static per device (even after battery change)
- T: temperature+90 F upper 2 bits
- P: odd parity bit
- c: sum of first 5 nibbles
    // 33 bit, repeated multiple times (technically it is repeated 8 times, look for 5 identical versions)

*/

/* r_device gt_tmbbq05 =  */{
        name:        "Globaltronics QUIGG GT-TMBBQ-05",
        modulation:  "OOK_PULSE_PPM",
        short_width: 2000,
        long_width:  4000,
        gap_limit:   4200,
        reset_limit: 9100,
        decodefn:   "gt_tmbbq05_decode",
        disabled:    0,
        fields:      "output_fields",
},
/** @file
    GT-WT-02 sensor on 433.92MHz.

    Copyright (C) 2015 Paul Ortyl

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License version 3 as
    published by the Free Software Foundation.
*/
/**
GT-WT-02 sensor on 433.92MHz.

Example and frame description provided by https://github.com/ludwich66

   [01] {37} 34 00 ed 47 60 : 00110100 00000000 11101101 01000111 01100000
   code, BatOK,not-man-send, Channel1, +23,7Â°C, 35%

   [01] {37} 34 8f 87 15 90 : 00110100 10001111 10000111 00010101 10010000
   code, BatOK,not-man-send, Channel1,-12,1Â°C, 10%

Humidity:
- the working range is 20-90 %
- if "LL" in display view it sends 10 %
- if "HH" in display view it sends 110%

SENSOR: GT-WT-02 (ALDI Globaltronics..)

   TYP IIIIIIII BMCCTTTT TTTTTTTT HHHHHHHX XXXXX

TYPE Description:

- I = Random Device Code, changes with battery reset
- B = Battery 0=OK 1=LOW
- M = Manual Send Button Pressed 0=not pressed 1=pressed
- C = Channel 00=CH1, 01=CH2, 10=CH3
- T = Temperature, 12 Bit 2's complement, scaled by 10
- H = Humidity = 7 Bit bin2dez 00-99, Display LL=10%, Display HH=110% (Range 20-90%)
- X = Checksum, sum modulo 64

A Lidl AURIO (from 12/2018) with PCB marking YJ-T12 V02 has two extra bits in front.
*/
/* r_device gt_wt_02 =  */{
        name:        "Globaltronics GT-WT-02 Sensor",
        modulation:  "OOK_PULSE_PPM",
        short_width: 2500, // 3ms (old) / 2ms (new)
        long_width:  5000, // 6ms (old) / 4ms (new)
        gap_limit:   8000, // 10ms (old) / 9ms (new) sync gap
        reset_limit: 12000,
        decodefn:   "gt_wt_02_decode",
        disabled:    0,
        fields:      "output_fields",
},

/** @file
    inFactory outdoor temperature and humidity sensor.

    Copyright (C) 2017 Sirius Weiß <siriuz@gmx.net>
    Copyright (C) 2017 Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
inFactory Outdoor sensor transmits data temperature, humidity.

Also NC-3982-913 from Pearl (for FWS-686 station).

Transmissions also includes an id. The sensor transmits
every 60 seconds 6 packets.

    0000 1111 | 0011 0000 | 0101 1100 | 1110 0111 | 0110 0001
    xxxx xxxx | cccc cccc | tttt tttt | tttt hhhh | hhhh ??nn

- x: ID // changes on battery switch
- c: Unknown Checksum (changes on every transmit if the other values are different)
- h: Humidity // BCD-encoded, each nibble is one digit
- t: Temperature   // in °F as binary number with one decimal place + 90 °F offset
- n: Channel // Channel number 1 - 3

Usage:

    # rtl_433 -f 434052000 -R 91 -F json:log.json

Payload looks like this:

    [00] { 4} 00             : 0000
    [01] {40} 0f 30 5c e7 61 : 00001111 00110000 01011100 11100111 01100001

First row is actually the preamble part. This is added to make the signal more unique.
*/
/* r_device infactory =  */{
        name:        "inFactory, FreeTec NC-3982-913 temperature humidity sensor",
        modulation:  "OOK_PULSE_PPM",
        short_width: 1850,
        long_width:  4050,
        gap_limit:   4000, // Maximum gap size before new row of bits [us]
        reset_limit: 8500, // Maximum gap size before End Of Message [us].
        tolerance:   1000,
        decodefn:   "infactory_callback",
        disabled:    0,
        fields:      "output_fields",
},

/* Inovalley kw9015b rain and Temperature weather station
 *
 * Copyright (C) 2015 Alexandre Coffignal
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */

/* r_device kw9015b =  */{
    name:          "Inovalley kw9015b, TFA Dostmann 30.3161 (Rain and temperature sensor)",
    modulation:    "OOK_PULSE_PPM",
    short_width:   2000,
    long_width:    4000,
    gap_limit:     4800,
    reset_limit:   10000,
    decodefn:     "kw9015b_callback",
    disabled:      1,
    fields:        "kw9015b_csv_output_fields",
},
/* Interlogix/GE/UTC Wireless Device Decoder
 *
 * Copyright (C) 2017 Brent Bailey <bailey.brent@gmail.com>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.

 * Interlogix/GE/UTC Wireless 319.5 mhz Devices
 *
 * Frequency: 319508000
 *
 * Decoding done per us patent #5761206
 * https://www.google.com/patents/US5761206
 *
 * Protocol Bits
 * ________________________________
 * 00-02 976 uS RF front porch pulse
 * 03-14 12 sync pulses, logical zeros
 * 15 start pulse, logical one
 * 16-35 20 bit sensor identification code (ID bits 0-19)
 * 36-39 4 bit device type code (DT bits 0-3)
 * 40-42 3 bit trigger count (TC bit 0-2)
 * 43 low battery bit
 * 44 F1 latch bit NOTE: F1 latch bit and debounce are reversed.  Typo or endianness issue?
 * 45 F1 debounced level
 * 46 F2 latch bit
 * 47 F2 debounced level
 * 48 F3 latch bit (cover latch for contact sensors)
 * 49 F3 debounced level
 * 50 F4 latch bit
 * 51 F4 debounced level
 * 52 F5 positive latch bit
 * 53 F5 debounced level
 * 54 F5 negative latch bit
 * 55 even parity over odd bits 15-55
 * 56 odd parity over even bits 16-56
 * 57 zero/one, programmable
 * 58 RF on for 366 uS (old stop bit)
 * 59 one
 * 60-62 modulus 8 count of number of ones in bits 15-54
 * 63 zero (new stop bit)
 *
 * Protocol Description
 * ________________________________
 * Bits 00 to 02 are a 976 ms RF front porch pulse, providing a wake up period that allows the
 *      system controller receiver to synchronize with the incoming packet.
 * Bits 3 to 14 include 12 sync pulses, e.g., logical 0's, to synchronize the receiver.
 * Bit 15 is a start pulse, e.g., a logical 1, that tells the receiver that data is to follow.
 * Bits 16-58 provide information regarding the transmitter and associated sensor. In other
 *      embodiments, bits 16-58 may be replaced by an analog signal.
 * Bits 16 to 35 provide a 20-bit sensor identification code that uniquely identifies the particular
 *      sensor sending the message. Bits 36 to 39 provide a 4 bit device-type code that identifies the
 *      specific-type of sensor, e.g., smoke, PIR, door, window, etc. The combination of the sensor
 *      bits and device bits provide a set of data bits.
 * Bits 40 through 42 provide a 3-bit trigger count that is incremented for each group of message
 *      packets. The trigger count is a simple but effective way for preventing a third party from
 *      recording a message packet transmission and then re-transmitting that message packet
 *      transmission to make the system controller think that a valid message packet is being transmitted.
 * Bit 43 provides the low battery bit.
 * Bits 44 through 53 provide the latch bit value and the debounced value for each of the five inputs
 *      associated with the transmitter. For the F5 input, both a positive and negative latch bit are provided.
 * Bit 55 provides even parity over odd bits 15 to 55.
 * Bit 56 provides odd parity over even bits 16 to 56.
 * Bit 57 is a programmable bit that can be used for a variety of applications, including providing an
 *      additional bit that could be used for the sensor identification code or device type code.
 * Bit 58 is a 366 ms RF on signal that functions as the "old" stop bit. This bit provides compatibility with
 *      prior system controllers that may be programmed to receive a 58-bit message.
 * Bit 59 is a logical 1.
 * Bits 60 to 62 are a modulus eight count of the number of 1 bits in bits 15 through 54, providing enhanced
 *      error detection information to be used by the system controller. Finally, bit 63 is the "new" stop bit,
 *      e.g., a logical 0, that tells the system controller that it is the end of the message packet.
 *
 * Addendum
 * _______________________________
 * GE/Interlogix keyfobs do not follow the documented iti protocol and it
 *     appears the protocol was misread by the team that created the keyfobs.
 *     The button states are sent in the three trigger count bits (bit 40-42)
 *     and no battery status appears to be provided. 4 buttons and a single
 *     multi-button press (buttons 1 - lock and buttons 2 - unlock) for a total
 *     of 5 buttons available on the keyfob.
 * For contact sensors, latch 3 (typically the tamper/case open latch) will
 *     float (giving misreads) if the external contacts are used (ie; closed)
 *     and there is no 4.7 Kohm end of line resistor in place on the external
 *     circuit


#define INTERLOGIX_MSG_BIT_LEN 46
*/
/* r_device interlogix =  */{
    name:          "Interlogix GE UTC Security Devices",
    modulation:    "OOK_PULSE_PPM",
    short_width:   122,
    long_width:    244,
    reset_limit:   500, // Maximum gap size before End Of Message
    decodefn:     "interlogix_callback",
    disabled:      0,
    fields:        "output_fields",
},
/* Intertechno remotes.
 *
 * Intertechno remote labeled ITT-1500 that came with 3x ITR-1500 remote outlets. The set is labeled IT-1500.
 * The PPM consists of a 220µs high followed by 340µs or 1400µs of gap.
 *
 * There is another type of remotes that have an ID prefix of 0x56 and slightly shorter timing.
 */

/* r_device intertechno =  */{
    name:           "Intertechno 433",
    modulation:     "OOK_PULSE_PPM",
    short_width:    330,
    long_width:     1400,
    gap_limit:      1700,
    reset_limit:    10000,
    decodefn:      "intertechno_callback",
    disabled:       1,
    fields:         "output_fields",
},
/** @file
    Kedsum temperature and humidity sensor (http://amzn.to/25IXeng).
    My models transmit at a bit lower freq. of around 433.71 Mhz.
    Also NC-7415 from Pearl.

    Copyright (C) 2016 John Lifsey
    Enhanced (C) 2019 Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.
*/
/**
Largely the same as esperanza_ews, s3318p.
\sa esperanza_ews.c s3318p.c

Frame structure:

    Byte:      0        1        2        3        4
    Nibble:    1   2    3   4    5   6    7   8    9   10
    Type:   00 IIIIIIII BBCC++++ ttttTTTT hhhhHHHH FFFFXXXX

- I: unique id. changes on powercycle
- B: Battery state 10 = Ok, 01 = weak, 00 = bad
- C: channel, 00 = ch1, 10=ch3
- + low temp nibble
- t: med temp nibble
- T: high temp nibble
- h: humidity low nibble
- H: humidity high nibble
- F: flags
- X: CRC-4 poly 0x3 init 0x0 xor last 4 bits
*
    // the signal should start with 15 sync pulses (empty rows)
    // require at least 5 received syncs
    // the signal should have 6 repeats with a sync pulse between
    // require at least 4 received repeats

*/

/* r_device kedsum =  */{
    name:           "Kedsum Temperature & Humidity Sensor, Pearl NC-7415",
    modulation:     "OOK_PULSE_PPM",
    short_width:    2000,
    long_width:     4000,
    gap_limit:      4400,
    reset_limit:    9400,
    decodefn:      "kedsum_callback",
    disabled:       0,
    fields:         "output_fields",
},
/* LightwaveRF protocol
 *
 * Stub for decoding test data only
 *
 * Reference: https://wiki.somakeit.org.uk/wiki/LightwaveRF_RF_Protocol
 *
 * Copyright (C) 2015 Tommy Vestermark
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
    // Validate package
     // Transmitted pulses are always 72
     // Pulse 72 (delimiting "1" is not demodulated, as gap becomes End-Of-Message - thus expected length is 71

 */

/* r_device lightwave_rf =  */{
    name:           "LightwaveRF",
    modulation:     "OOK_PULSE_PPM",
    short_width:    250, // Short gap 250Âµs, long gap 1250Âµs, (Pulse width is 250Âµs)
    long_width:     1250, //
    reset_limit:    1500, // Gap between messages is unknown so let us get them individually
    decodefn:      "lightwave_rf_callback",
    disabled:       1,
    fields:         "output_fields",
},
/* Maverick ET-73
 *
 * Copyright (C) 2018 Benjamin Larsson
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *

Based on TP12 code

[00] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[01] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[02] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[03] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[04] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[05] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[06] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[07] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[08] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[09] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[10] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[11] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[12] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100
[13] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100


Layout appears to be:
          II 11 12 22 XX XX
[01] {48} 68 00 01 0b 90 fc : 01101000 00000000 00000001 00001011 10010000 11111100

I = random id
1 = temperature sensor 1 12 bits
2 = temperature sensor 2 12 bits
X = unknown, checksum maybe ?

*/
/* r_device maverick_et73 =  */{
    name:          "Maverick et73",
    modulation:    "OOK_PULSE_PPM",
    short_width:   1050,
    long_width:    2050,
    gap_limit:     2070,
    reset_limit:   4040,
    decodefn:     "maverick_et73_sensor_callback",
    disabled:      0,
    fields:        "output_fields",
},

/* r_device mebus433 =  */{
    name:           "Mebus 433",
    modulation:     "OOK_PULSE_PPM",
    short_width:    800, // guessed, no samples available
    long_width:     1600, // guessed, no samples available
    gap_limit:      2400,
    reset_limit:    6000,
    decodefn:      "mebus433_callback",
    disabled:       1, // add docs, tests, false positive checks and then reenable
    fields:         "output_fields",
},
/** @file
    Kaku decoder.
*/
/**
Kaku decoder.
Might be similar to an x1527.
S.a. Nexa, Proove.

Two bits map to 2 states, 0 1 -> 0 and 1 0 -> 1
Status bit can be 1 1 -> 1 which indicates DIM value. 4 extra bits are present with value
start pulse: 1T high, 10.44T low
- 26 bit:  Address
- 1  bit:  group bit
- 1  bit:  Status bit on/off/[dim]
- 4  bit:  unit
- [4 bit:  dim level. Present if [dim] is used, but might be present anyway...]
- stop pulse: 1T high, 40T low
*/
/* r_device newkaku =  */{
        name:        "KlikAanKlikUit Wireless Switch",
        modulation:  "OOK_PULSE_PPM",
        short_width: 300,  // 1:1
        long_width:  1400, // 1:5
        sync_width:  2700, // 1:10
        tolerance:   200,
        reset_limit: 3200,
        decodefn:   "newkaku_callback",
        disabled:    0,
        fields:      "output_fields",
},
/** @file
    Nexa decoder.

    Copyright (C) 2017 Christian Juncker BrÃ¦dstrup

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
Nexa decoder.
Might be similar to an x1527.
S.a. Kaku, Proove.

Tested devices:
- Magnetic sensor - LMST-606

Packet gap is 10 ms.

This device is very similar to the proove magnetic sensor.
The proove decoder will capture the OFF-state but not the ON-state
since the Nexa uses two different bit lengths for ON and OFF.
*/
/* r_device nexa =  */{
        name:        "Nexa",
        modulation:  "OOK_PULSE_PPM",
        short_width: 270,  // 1:1
        long_width:  1300, // 1:5
        sync_width:  2700, // 1:10
        tolerance:   200,
        gap_limit:   1500,
        reset_limit: 2800,
        decodefn:   "nexa_callback",
        disabled:    0,
        fields:      "output_fields",
},
/** @file
    Nexus temperature and optional humidity sensor protocol.
*/
/** @fn int nexus_callback(r_device *decoder, bitbuffer_t *bitbuffer)
Nexus sensor protocol with ID, temperature and optional humidity
also FreeTec (Pearl) NC-7345 sensors for FreeTec Weatherstation NC-7344,
also infactory/FreeTec (Pearl) NX-3980 sensors for infactory/FreeTec NX-3974 station.

The sensor sends 36 bits 12 times,
the packets are ppm modulated (distance coding) with a pulse of ~500 us
followed by a short gap of ~1000 us for a 0 bit or a long ~2000 us gap for a
1 bit, the sync gap is ~4000 us.

The data is grouped in 9 nibbles:

    [id0] [id1] [flags] [temp0] [temp1] [temp2] [const] [humi0] [humi1]

- The 8-bit id changes when the battery is changed in the sensor.
- flags are 4 bits B 0 C C, where B is the battery status: 1=OK, 0=LOW
- and CC is the channel: 0=CH1, 1=CH2, 2=CH3
- temp is 12 bit signed scaled by 10
- const is always 1111 (0x0F)
- humidity is 8 bits

The sensors can be bought at Clas Ohlsen (Nexus) and Pearl (infactory/FreeTec).
*/
/* r_device nexus =  */{
        name:        "Nexus, FreeTec NC-7345, NX-3980 temperature/humidity sensor",
        modulation:  "OOK_PULSE_PPM",
        short_width: 1000,
        long_width:  2000,
        gap_limit:   3000,
        reset_limit: 5000,
        decodefn:   "nexus_callback",
        disabled:    0,
        fields:      "output_fields",
},
/** @file
    Oregon Scientific SL109H decoder.
*/
/**
Oregon Scientific SL109H decoder.

Data layout (bits):

    AAAA CC HHHH HHHH TTTT TTTT TTTT SSSS IIII IIII

- A: 4 bit checksum (add)
- C: 2 bit channel number
- H: 8 bit BCD humidity
- T: 12 bit signed temperature scaled by 10
- S: 4 bit status, unknown
- I: 8 bit a random id that is generated when the sensor starts

S.a. http://www.osengr.org/WxShield/Downloads/OregonScientific-RF-Protocols-II.pdf
*/
/* r_device oregon_scientific_sl109h =  */{
        name:        "Oregon Scientific SL109H Remote Thermal Hygro Sensor",
        modulation:  "OOK_PULSE_PPM",
        short_width: 2000,
        long_width:  4000,
        gap_limit:   5000,
        reset_limit: 10000, // packet gap is 8900
        decodefn:   "oregon_scientific_sl109h_callback",
        disabled:    0,
        fields:      "output_fields",
},
/** @file
    Prologue sensor protocol.
*/
/** @fn int prologue_callback(r_device *decoder, bitbuffer_t *bitbuffer)
Prologue sensor protocol,
also FreeTec NC-7104 sensor for FreeTec Weatherstation NC-7102,
and Pearl NC-7159-675.

The sensor sends 36 bits 7 times, before the first packet there is a sync pulse.
The packets are ppm modulated (distance coding) with a pulse of ~500 us
followed by a short gap of ~2000 us for a 0 bit or a long ~4000 us gap for a
1 bit, the sync gap is ~9000 us.

The data is grouped in 9 nibbles

    [type] [id0] [id1] [flags] [temp0] [temp1] [temp2] [humi0] [humi1]

- type: 4 bit fixed 1001 (9) or 0110 (5)
- id: 8 bit a random id that is generated when the sensor starts, could include battery status
  the same batteries often generate the same id
- flags(3): is 0 the battery status, 1 ok, 0 low, first reading always say low
- flags(2): is 1 when the sensor sends a reading when pressing the button on the sensor
- flags(1,0): the channel number that can be set by the sensor (1, 2, 3, X)
- temp: 12 bit signed scaled by 10
- humi: 8 bit always 11001100 (0xCC) if no humidity sensor is available

The sensor can be bought at Clas Ohlson.
*/
/* r_device prologue =  */{
        name:        "Prologue, FreeTec NC-7104, NC-7159-675 temperature sensor",
        modulation:  "OOK_PULSE_PPM",
        short_width: 2000,
        long_width:  4000,
        gap_limit:   7000,
        reset_limit: 10000,
        decodefn:   "prologue_callback",
        disabled:    0,
        fields:      "output_fields",
},
/** @file
    Proove decoder.

    Copyright (C) 2016 Ask Jakobsen, Christian Juncker Brædstrup

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
Proove/Nexa/Kaku decoder.
Might be similar to an x1527.
S.a. Kaku, Nexa.

Tested devices:
- Magnetic door & window sensor
  - "Proove" from 'Kjell & Company'
  - "Anslut" from "Jula"
  - "Telecontrol Plus" remote by "REV Ritter GmbH" (Germany) , model number "008341C-1"
  - "Nexa"
  - "Intertechno ITLS-16" (OEM model # "ITAPT-821")
  - Nexa - LMST-606

From http://elektronikforumet.com/wiki/index.php/RF_Protokoll_-_Proove_self_learning

Proove packet structure (32 bits or 36 bits with dimmer value):

    HHHH HHHH HHHH HHHH HHHH HHHH HHGO CCEE [DDDD]

- H = The first 26 bits are transmitter unique codes, and it is this code that the receiver “learns” to recognize.
- G = Group command. Set to 1 for on, 0 for off.
- O = On/Off bit. Set to 1 for on, 0 for off.
- C = Channel bits (inverted).
- E = Unit bits (inverted). Device to be turned on or off. Unit #1 = 00, #2 = 01, #3 = 10.
- D = Dimmer value (optional).

Physical layer:
Every bit in the packets structure is sent as two physical bits.
Where the second bit is the inverse of the first, i.e. 0 -> 01 and 1 -> 10.
Example: 10101110 is sent as 1001100110101001
The sent packet length is thus 64 bits.
A message is made up by a Sync bit followed by the Packet bits and ended by a Pause bit.
Every message is repeated about 5-15 times.
Packet gap is 10 ms.
*/
/* r_device proove =  */{
        name:        "Proove / Nexa / KlikAanKlikUit Wireless Switch",
        modulation:  "OOK_PULSE_PPM",
        short_width: 270,  // 1:1
        long_width:  1300, // 1:5
        sync_width:  2700, // 1:10
        tolerance:   200,
        gap_limit:   1500,
        reset_limit: 2800,
        decodefn:   "proove_callback",
        disabled:    0,
        fields:      "output_fields",
},
/* RF-tech decoder
 * Also marked INFRA 217S34
 * Ewig Industries Macao
 *
 * Copyright (C) 2016 Erik Johannessen
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
    * Example of message:
     * 01001001 00011010 00000100
     *
     * First byte is unknown, but probably id.
     * Second byte is the integer part of the temperature.
     * Third byte bits 0-3 is the fraction/tenths of the temperature.
     * Third byte bit 7 is 1 with fresh batteries.
     * Third byte bit 6 is 1 on button press.
     *
     * More sample messages:
     * {24} ad 18 09 : 10101101 00011000 00001001
     * {24} 3e 17 09 : 00111110 00010111 00001001
     * {24} 70 17 03 : 01110000 00010111 00000011
     * {24} 09 17 01 : 00001001 00010111 00000001
     *
     * With fresh batteries and button pressed:
     * {24} c5 16 c5 : 11000101 00010110 11000101
     *
     *
 */
/* r_device rftech =  */{
    name:       "RF-tech",
    modulation: "OOK_PULSE_PPM",
    short_width:    2000,
    long_width:     4000,
    gap_limit:      5000,
    reset_limit:    10000,
    decodefn:      "rftech_callback",
    disabled:   1,
    fields:     "csv_output_fields",
},
// timings based on samp_rate=1024000
/* Currently this can decode the temperature and id from Rubicson sensors
 *
 * the sensor sends 36 bits 12 times pwm modulated
 * the data is grouped into 9 nibbles
 * [id0] [id1], [bat|unk1|chan1|chan2] [temp0], [temp1] [temp2], [F] [crc1], [crc2]
 *
 * The id changes when the battery is changed in the sensor.
 * bat bit is 1 if battery is ok, 0 if battery is low
 * chan1 and chan2 forms a 2bit value for the used channel
 * unk1 is always 0 probably unused
 * temp is 12 bit signed scaled by 10
 * F is always 0xf
 * crc1 and crc2 forms a 8-bit crc, polynomial 0x31, initial value 0x6c, final value 0x0
 *
 * The sensor can be bought at Kjell&Co
 */
/* r_device rubicson =  */{
    name:           "Rubicson Temperature Sensor",
    modulation:     "OOK_PULSE_PPM",
    short_width:    1000, // Gaps:  Short 976µs, Long 1940µs, Sync 4000µs
    long_width:     2000, // Pulse: 500µs (Initial pulse in each package is 388µs)
    gap_limit:      3000,
    reset_limit:    4800, // Two initial pulses and a gap of 9120µs is filtered out
    decodefn:      "rubicson_callback",
    disabled:       0,
    fields:         "output_fields",
},
/** @file
    Rubicson 48659 meat thermometer.

    Copyright (C) 2019 Benjamin Larsson.

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

Rubicson 48659 meat thermometer.

{32} II 12 TT MN

- I = power on id
- 1 = 0UUU U follows temperature [0-7]
- 2 = XSTT S = sign, TT = temp high bits (2) X=unknown
- T = Temp in Farenhight
- M = xorsum high nibble
- M = xorsum low nibble (add ^4 to match output)


{32} 01 08 71 d4    45
{32} 01 18 73 e6    46
{32} 01 28 75 f8    47
{32} 01 38 77 0a    48
{32} 01 48 79 1c    49
{32} 01 50 7a 25    50C  122F
{32} 01 60 7c 37    51C  124F
{32} 01 70 7e 49    52
{32} 01 00 80 db    53
{32} 01 10 82 ed    54
{32} 01 18 83 f6    55
{32} 01 28 85 08    56
{32} 01 38 87 1a    57          {32} 0b 68 4d 1a    25
{32} 01 48 89 2c    58
{32} 01 58 8b 3e    59
{32} 01 60 8c 47    60
{32} 01 70 8e 59    61
{32} 01 00 90 eb    62
{32} 01 10 92 fd    63
{32} 01 20 94 0f    64
{32} 01 28 95 18    65
{32} 01 38 97 2a    66
{32} 01 48 99 3c    67
{32} 01 58 9b 4e    68
{32} 01 68 9d 60    69
{32} 01 70 9e 69    70
{32} 01 00 a0 fb    71
{32} 01 10 a2 0d    72
{32} 01 20 a4 1f    73
{32} 01 30 a6 31    74
{32} 01 38 a7 3a    75
{32} 01 48 a9 4c    76


battery

{32} cc 38 67 c5    39
{32} cc 08 61 8f    36
{32} cc 78 5f fd    34
{32} cc 70 5e f4    33
{32} cc 50 5a d0    32
{32} cc 30 56 ac    30
{32} cc 18 53 91    28
{32} cc 08 51 7f    27
{32} cc 78 4f ed    26


battery

{32} f0 18 43 a5    19
{32} f0 30 46 c0    21
{32} f0 40 48 d2    22
{32} f0 50 4a e4    23
{32} f0 60 4c f6    24
{32} f0 78 4f 11    26

battery change for each value

{32} d2 60 4c d8    24
{32} 01 60 4c 07    24
{32} 20 60 4c 26    24
{32} c3 60 4c c9    24
{32} ae 60 4c b4    24
{32} 98 60 4c 9e    24
{32} 27 60 4c 2d    24
{32} 5d 60 4c 63    24

{32} 49 68 4d 58    25
{32} d9 68 4d e8    25
{32} 36 68 4d 45    25
{32} 0b 68 4d 1a    25
{32} 63 68 4d 72    25
{32} 80 68 4d 8f
{32} 3c 68 4d 4b
{32} 97 68 4d a6
{32} 37 68 4d 46
{32} 64 68 4d 73
{32} 76 68 4d 85
{32} f6 68 4d 05
{32} fa 68 4d 09
{32} d6 68 4d e5
{32} d3 68 4d e2
{32} 01 68 4d 10
{32} 25 68 4d 34
{32} e0 68 4d ef
{32} 22 68 4d 31
{32} 56 68 4d 65
{32} 53 68 4d 62

{32} 0b 78 4f 2c    26

{32} 23 28 65 0a    38
{32} 23 70 6e 5b    43
{32} 23 00 70 ed    44

{32} 23 60 dc b9    104
{32} 23 78 df d4    106
{32} 23 28 e5 8a    109
{32} 23 08 f1 76    116
{32} 23 40 f8 b5    120
{32} 23 60 fc d9    122
{32} 23 19 03 99    128
{32} 23 61 0c ea    131
{32} 23 19 13 a9    135
{32} 23 39 17 cd    138
{32} 23 01 20 9e    142
{32} 23 69 2d 13    149
{32} 23 01 30 ae    151
{32} 23 21 34 d2    153
{32} 23 31 36 e4    154
{32} 23 39 37 ed    155
{32} 23 59 3b 11    157
{32} 23 69 3d 23    158
{32} 23 79 3f 35    159

{32} 23 79 3f 35    159
{32} 1a 70 0e f2    -10
{32} 1a 18 03 8f    -16
{32} 1a 8c 01 01    -18
{32} 1a 9c 03 13    -19
{32} 1a b4 06 2e    -22
{32} 1a d4 0a 52    -23
{32} 1a e4 0c 64    -24
*/
/* r_device rubicson_48659 =  */{
        name:        "Rubicson 48659 Thermometer",
        modulation:  "OOK_PULSE_PPM",
        short_width: 940,
        long_width:  1900,
        gap_limit:   2000,
        reset_limit: 4000,
        decodefn:   "rubicson_48659_decode",
        disabled:    0,
        fields:      "output_fields",
},

/** @file
    Conrad Electronics S3318P outdoor sensor.

    Copyright (C) 2016 Martin Hauke
    Enhanced (C) 2019 Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.
*/
/**
Largely the same as esperanza_ews, kedsum.
\sa esperanza_ews.c kedsum.c

Also NC-5849-913 from Pearl (for FWS-310 station).

Transmit Interval: every ~50s.
Message Format: 40 bits (10 nibbles).

    Byte:      0        1        2        3        4
    Nibble:    1   2    3   4    5   6    7   8    9   10
    Type:   00 IIIIIIII ??CCTTTT TTTTTTTT HHHHHHHH WB??XXXX

- 0: Preamble
- I: sensor ID (changes on battery change)
- C: channel number
- T: temperature
- H: humidity
- W: tx-button pressed
- B: low battery
- ?: unknown meaning
- X: CRC-4 poly 0x3 init 0x0 xor last 4 bits

Example data:

    [01] {42} 04 15 66 e2 a1 00 : 00000100 00010101 01100110 11100010 10100001 00 ---> Temp/Hum/Ch:23.2/46/1

Temperature:
- Sensor sends data in °F, lowest supported value is -90°F
- 12 bit unsigned and scaled by 10 (Nibbles: 6,5,4)
- in this case "011001100101" =  1637/10 - 90 = 73.7 °F (23.17 °C)

Humidity:
- 8 bit unsigned (Nibbles 8,7)
- in this case "00101110" = 46

Channel number: (Bits 10,11) + 1
- in this case "00" --> "00" +1 = Channel1

Battery status: (Bit 33) (0 normal, 1 voltage is below ~2.7 V)
- TX-Button: (Bit 32) (0 indicates regular transmission, 1 indicates requested by pushbutton)

Random Code / Device ID: (Nibble 1)
- changes on every battery change
*/
/* r_device s3318p =  */{
    name:           "Conrad S3318P, FreeTec NC-5849-913 temperature humidity sensor",
    modulation:     "OOK_PULSE_PPM",
    short_width:    1900,
    long_width:     3800,
    gap_limit:      4400,
    reset_limit:    9400,
    decodefn:      "s3318p_callback",
    disabled:       0,
    fields:         "output_fields",
},
/** @file
    Solight TE44 temperature sensor.

    Copyright (C) 2017 Miroslav Oujesky

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/** @fn int solight_te44_callback(r_device *decoder, bitbuffer_t *bitbuffer)
Solight TE44 -- Generic wireless thermometer, which might be sold as part of different kits.


So far these were identified (mostly sold in central/eastern europe)
- Solight TE44
- Solight TE66
- EMOS E0107T
- NX-6876-917 from Pearl (for FWS-70 station).

Rated -50 C to 70 C, frequency 433,92 MHz, three selectable channels.

Data structure:

12 repetitions of the same 36 bit payload, 1bit zero as a separator between each repetition.

    36 bit payload format: xxxxxxxx 10ccmmmm tttttttt 1111hhhh hhhh

- x: random key - changes after device reset - 8 bits
- c: channel (0-2) - 2 bits
- m: multiplier - signed integer, two's complement - 4 bits
- t: temperature in celsius - unsigned integer - 8 bits
- h: checksum - 8 bits

Temperature in C = ((256 * m) + t) / 10

*/
/* r_device solight_te44 =  */{
    name:          "Solight TE44/TE66, EMOS E0107T, NX-6876-917",
    modulation:    "OOK_PULSE_PPM",
    short_width:   972, // short gap = 972 us
    long_width:    1932, // long gap = 1932 us
    gap_limit:     3000, // packet gap = 3880 us
    reset_limit:   6000,
    decodefn:     "solight_te44_callback",
    disabled:      0,
    fields:        "output_fields",
},

/**
Springfield PreciseTemp Wireless Temperature and Soil Moisture Station.

http://www.amazon.com/Springfield-Digital-Moisture-Meter-Freeze/dp/B0037BNHLS

Data is transmitted in the following form:

    Nibble
     0-1   Power On ID
      2    Flags and Channel - BTCC
              B - Battery 0 = OK, 1 = LOW
              T - Transmit 0 = AUTO, 1 = MANUAL (TX Button Pushed)
             CC - Channel 00 = 1, 01 = 2, 10 = 3
     3-5   Temperature Celsius X 10 - 3 nibbles 2s complement
      6    Moisture Level - 0 - 10
      7    Checksum of nibbles 0 - 6 (simple xor of nibbles)
      8    Unknown

Actually 37 bits for all but last transmission which is 36 bits.
*/
/* r_device springfield =  */{
        name:        "Springfield Temperature and Soil Moisture",
        modulation:  "OOK_PULSE_PPM",
        short_width: 2000,
        long_width:  4000,
        gap_limit:   5000,
        reset_limit: 9200,
        decodefn:   "springfield_decode",
        disabled:    0,
        fields:      "output_fields",
},
/** @file
    TFA pool temperature sensor.

    Copyright (C) 2015 Alexandre Coffignal

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
TFA pool temperature sensor.

10 24 bits frames

    CCCCIIII IIIITTTT TTTTTTTT DDBF

- C: checksum, sum of nibbles - 1
- I: device id (changing only after reset)
- T: temperature
- D: channel number
- B: battery status
- F: first transmission
*/
/* r_device tfa_pool_thermometer =  */{
        name:        "TFA pool temperature sensor",
        modulation:  "OOK_PULSE_PPM",
        short_width: 2000,
        long_width:  4600,
        gap_limit:   7800,
        reset_limit: 10000,
        decodefn:   "tfa_pool_thermometer_decode",
        disabled:    0,
        fields:      "output_fields",
},
/** @file
    TFA-Twin-Plus-30.3049
    also Conrad KW9010 (perhaps just rebranded), Ea2 BL999.

    Copyright (C) 2015 Paul Ortyl

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License version 3 as
    published by the Free Software Foundation.
*/
/**
Decode TFA-Twin-Plus-30.3049, Conrad KW9010 (perhaps just rebranded), Ea2 BL999.

Protocol as reverse engineered by https://github.com/iotzo

36 Bits (9 nibbles)

| Type: | IIIICCII | B???TTTT | TTTTTSSS | HHHHHHH1 | XXXX |
| ----- | -------- | -------- | -------- | -------- | ---- |
| BIT/8 | 76543210 | 76543210 | 76543210 | 76543210 | 7654 |
| BIT/A | 01234567 | 89012345 | 57890123 | 45678901 | 2345 |
|       | 0        | 1        | 2        | 3        |      |

- I: sensor ID (changes on battery change)
- C: Channel number
- B: low battery
- T: temperature
- S: sign
- X: checksum
- ?: unknown meaning
- all values are LSB-first, so need to be reversed before presentation

    [04] {36} e4 4b 70 73 00 : 111001000100 101101110 000 0111001 10000 ---> temp/hum:23.7/50
    temp num-->13-21bit(9bits) in reverse order in this case "011101101"=237
    positive temps ( with 000 in bits 22-24) : temp=num/10 (in this case 23.7 C)
    negative temps (with 111 in bits 22-24) : temp=(512-num)/10
    negative temps example:
    [03] {36} e4 4c 1f 73 f0 : 111001000100 110000011 111 0111001 11111 temp: -12.4

    Humidity:
    hum num-->25-32bit(7bits) in reverse order : in this case "1001110"=78
    humidity=num-28 --> 78-28=50

I have channel number bits(5,6 in reverse order) and low battery bit(9).
It seems that the 1,2,3,4,7,8 bits changes randomly on every reset/battery change.
*/
/* r_device tfa_twin_plus_303049 =  */{
    name:          "TFA-Twin-Plus-30.3049, Conrad KW9010, Ea2 BL999",
    modulation:    "OOK_PULSE_PPM",
    short_width:   2000,
    long_width:    4000,
    gap_limit:     6000,
    reset_limit:   10000,
    decodefn:     "tfa_twin_plus_303049_callback",
    disabled:      0,
    fields:         "output_fields",
},
/* Thermopro TP-11 Thermometer.
 *
 * Copyright (C) 2017 Google Inc.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 normal sequence of bit rows:
[00] {33} db 41 57 c2 80 : 11011011 01000001 01010111 11000010 1
[01] {33} db 41 57 c2 80 : 11011011 01000001 01010111 11000010 1
[02] {33} db 41 57 c2 80 : 11011011 01000001 01010111 11000010 1
[03] {32} db 41 57 c2 : 11011011 01000001 01010111 11000010

The code below checks that at least three rows are the same and
that the validation code is correct for the known device ids.
*/
/* r_device thermopro_tp11 =  */{
    name:          "Thermopro TP11 Thermometer",
    modulation:    "OOK_PULSE_PPM",
    short_width:   500,
    long_width:    1500,
    gap_limit:     2000,
    reset_limit:   4000,
    decodefn:     "thermopro_tp11_sensor_callback",
    disabled:      0,
    fields:        "output_fields",
},

/* Thermopro TP-12 Thermometer.
 *
 * Copyright (C) 2017 Google Inc.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *

A normal sequence for the TP12:

[00] {0} :
[01] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[02] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[03] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[04] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[05] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[06] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[07] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[08] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[09] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[10] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[11] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[12] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[13] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[14] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[15] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[16] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
[17] {40} 38 73 21 bb 81 : 00111000 01110011 00100001 10111011 10000001

Layout appears to be:

[01] {41} 38 73 21 bb 81 80 : 00111000 01110011 00100001 10111011 10000001 1
                              device   temp 1   temp     temp 2   checksum
                                       low bits 1   2    low bits
                                                hi bits


#define BITS_IN_VALID_ROW 40
*/
/* r_device thermopro_tp12 =  */{
    name:          "Thermopro TP08/TP12/TP20 thermometer",
    modulation:    "OOK_PULSE_PPM",
    short_width:   500,
    long_width:    1500,
    gap_limit:     2000,
    reset_limit:   4000,
    decodefn:     "thermopro_tp12_sensor_callback",
    disabled:      0,
    fields:        "output_fields",
},

/** @file
    TS-FT002 Tank Liquid Level decoder.

    Copyright (C) 2019 Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/*
TS-FT002 Wireless Ultrasonic Tank Liquid Level Meter With Temperature Sensor

PPM with 500 us pulse, 464 us short gap (0), 948 us long gap (1), 1876 us packet gap, two packets per transmission.

E.g. rtl_433 -R 0 -X 'n=TS-FT002T,m=OOK_PPM,s=500,l=1000,g=1200,r=2000,bits>=70'

Bits are sent LSB first, full packet is 9 bytes (1 byte preamble + 8 bytes payload)

Data layout:

    SS II MM DD BD VT TT CC

(Nibble number after reflecting bytes)
| Nibble   | Description
| 0,1      | Sync 0xfa (0x5f before reverse)
| 2,3      | ID
| 4,5      | Message type (fixed 0x11)
| 6,7,9    | Depth H,M,L (in Centimeter, 0x5DC if invalid, range 0-15M)
| 8        | Transmit Interval (bit 7=0: 180S, bit 7 =1: 30S, bit 4-6=1: 5S)
| 10       | Battery indicator?
| 12,13,11 | Temp H, M, L (scale 10, offset 400), 0x3E8 if invalid
| 14,15    | Rain H, L (Value 0-256), not used
| 16,17    | XOR checksum (include the preamble)
*/
/* r_device ts_ft002 =  */{
        name:        "TS-FT002 Wireless Ultrasonic Tank Liquid Level Meter With Temperature Sensor",
        modulation:  "OOK_PULSE_PPM",
        short_width: 464,
        long_width:  948,
        gap_limit:   1200,
        reset_limit: 2000,
        decodefn:   "ts_ft002_decoder",
        disabled:    0,
        fields:      "output_fields",
},
/** @file
    Hyundai WS SENZOR Remote Temperature Sensor.

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
Hyundai WS SENZOR Remote Temperature Sensor.

- Transmit Interval: every ~33s
- Frequency 433.92 MHz
- Distance coding: Pulse length 224 us
- Short distance: 1032 us, long distance: 1992 us, packet distance: 4016 us

24-bit data packet format, repeated 23 times

    TTTTTTTT TTTTBSCC IIIIIIII

- T = signed temperature * 10 in Celsius
- B = battery status (0 = low, 1 = OK)
- S = startup (0 = normal operation, 1 = battery inserted or TX button pressed)
- C = channel (0-2)
- I = sensor ID

#define WS_PACKETLEN 24
#define WS_MINREPEATS 4
#define WS_REPEATS 23
*/
/* r_device wssensor =  */{
        name:        "Hyundai WS SENZOR Remote Temperature Sensor",
        modulation:  "OOK_PULSE_PPM",
        short_width: 1000,
        long_width:  2000,
        gap_limit:   2400,
        reset_limit: 4400,
        decodefn:   "wssensor_decode",
        disabled:    0,
        fields:      "output_fields",
},
/* X10 sensor
 *
 * Stub for decoding test data only
 *
 * Copyright (C) 2015 Tommy Vestermark
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */
/* r_device X10_RF =  */{
    name:           "X10 RF",
    modulation:     "OOK_PULSE_PPM",
    short_width:    500,  // Short gap 500Âµs
    long_width:     1680, // Long gap 1680Âµs
    gap_limit:      2800, // Gap after sync is 4.5ms (1125)
    reset_limit:    6000, // Gap seen between messages is ~40ms so let's get them individually
    decodefn:      "x10_rf_callback",
    disabled:       1,
    fields:         "output_fields",
},
/*
 * X10 Security sensor decoder.
 *
 * Each packet starts with a sync pulse of 9000 us and 4500 us gap.
 * The message is OOK PPM encoded with 567 us pulse and long gap (0 bit)
 * of 1680 us or short gap (1 bit) of 590 us. There are 41 bits, the
 * message is repeated 5 times with a packet gap of 40000 us.
 *
 * Tested with American sensors operating at 310 MHz
 * e.g., rtl_433 -f 310.558M
 *
 * This is pretty rudimentary, and I bet the byte value decoding, based
 * on limited observations, doesn't take into account bits that might
 * be set to indicate something like a low battery condition.
 *
 * Copyright (C) 2018 Anthony Kava
 * Based on code provided by Willi 'wherzig' in issue #30 (2014-04-21)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 */
/* r_device definition */
/* r_device x10_sec =  */{
    name:           "X10 Security",
    modulation:     "OOK_PULSE_PPM",
    short_width:    500,  // Short gap 500Âµs
    long_width:     1680, // Long gap 1680Âµs
    gap_limit:      2200, // Gap after sync is 4.5ms (1125)
    reset_limit:    6000,
    decodefn:      "x10_sec_callback",
    disabled:       0,
    fields:         "output_fields",
},
]
};
