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
*/

#include "decoder.h"

// ** Acurite 5n1 functions **

#define ACURITE_TXR_BITLEN        56
#define ACURITE_5N1_BITLEN        64
#define ACURITE_6045_BITLEN        72
r_device acurite_rain_896 = {
    .name           = "Acurite 896 Rain Gauge",
    .modulation     = OOK_PULSE_PPM,
    .short_width    = 1000,
    .long_width     = 2000,
    .gap_limit      = 3500,
    .reset_limit    = 5000,
    .decode_fn      = &acurite_rain_896_decode,
// Disabled by default due to false positives on oregon scientific v1 protocol see issue #353
    .disabled       = 1,
    .fields         = acurite_rain_gauge_output_fields,
};

static char *acurite_th_output_fields[] = {
    "model",
    "id",
    "battery",
    "temperature_C",
    "humidity",
    "status",
    NULL,
};

r_device acurite_th = {
    .name           = "Acurite 609TXC Temperature and Humidity Sensor",
    .modulation     = OOK_PULSE_PPM,
    .short_width    = 1000,
    .long_width     = 2000,
    .gap_limit      = 3000,
    .reset_limit    = 10000,
    .decode_fn      = &acurite_th_decode,
    .disabled       = 0,
    .fields         = acurite_th_output_fields,
};

/*
 * For Acurite 592 TXR Temp/Humidity, but
 * Should match Acurite 592TX, 5-n-1, etc.
 */
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
};

r_device acurite_txr = {
    .name           = "Acurite 592TXR Temp/Humidity, 5n1 Weather Station, 6045 Lightning",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 220,  // short pulse is 220 us + 392 us gap
    .long_width     = 408,  // long pulse is 408 us + 204 us gap
    .sync_width     = 620,  // sync pulse is 620 us + 596 us gap
    .gap_limit      = 500,  // longest data gap is 392 us, sync gap is 596 us
    .reset_limit    = 4000, // packet gap is 2192 us
    .decode_fn      = &acurite_txr_decode,
    .disabled       = 0,
    .fields         = acurite_txr_output_fields,
};

/*
 * Acurite 00986 Refrigerator / Freezer Thermometer
 *
 * Temperature only, Pulse Position
 *
 * A preamble: 2x of 216 us pulse + 276 us gap, 4x of 1600 us pulse + 1560 us gap
 * 39 bits of data: 220 us pulses with short gap of 520 us or long gap of 880 us
 * A transmission consists of two packets that run into each other.
 * There should be 40 bits of data though. But the last bit can't be detected.
 */
static char *acurite_986_output_fields[] = {
    "model",
    "id",
    "channel",
    "battery",
    "temperature_F",
    "status",
    NULL,
};

r_device acurite_986 = {
    .name           = "Acurite 986 Refrigerator / Freezer Thermometer",
    .modulation     = OOK_PULSE_PPM,
    .short_width    = 520,
    .long_width     = 880,
    .gap_limit      = 1280,
    .reset_limit    = 4000,
    .decode_fn      = &acurite_986_decode,
    .disabled       = 0,
    .fields         = acurite_986_output_fields,
};

/*
 * Acurite 00606TX Tower Sensor
 *
 * Temperature only
 *
 */

static char *acurite_606_output_fields[] = {
    "model",
    "id",
    "battery",
    "temperature_C",
    "mic",
    NULL,
};

r_device acurite_606 = {
    .name           = "Acurite 606TX Temperature Sensor",
    // actually tests/acurite/02/gfile002.cu8, check this
    //.modulation     = OOK_PULSE_PWM,
    //.short_width    = 576,
    //.long_width     = 1076,
    //.gap_limit      = 1200,
    //.reset_limit    = 12000,
    .modulation     = OOK_PULSE_PPM,
    .short_width    = 2000,
    .long_width     = 4000,
    .gap_limit      = 7000,
    .reset_limit    = 10000,
    .decode_fn      = &acurite_606_decode,
    .disabled       = 0,
    .fields         = acurite_606_output_fields,
};

static char *acurite_00275rm_output_fields[] = {
    "model",
    "subtype",
    "probe", // TODO: remove this
    "id",
    "battery",
    "temperature_C",
    "humidity",
    "water",
    "temperature_1_C",
    "humidity_1",
    "ptemperature_C",
    "phumidity",
    "mic",
    NULL,
};

r_device acurite_00275rm = {
    .name           = "Acurite 00275rm,00276rm Temp/Humidity with optional probe",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 232,  // short pulse is 232 us
    .long_width     = 420,  // long pulse is 420 us
    .gap_limit      = 520,  // long gap is 384 us, sync gap is 592 us
    .reset_limit    = 708,  // no packet gap, sync gap is 592 us
    .sync_width     = 632,  // sync pulse is 632 us
    .decode_fn      = &acurite_00275rm_decode,
    .disabled       = 0,
    .fields         = acurite_00275rm_output_fields,
};
/* akhan_100F14.c Akhan remote keyless entry system
 *
 *    This RKE system uses a HS1527 OTP encoder (http://sc-tech.cn/en/hs1527.pdf)
 *    Each message consists of a preamble, 20 bit id and 4 data bits.
 *
 *    (code based on chuango.c and generic_remote.c)
 *
 * Note: simple 24 bit fixed ID protocol (x1527 style) and should be handled by the flex decoder.
 */
r_device akhan_100F14 = {
    .name          = "Akhan 100F14 remote keyless entry",
    .modulation    = OOK_PULSE_PWM,
    .short_width   = 316,
    .long_width    = 1020,
    .reset_limit   = 1800,
    .sync_width    = 0,
    .tolerance     = 80, // us
    .decode_fn     = &akhan_rke_callback,
    .disabled      = 0,
    .fields        = output_fields,
};
/** @file
    Auriol HG02832 sensor.

    Copyright (C) 2019 Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/

/**
Lidl Auriol HG02832 sensor, also Rubicson 48957 (Transmitter for 48956).

S.a. (#1161), (#1205).

Also works for the newer version HG05124A-DCF, IAN 321304_1901, version 07/2019.
However, the display occasionally shows 0.1 C incorrectly, especially with odd values.
But this is not an error of the evaluation of a single message, the sensor sends it this way.
Perhaps the value is averaged in the station.

PWM with 252 us short, 612 us long, and 860 us sync.
Preamble is a long pulsem, then 3 times sync pulse, sync gap, then data.
The 61ms packet gap is too long to capture repeats in one bitbuffer.

Data layout:

    II HH F TTT CC

- I: id, 8 bit
- H: humidity, 8 bit
- F: flags, 4 bit (Batt, TX-Button, Chan, Chan)
- T: temperature, 12 bit, deg. C scale 10
- C: checksum, 8 bit

*/
r_device auriol_hg02832 = {
        .name        = "Auriol HG02832, HG05124A-DCF, Rubicson 48957 temperature/humidity sensor",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 252,
        .long_width  = 612,
        .sync_width  = 860,
        .gap_limit   = 750,
        .reset_limit = 62990, // 61ms packet gap
        .decode_fn   = &auriol_hg02832_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/* Generic remote Blyss DC5-UK-WH as sold by B&Q
 *
 * DC5-UK-WH pair with receivers, the codes used may be specific to a receiver - use with caution
 *
 * warmup pulse 5552 us, 2072 gap
 * short is 512 us pulse, 1484 us gap
 * long is 1508 us pulse, 488 us gap
 * packet gap is 6964 us
 *        if (bitbuffer->bits_per_row[i] != 33) // last row is 32

 *
 * Copyright (C) 2016 John Jore
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */

r_device blyss = {
    .name           = "Blyss DC5-UK-WH",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 500,
    .long_width     = 1500,
    .gap_limit      = 2500,
    .reset_limit    = 8000,
    .decode_fn      = &blyss_callback,
    .disabled       = 0,
    .fields         = output_fields,
};
/*
 * Brennenstuhl RCS 2044 remote control on 433.92MHz
 * likely x1527
 *
 * Copyright (C) 2015 Paul Ortyl
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 */

/*
 * Receiver for the "RCS 2044 N Comfort Wireless Controller Set" sold under
 * the "Brennenstuhl" brand.
 *
 * The protocol is also implemented for raspi controlled transmitter on 433.92 MHz:
 * https://github.com/xkonni/raspberry-remote
 */
r_device brennenstuhl_rcs_2044 = {
    .name          = "Brennenstuhl RCS 2044",
    .modulation    = OOK_PULSE_PWM,
    .short_width   = 320,
    .long_width    = 968,
    .gap_limit     = 1500,
    .reset_limit   = 4000,
    .decode_fn     = &brennenstuhl_rcs_2044_callback,
    .disabled      = 1,
    .fields        = output_fields,
};
/* Bresser sensor protocol
 *
 * The protocol is for the wireless Temperature/Humidity sensor
 * Bresser Thermo-/Hygro-Sensor 3CH
 * also works for Renkforce DM-7511
 *
 * The sensor sends 15 identical packages of 40 bits each ~60s.
 * The bits are PWM modulated with On Off Keying.
 *
 * A short pulse of 250 us followed by a 500 us gap is a 0 bit,
 * a long pulse of 500 us followed by a 250 us gap is a 1 bit,
 * there is a sync preamble of pulse, gap, 750 us each, repeated 4 times.
 * Actual received and demodulated timings might be 2% shorter.
 *
 * The data is grouped in 5 bytes / 10 nibbles
 * [id] [id] [flags] [temp] [temp] [temp] [humi] [humi] [chk] [chk]
 *
 * id is an 8 bit random id that is generated when the sensor starts
 * flags are 4 bits battery low indicator, test button press and channel
 * temp is 12 bit unsigned fahrenheit offset by 90 and scaled by 10
 * humi is 8 bit relative humidity percentage
 *
 * Copyright (C) 2015 Christian W. Zuckschwerdt <zany@triq.net>
 */
r_device bresser_3ch = {
    .name           = "Bresser Thermo-/Hygro-Sensor 3CH",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 250,   // short pulse is ~250 us
    .long_width     = 500,   // long pulse is ~500 us
    .sync_width     = 750,   // sync pulse is ~750 us
    .gap_limit      = 625,   // long gap (with short pulse) is ~500 us, sync gap is ~750 us
    .reset_limit    = 1250,  // maximum gap is 1000 us (long gap + longer sync gap on last repeat)
    .decode_fn      = &bresser_3ch_callback,
    .disabled       = 0,
    .fields         = output_fields,
};
/* Shenzhen Calibeur Industries Co. Ltd Wireless Thermometer RF-104 Temperature/Humidity sensor
 * aka Biltema Art. 84-056 (Sold in Denmark)
 * aka ...
 *
 * NB. Only 3 unique sensors can be detected!
 *
 * Update (LED flash) each 2:53
 *
 * Pulse Width Modulation with fixed rate and startbit
 * Startbit     = 390 samples = 1560 µs
 * Short pulse  = 190 samples =  760 µs = Logic 0
 * Long pulse   = 560 samples = 2240 µs = Logic 1
 * Pulse rate   = 740 samples = 2960 µs
 * Burst length = 81000 samples = 324 ms
 *
 * Sequence of 5 times 21 bit separated by start bit (total of 111 pulses)
 * S 21 S 21 S 21 S 21 S 21 S
 *
 * Channel number is encoded into fractional temperature
 * Temperature is oddly arranged and offset for negative temperatures = <6543210> - 41 C
 * Always an odd number of 1s (odd parity)
 *
 * Encoding legend:
 * f = fractional temperature + <ch no> * 10
 * 0-6 = integer temperature + 41C
 * p = parity
 * H = Most significant bits of humidity [5:6]
 * h = Least significant bits of humidity [0:4]
 *
 * LSB                 MSB
 * ffffff45 01236pHH hhhhh Encoding
*/
r_device calibeur_RF104 = {
    .name           = "Calibeur RF-104 Sensor",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 760,  // Short pulse 760µs
    .long_width     = 2240, // Long pulse 2240µs
    .reset_limit    = 3200, // Longest gap (2960-760µs)
    .sync_width     = 1560, // Startbit 1560µs
    .tolerance      = 0,    // raw mode
    .decode_fn      = &calibeur_rf104_callback,
    .disabled       = 0,
    .fields         = output_fields,
};
/*
 * Cardin S466-TX2 generic garage door remote control on 27.195 Mhz
 * Remember to set de freq right with -f 27195000
 * May be useful for other Cardin product too
 *
 * Copyright (C) 2015 Denis Bodor
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2 as
 * published by the Free Software Foundation.
 */
r_device cardin = {
    .name           = "Cardin S466-TX2",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 730,
    .long_width     = 1400,
    .sync_width     = 6150,
    .gap_limit      = 1600,
    .reset_limit    = 32000,
    .decode_fn      = &cardin_callback,
    .disabled       = 0,
    .fields         = output_fields,
};

/* Chuango Security Technology Corporation
 * likely based on HS1527 or compatible
 *
 * Tested devices:
 * G5 GSM/SMS/RFID Touch Alarm System (Alarm, Disarm, ...)
 * DWC-100 Door sensor (Default: Normal Zone)
 * DWC-102 Door sensor (Default: Normal Zone)
 * KP-700 Wireless Keypad (Arm, Disarm, Home Mode, Alarm!)
 * PIR-900 PIR sensor (Default: Home Mode Zone)
 * RC-80 Remote Control (Arm, Disarm, Home Mode, Alarm!)
 * SMK-500 Smoke sensor (Default: 24H Zone)
 * WI-200 Water sensor (Default: 24H Zone)
 *
 * Note: simple 24 bit fixed ID protocol (x1527 style) and should be handled by the flex decoder.
 *
 * Copyright (C) 2015 Tommy Vestermark
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */

r_device chuango = {
    .name           = "Chuango Security Technology",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 568,  // Pulse: Short 568µs, Long 1704µs
    .long_width     = 1704, // Gaps:  Short 568µs, Long 1696µs
    .reset_limit    = 1800, // Intermessage Gap 17200µs (individually for now)
    .sync_width     = 0,    // No sync bit used
    .tolerance      = 160,  // us
    .decode_fn      = &chuango_callback,
    .disabled       = 0,
    .fields         = output_fields,
};
/** @file
    Companion WTR001 Temperature Sensor decoder.

    Copyright (C) 2019 Karl Lohner <klohner@thespill.com>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
 */

/**
Companion WTR001 Temperature Sensor decoder.

The device uses PWM encoding with 2928 us for each pulse plus gap.
- Logical 0 is encoded as 732 us pulse and 2196 us gap,
- Logical 1 is encoded as 2196 us pulse and 732 us gap,
- SYNC is encoded as 1464 us and 1464 us gap.

A transmission starts with the SYNC,
there are 5 repeated packets, each ending with a SYNC.

Full message is (1+5*(14+1))*2928 us = 304*2928us = 890,112 us.
Final 1464 us is gap silence, though.

E.g. rtl_433 -R 0 -X 'n=WTR001,m=OOK_PWM,s=732,l=2196,y=1464,r=2928,bits>=14,invert'

Data layout (14 bits):

    DDDDDXTT TTTTTP

| Ordered Bits     | Description
|------------------|-------------
| 4,3,2,1,0        | DDDDD: Fractional part of Temperature. (DDDDD - 10) / 10
| 5                | X: Always 0 in testing. Maybe battery_OK or fixed
| 12,7,6,11,10,9,8 | TTTTTTT: Temperature in Celsius = (TTTTTTT + ((DDDDD - 10) / 10)) - 41
| 13               | P: Parity to ensure count of set bits in data is odd.

Temperature in Celsius = (bin2dec(bits 12,7,6,11,10,9,8) + ((bin2dec(bits 4,3,2,1,0) - 10) / 10 ) - 41

Published range of device is -29.9C to 69.9C
*/
r_device companion_wtr001 = {
        .name        = "Companion WTR001 Temperature Sensor",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 732,  // 732 us pulse + 2196 us gap is 1 (will be inverted in code)
        .long_width  = 2196, // 2196 us pulse + 732 us gap is 0 (will be inverted in code)
        .gap_limit   = 4000, // max gap is 2928 us
        .reset_limit = 8000, //
        .sync_width  = 1464, // 1464 us pulse + 1464 us gap between each row
        .decode_fn   = &companion_wtr001_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/** @file
    Ecowitt Wireless Outdoor Thermometer WH53/WH0280/WH0281A.

    Copyright 2019 Google LLC.

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
Ecowitt Wireless Outdoor Thermometer WH53/WH0280/WH0281A.

55-bit one-row data packet format (inclusive ranges, 0-indexed):

|  0-6  | 7-bit header, ignored for checksum, always 1111111
|  7-14 | Always 01010011
| 15-22 | Sensor ID, randomly reinitialized on boot
| 23-24 | Always 00
| 25-26 | 2-bit sensor channel, selectable on back of sensor {00=1, 01=2, 10=3}
| 27-28 | Always 00
| 29-38 | 10-bit temperature in tenths of degrees C, starting from -40C. e.g. 0=-40C
| 39-46 | Trailer, always 1111 1111
| 47-54 | CRC-8 checksum poly 0x31 init 0x00 skipping first 7 bits
*/
r_device ecowitt = {
        .name        = "Ecowitt Wireless Outdoor Thermometer WH53/WH0280/WH0281A",
        .modulation  = OOK_PULSE_PWM, // copied from output, OOK_PWM = OOK_PULSE_PWM
        .short_width = 504,           // copied from output
        .long_width  = 1480,          // copied from output
        .gap_limit   = 4800,          // guessing, copied from generic_temperature_sensor
        .reset_limit = 968,           // copied from output
        .sync_width  = 0,             // copied from output
        .decode_fn   = &ecowitt_decode,
        .disabled    = 0,
        .fields      = output_fields,
};

/* Generic doorbell implementation for Elro DB286A devices
 *
 * Note that each device seems to have two codes, which alternate
 * for every other button press.
 *
 * short is 456 us pulse, 1540 us gap
 * long is 1448 us pulse, 544 us gap
 * packet gap is 7016 us
 *
 * Example code: 37f62a6c80
 *
 * Copyright (C) 2016 Fabian Zaremba <fabian@youremail.eu>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */
r_device elro_db286a = {
    .name           = "Elro DB286A Doorbell",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 456,
    .long_width     = 1448,
    .gap_limit      = 2000,
    .reset_limit    = 8000,
    .decode_fn      = &elro_db286a_callback,
    .disabled       = 1,
    .fields         = output_fields
};

// based on http://www.dc3yc.privat.t-online.de/protocol.htm

r_device elv_ws2000 = {
        .name        = "ELV WS 2000",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 366,  // 0 => 854us, 1 => 366us according to link in top
        .long_width  = 854,  // no repetitions
        .reset_limit = 1000, // Longest pause is 854us according to link
        .decode_fn   = &ws2000_callback,
        .disabled    = 1,
        .fields      = elv_ws2000_output_fields,
};

r_device fineoffset_WH2 = {
    .name           = "Fine Offset Electronics, WH2, WH5, Telldus Temperature/Humidity/Rain Sensor",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 500, // Short pulse 544Âµs, long pulse 1524Âµs, fixed gap 1036Âµs
    .long_width     = 1500, // Maximum pulse period (long pulse + fixed gap)
    .reset_limit    = 1200, // We just want 1 package
    .tolerance      = 160, // us
    .decode_fn      = &fineoffset_WH2_callback,
    .create_fn      = &fineoffset_WH2_create,
    .disabled       = 0,
    .fields         = output_fields,
};
r_device fineoffset_WH0530 = {
    .name           = "Fine Offset Electronics, WH0530 Temperature/Rain Sensor",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 504, // Short pulse 504Âµs
    .long_width     = 1480, // Long pulse 1480Âµs
    .reset_limit    = 1200, // Fixed gap 960Âµs (We just want 1 package)
    .sync_width     = 0,    // No sync bit used
    .tolerance      = 160, // us
    .decode_fn      = &fineoffset_WH0530_callback,
    .disabled       = 0,
    .fields         = output_fields_WH0530,
};
r_device fineoffset_wh1050 = {
    .name           = "Fine Offset WH1050 Weather Station",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 544,
    .long_width     = 1524,
    .reset_limit    = 10520,
    .decode_fn      = &fineoffset_wh1050_callback,
    .disabled       = 0,
    .fields         = output_fields,
};
r_device fineoffset_wh1080 = {
        .name        = "Fine Offset Electronics WH1080/WH3080 Weather Station",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 544,  // Short pulse 544Âµs, long pulse 1524Âµs, fixed gap 1036Âµs
        .long_width  = 1524, // Maximum pulse period (long pulse + fixed gap)
        .reset_limit = 2800, // We just want 1 package
        .decode_fn   = &fineoffset_wh1080_callback,
        .disabled    = 0,
        .fields      = output_fields,
};
/* Generic off-brand wireless motion sensor and alarm system on 433.3MHz
 *
 * Example codes are: 80042 Arm alarm, 80002 Disarm alarm,
 * 80008 System ping (every 15 minutes), 800a2, 800c2, 800e2 Motion event
 * (following motion detection the sensor will blackout for 90 seconds).
 *
 * 2315 baud on/off rate and alternating 579 baud bit rate and 463 baud bit rate
 * Each transmission has a warmup of 17 to 32 pulse widths then 8 packets with
 * alternating 1:3 / 2:2 or 1:4 / 2:3 gap:pulse ratio for 0/1 bit in the packet
 * with a repeat gap of 4 pulse widths, i.e.:
 * 6704 us to 13092 us warmup pulse, 1672 us gap,
 * 0: 472 us gap, 1332 us pulse
 * 1: 920 us gap, 888 us pulse
 * 1672 us repeat gap,
 * 0: 472 us gap, 1784 us pulse
 * 1: 920 us gap, 1332 us pulse
 * ...
 *
 * Copyright (C) 2015 Christian W. Zuckschwerdt <zany@triq.net>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */
r_device generic_motion = {
    .name           = "Generic wireless motion sensor",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 888,
    .long_width     = (1332+1784)/2,
    .sync_width     = 1784+670,
    .gap_limit      = 1200,
    .reset_limit    = 2724*1.5,
    .decode_fn      = &generic_motion_callback,
    .disabled       = 0,
    .fields         = output_fields
};
/* Generic remotes and sensors using PT2260/PT2262 SC2260/SC2262 EV1527 protocol
 *
 * Tested devices:
 * SC2260
 * EV1527
 *
 * Copyright (C) 2015 Tommy Vestermark
 * Copyright (C) 2015 nebman
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */
//   if ((bits != 25)
r_device generic_remote = {
    .name           = "Generic Remote SC226x EV1527",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 464,
    .long_width     = 1404,
    .reset_limit    = 1800,
    .sync_width     = 0,    // No sync bit used
    .tolerance      = 200, // us
    .decode_fn      = &generic_remote_callback,
    .disabled       = 0,
    .fields         = output_fields,
};

/** @file
    Globaltronics GT-WT-03 sensor on 433.92MHz.

    Copyright (C) 2019 Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.
*/
/** @fn int gt_wt_03_decode(r_device *decoder, bitbuffer_t *bitbuffer)
Globaltronics GT-WT-03 sensor on 433.92MHz.

The 01-set sensor has 60 ms packet gap with 10 repeats.
The 02-set sensor has no packet gap with 23 repeats.

Example:

    {41} 17 cf be fa 6a 80 [ S1 C1 26,1 C 78.9 F 48% Bat-Good Manual-Yes ]
    {41} 17 cf be fa 6a 80 [ S1 C1 26,1 C 78.9 F 48% Bat-Good Manual-Yes Batt-Changed ]
    {41} 17 cf fe fa ea 80 [ S1 C1 26,1 C 78.9 F 48% Bat-Good Manual-No  Batt-Changed ]
    {41} 01 cf 6f 11 b2 80 [ S2 C2 23,8 C 74.8 F 48% Bat-LOW  Manual-No ]
    {41} 01 c8 d0 2b 76 80 [ S2 C3 -4,4 C 24.1 F 55% Bat-Good Manual-No  Batt-Changed ]

Format string:

    ID:8h HUM:8d B:b M:b C:2d TEMP:12d CHK:8h 1x

Data layout:

   TYP IIIIIIII HHHHHHHH BMCCTTTT TTTTTTTT XXXXXXXX

- I: Random Device Code: changes with battery reset
- H: Humidity: 8 Bit 00-99, Display LL=10%, Display HH=110% (Range 20-95%)
- B: Battery: 0=OK 1=LOW
- M: Manual Send Button Pressed: 0=not pressed, 1=pressed
- C: Channel: 00=CH1, 01=CH2, 10=CH3
- T: Temperature: 12 Bit 2's complement, scaled by 10, range-50.0 C (-50.1 shown as Lo) to +70.0 C (+70.1 C is shown as Hi)
- X: Checksum, xor shifting key per byte

Humidity:
- the working range is 20-95 %
- if "LL" in display view it sends 10 %
- if "HH" in display view it sends 110%

Checksum:
Per byte xor the key for each 1-bit, shift per bit. Key list per bit, starting at MSB:
- 0x00 [07]
- 0x80 [06]
- 0x40 [05]
- 0x20 [04]
- 0x10 [03]
- 0x88 [02]
- 0xc4 [01]
- 0x62 [00]
Note: this can also be seen as lower byte of a Galois/Fibonacci LFSR-16, gen 0x00, init 0x3100 (or 0x62 if reversed) resetting at every byte.

Battery voltages:
- U=<2,65V +- ~5% Battery indicator
- U=>2.10C +- 5% plausible readings
- U=2,00V +- ~5% Temperature offset -5Â°C Humidity offset unknown
- U=<1,95V +- ~5% does not initialize anymore
- U=1,90V +- 5% temperature offset -15Â°C
- U=1,80V +- 5% Display is showing refresh pattern
- U=1.75V +- ~5% TX causes cut out

*/
r_device gt_wt_03 = {
        .name        = "Globaltronics GT-WT-03 Sensor",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 256,
        .long_width  = 625,
        .sync_width  = 855,
        .gap_limit   = 1000,
        .reset_limit = 61000,
        .decode_fn   = &gt_wt_03_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/** @file
    Microchip HCS200 KeeLoq Code Hopping Encoder based remotes.

    Copyright (C) 2019, 667bdrm

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
Microchip HCS200 KeeLoq Code Hopping Encoder based remotes.

66 bits transmitted, LSB first

|  0-31 | Encrypted Portion
| 32-59 | Serial Number
| 60-63 | Button Status
|  64   | Battery Low
|  65   | Fixed 1

Datasheet: DS40138C http://ww1.microchip.com/downloads/en/DeviceDoc/40138c.pdf

rtl_433 -R 0 -X 'n=name,m=OOK_PWM,s=370,l=772,r=14000,g=4000,t=152,y=0,preamble={12}0xfff'
*/
r_device hcs200 = {
        .name        = "Microchip HCS200 KeeLoq Hopping Encoder based remotes",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 370,
        .long_width  = 772,
        .gap_limit   = 4000,
        .reset_limit = 14000,
        .sync_width  = 0,   // No sync bit used
        .tolerance   = 152, // us
        .decode_fn   = &hcs200_callback,
        .disabled    = 0,
        .fields      = output_fields,
};
/** @file
    Honeywell ActivLink, wireless door bell, PIR Motion sensor.

    Copyright (C) 2018 Benjamin Larsson

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/

/**
Honeywell ActivLink, wireless door bell, PIR Motion sensor.

Frame documentation courtesy of https://github.com/klohner/honeywell-wireless-doorbell

Frame bits used in Honeywell RCWL300A, RCWL330A, Series 3, 5, 9 and all Decor Series:

Wireless Chimes

    0000 0000 1111 1111 2222 2222 3333 3333 4444 4444 5555 5555
    7654 3210 7654 3210 7654 3210 7654 3210 7654 3210 7654 3210
    XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XX.. XXX. .... KEY DATA (any change and receiver doesn't seem to
                                                                          recognize signal)
    XXXX XXXX XXXX XXXX XXXX .... .... .... .... .... .... .... KEY ID (different for each transmitter)
    .... .... .... .... .... 0000 00.. 0000 0000 00.. 000. .... KEY UNKNOWN 0 (always 0 in devices I've tested)
    .... .... .... .... .... .... ..XX .... .... .... .... .... DEVICE TYPE (10 = doorbell, 01 = PIR Motion sensor)
    .... .... .... .... .... .... .... .... .... ..XX ...X XXX. FLAG DATA (may be modified for possible effects on
                                                                           receiver)
    .... .... .... .... .... .... .... .... .... ..XX .... .... ALERT (00 = normal, 01 or 10 = right-left halo light
                                                                       pattern, 11 = full volume alarm)
    .... .... .... .... .... .... .... .... .... .... ...X .... SECRET KNOCK (0 = default, 1 if doorbell is pressed 3x
                                                                              rapidly)
    .... .... .... .... .... .... .... .... .... .... .... X... RELAY (1 if signal is a retransmission of a received
                                                                       transmission, only some models)
    .... .... .... .... .... .... .... .... .... .... .... .X.. FLAG UNKNOWN (0 = default, but 1 is accepted and I don't
                                                                              oberserve any effects)
    .... .... .... .... .... .... .... .... .... .... .... ..X. LOWBAT (1 if battery is low, receiver gives low battery
                                                                        alert)
    .... .... .... .... .... .... .... .... .... .... .... ...X PARITY (LSB of count of set bits in previous 47 bits)
*/

r_device honeywell_wdb = {
        .name        = "Honeywell ActivLink, Wireless Doorbell",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 175,
        .long_width  = 340,
        .gap_limit   = 0,
        .reset_limit = 5000,
        .sync_width  = 500,
        .decode_fn   = &honeywell_wdb_callback,
        .disabled    = 0,
        .fields      = output_fields,
};
/* HT680 based Remote control (broadly similar to x1527 protocol)
 *
 * short is 850 us gap 260 us pulse
 * long is 434 us gap 663 us pulse
 *
        if (bitbuffer->bits_per_row[row] != 41 || // Length of packet is 41 (36+5)
                (bitbuffer->bb[row][0] & 0xf8) != 0xa8) // Sync is 10101xxx (5 bits)
 * Copyright (C) 2016 Igor Polovnikov
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */
r_device ht680 = {
    .name          = "HT680 Remote control",
    .modulation    = OOK_PULSE_PWM,
    .short_width   = 200,
    .long_width    = 600,
    .gap_limit     = 1200,
    .reset_limit   = 14000,
    .decode_fn     = &ht680_callback,
    .disabled      = 0,
    .fields        = output_fields,
};
/* Kerui PIR / Contact Sensor
 *
 * Such as
 * http://www.ebay.co.uk/sch/i.html?_from=R40&_trksid=p2050601.m570.l1313.TR0.TRC0.H0.Xkerui+pir.TRS0&_nkw=kerui+pir&_sacat=0
 *
 * also tested with:
 *   KERUI D026 Window Door Magnet Sensor Detector (433MHz) https://fccid.io/2AGNGKR-D026
 *   events: open / close / tamper / battery low (below 5V of 12V battery)
 *
 * Note: simple 24 bit fixed ID protocol (x1527 style) and should be handled by the flex decoder.
 */
r_device kerui = {
    .name          = "Kerui PIR / Contact Sensor",
    .modulation    = OOK_PULSE_PWM,
    .short_width   = 320,
    .long_width    = 960,
    .reset_limit   = 1100, // 9900,
    //.gap_limit     = 1100,
    .sync_width    = 480,
    .tolerance     = 80, // us
    .decode_fn     = &kerui_callback,
    .disabled      = 0,
    .fields         = output_fields,
};
/** @file
    LaCrosse TX 433 Mhz Temperature and Humidity Sensors.

    Copyright (C) 2015 Robert C. Terzi

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/** @fn int lacrossetx_decode(r_device *decoder, bitbuffer_t *bitbuffer)
LaCrosse TX 433 Mhz Temperature and Humidity Sensors.
- Tested: TX-7U and TX-6U (Temperature only)
- Not Tested but should work: TX-3, TX-4
- also TFA Dostmann 30.3120.90 sensor (for e.g. 35.1018.06 (WS-9015) station)

Protocol Documentation: http://www.f6fbb.org/domo/sensors/tx3_th.php

Message is 44 bits, 11 x 4 bit nybbles:

    [00] [cnt = 10] [type] [addr] [addr + parity] [v1] [v2] [v3] [iv1] [iv2] [check]

Notes:
- Zero Pulses are longer (1,400 uS High, 1,000 uS Low) = 2,400 uS
- One Pulses are shorter (  550 uS High, 1,000 uS Low) = 1,600 uS
- Sensor id changes when the battery is changed
- Primary Value are BCD with one decimal place: vvv = 12.3
- Secondary value is integer only intval = 12, seems to be a repeat of primary
  This may actually be an additional data check because the 4 bit checksum
  and parity bit is  pretty week at detecting errors.
- Temperature is in Celsius with 50.0 added (to handle negative values)
- Humidity values appear to be integer precision, decimal always 0.
- There is a 4 bit checksum and a parity bit covering the three digit value
- Parity check for TX-3 and TX-4 might be different.
- Msg sent with one repeat after 30 mS
- Temperature and humidity are sent as separate messages
- Frequency for each sensor may be could be off by as much as 50-75 khz
- LaCrosse Sensors in other frequency ranges (915 Mhz) use FSK not OOK
  so they can't be decoded by rtl_433 currently.

TO DO:
- Now that we have a demodulator that isn't stripping the first bit
  the detect and decode could be collapsed into a single reasonably
  readable function.
*/

r_device lacrossetx = {
        .name        = "LaCrosse TX Temperature / Humidity Sensor",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 550,  // 550 us pulse + 1000 us gap is 1
        .long_width  = 1400, // 1400 us pulse + 1000 us gap is 0
        .gap_limit   = 3000, // max gap is 1000 us
        .reset_limit = 8000, // actually: packet gap is 29000 us
        .sync_width  = 0,    // not used
        .tolerance   = 0,    // raw mode
        .decode_fn   = &lacrossetx_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/** @file
    LaCrosse TX141-Bv2, TX141TH-Bv2, TX141-Bv3, TX145wsdth sensor

    Changes done by Andrew Rivett <veggiefrog@gmail.com>. Copyright is
    retained by Robert Fraczkiewicz.

    Copyright (C) 2017 Robert Fraczkiewicz <aromring@gmail.com>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
LaCrosse Color Forecast Station (model C85845), or other LaCrosse product
utilizing the remote temperature/humidity sensor TX141TH-Bv2 transmitting
in the 433.92 MHz band. Product pages:
http://www.lacrossetechnology.com/c85845-color-weather-station/
http://www.lacrossetechnology.com/tx141th-bv2-temperature-humidity-sensor

The TX141TH-Bv2 protocol is OOK modulated PWM with fixed period of 625 us
for data bits, preambled by four long startbit pulses of fixed period equal
to ~1666 us. Hence, it is similar to Bresser Thermo-/Hygro-Sensor 3CH.

A single data packet looks as follows:
1) preamble - 833 us high followed by 833 us low, repeated 4 times:

     ----      ----      ----      ----
    |    |    |    |    |    |    |    |
          ----      ----      ----      ----

2) a train of 40 data pulses with fixed 625 us period follows immediately:

     ---    --     --     ---    ---    --     ---
    |   |  |  |   |  |   |   |  |   |  |  |   |   |
         --    ---    ---     --     --    ---     -- ....

A logical 1 is 417 us of high followed by 208 us of low.
A logical 0 is 208 us of high followed by 417 us of low.
Thus, in the example pictured above the bits are 1 0 0 1 1 0 1 ....

The TX141TH-Bv2 sensor sends 12 of identical packets, one immediately following
the other, in a single burst. These 12-packet bursts repeat every 50 seconds. At
the end of the last packet there are two 833 us pulses ("post-amble"?).

The data is grouped in 5 bytes / 10 nybbles

    [id] [id] [flags] [temp] [temp] [temp] [humi] [humi] [chk] [chk]

The "id" is an 8 bit random integer generated when the sensor powers up for the
first time; "flags" are 4 bits for battery low indicator, test button press,
and channel; "temp" is 12 bit unsigned integer which encodes temperature in degrees
Celsius as follows:
temp_c = temp/10 - 50
to account for the -40 C -- 60 C range; "humi" is 8 bit integer indicating
relative humidity in %. The method of calculating "chk", the presumed 8-bit checksum
remains a complete mystery at the moment of this writing, and I am not totally sure
if the last is any kind of CRC. I've run reveng 1.4.4 on exemplary data with all
available CRC algorithms and found no match. Be my guest if you want to
solve it - for example, if you figure out why the following two pairs have identical
checksums you'll become a hero:

    0x87 0x02 0x3c 0x3b 0xe1
    0x87 0x02 0x7d 0x37 0xe1
    0x87 0x01 0xc3 0x31 0xd8
    0x87 0x02 0x28 0x37 0xd8

Developer's comment: with unknown CRC (see above) the obvious way of checking the data
integrity is making use of the 12 packet repetition. In principle, transmission errors are
be relatively rare, thus the most frequent packet should represent the true data.
A count enables us to determine the quality of radio transmission.

*** Addition of TX141 temperature only device, Jan 2018 by Andrew Rivett <veggiefrog@gmail.com>**

The TX141-BV2 is the temperature only version of the TX141TH-BV2 sensor.

Changes:
- LACROSSE_TX141_BITLEN is 37 instead of 40.
- The humidity variable has been removed for TX141.
- Battery check bit is inverse of TX141TH.
- temp_f removed, temp_c (celsius) is what's provided by the device.

- TX141TH-BV3 bitlen is 41

The CRC Checksum is not checked. In trying to reverse engineer the
CRC, the first nibble can be checked by:

    a1 = (bytes[0]&0xF0) >> 4);
    b1 = (bytes[1]&0x40) >> 4) - 1;
    c1 = (bytes[2]&0xF0) >> 4);
    n1 = (a1+a2+c3)&0x0F;

The second nibble I could not figure out.

Addition of TX141W and TX145wsdth:

    PRE5b ID19h BAT1b TEST?1b CH?2h TYPE4h TEMP_WIND12d HUM_DIR12d CHK8h 1x

- type 1 has temp+hum (temp is offset 500 and scale 10)
- type 2 has wind speed (km/h scale 10) and direction (degrees)
- checksum is CRC-8 poly 0x31 init 0x00 over preceeding 7 bytes

*/
// note TX141W, TX145wsdth: m=OOK_PWM, s=256, l=500, r=1888, y=748
r_device lacrosse_tx141x = {
        .name        = "LaCrosse TX141-Bv2, TX141TH-Bv2, TX141-Bv3, TX141W, TX145wsdth sensor",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 208,  // short pulse is 208 us + 417 us gap
        .long_width  = 417,  // long pulse is 417 us + 208 us gap
        .sync_width  = 833,  // sync pulse is 833 us + 833 us gap
        .gap_limit   = 625,  // long gap (with short pulse) is ~417 us, sync gap is ~833 us
        .reset_limit = 1700, // maximum gap is 1250 us (long gap + longer sync gap on last repeat)
        .decode_fn   = &lacrosse_tx141x_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/** @file
    LaCrosse WS7000/WS2500 weather sensors.

    Copyright (C) 2019 ReMiOS and Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
LaCrosse WS7000/WS2500 weather sensors.
Also sold by ELV and Conrad. Related to ELV WS 2000.

- WS2500-19 brightness sensor
- WS7000-20 meteo sensor (temperature/humidity/pressure)
- WS7000-16 Rain Sensor
- WS7000-15 wind sensor

PWM 400 us / 800 us with fixed bit width of 1200 us.
Messages are sent as nibbles (4 bits) with LSB sent first.
A frame is composed of a preamble followed by nibbles (4 bits) separated by a 1-bit.

Message Layout:

    P P S A D..D X C

- Preamble: 10x bit "0", bit "1"
- Sensor Type:  Value 0..9 determing the sensor type
  - 0 = WS7000-27/28 Thermo sensor (interval 177s - Addr * 0.5s)
  - 1 = WS7000-22/25 Thermo/Humidity sensor (interval 177s - Addr * 0.5s)
  - 2 = WS7000-16 Rain sensor (interval 173s - Addr * 0.5s)
  - 3 = WS7000-15 Wind sensor (interval 169s - Addr * 0.5s)
  - 4 = WS7000-20 Thermo/Humidity/Barometer sensor (interval 165s - Addr * 0.5s)
  - 5 = WS2500-19 Brightness sensor (interval 161s - Addr * 0.5s)
- Address:  Value 0..7 for the sensor address
  - In case of a negative temperature the MSB of the Address becomes "1"
- Data:     3-10 nibbles with BCD encoded sensor data values.
- XOR:      Nibble holding XOR of the S ^ A ^ Data nibbles
- Checksum: Sum of all nibbles + 5 (i.e. S + A + nibble(0) + .. + nibble(n) + XOR + 5) & 0xF

*/
r_device lacrosse_ws7000 = {
        .name        = "LaCrosse/ELV/Conrad WS7000/WS2500 weather sensors",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 400,
        .long_width  = 800,
        .reset_limit = 1100,
        .decode_fn   = &lacrosse_ws7000_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/** @file
    LaCrosse WS-2310 / WS-3600 433 Mhz Weather Station.
*/
/** @fn int lacrossews_callback(r_device *decoder, bitbuffer_t *bitbuffer)
LaCrosse WS-2310 / WS-3600 433 Mhz Weather Station.

- long pulse 1464 us
- short pulse 368 us
- fixed gap 1336 us

Packet Format is 53 bits/ 13 nibbles:

|  bits | nibble
| ----- | ------
|  0- 3 | 0 - 0000
|  4- 7 | 1 - 1001 for WS-2310, 0110 for WS-3600
|  8-11 | 2 - Type  GPTT  G=0, P=Parity, Gust=Gust, TT=Type  GTT 000=Temp, 001=Humidity, 010=Rain, 011=Wind, 111-Gust
| 12-15 | 3 - ID High
| 16-19 | 4 - ID Low
| 20-23 | 5 - Data Types  GWRH  G=Gust Sent, W=Wind Sent, R=Rain Sent, H=Humidity Sent
| 24-27 | 6 - Parity TUU? T=Temp Sent, UU=Next Update, 00=8 seconds, 01=32 seconds, 10=?, 11=128 seconds, ?=?
| 28-31 | 7 - Value1
| 32-35 | 8 - Value2
| 36-39 | 9 - Value3
| 40-43 | 10 - ~Value1
| 44-47 | 11 - ~Value2
| 48-51 | 12 - Check Sum = Nibble sum of nibbles 0-11
*/

r_device lacrossews = {
        .name        = "LaCrosse WS-2310 / WS-3600 Weather Station",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 368,
        .long_width  = 1464,
        .reset_limit = 8000,
        .decode_fn   = &lacrossews_callback,
        .disabled    = 0,
        .fields      = output_fields,
};
/* Opus/Imagintronix XT300 Soil Moisture Sensor
 *
 * Also called XH300 sometimes, this seems to be the associated display name
 *
 * https://www.plantcaretools.com/product/wireless-moisture-monitor/
 *
 * Data is transmitted with 6 bytes row:
 *
 +.  0. 1. 2. 3. 4. 5
 *  FF ID SM TT ?? CC
 *
 * FF: initial preamble
 * ID: 0101 01ID
 * SM: soil moisure (decimal 05 -> 99 %)
 * TT: temperature Â°C + 40Â°C (decimal)
 * ??: always FF... maybe spare bytes
 * CC: check sum (simple sum) except 0xFF preamble
 *
 */
r_device opus_xt300 = {
    .name           = "Opus/Imagintronix XT300 Soil Moisture",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 544,
    .long_width     = 932,
    .gap_limit      = 10000,
    .reset_limit    = 31000,
    .decode_fn      = &opus_xt300_callback,
    .disabled       = 0,
    .fields         = output_fields
};

/* OSv1 protocol
 *
 * MC with nominal bit width of 2930 us.
 * Pulses are somewhat longer than nominal half-bit width, 1748 us / 3216 us,
 * Gaps are somewhat shorter than nominal half-bit width, 1176 us / 2640 us.
 * After 12 preamble bits there is 4200 us gap, 5780 us pulse, 5200 us gap.
 *
 * Care must be taken with the gap after the sync pulse since it
 * is outside of the normal clocking.  Because of this a data stream
 * beginning with a 0 will have data in this gap.
 */
r_device oregon_scientific_v1 = {
    .name           = "OSv1 Temperature Sensor",
    .modulation     = OOK_PULSE_PWM_OSV1,
    .short_width    = 1465, // nominal half-bit width
    .sync_width     = 5780,
    .gap_limit      = 3500,
    .reset_limit    = 14000,
    .decode_fn      = &oregon_scientific_v1_callback,
    .disabled       = 0,
    .fields         = output_fields
};

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
Philips outdoor temperature sensor -- used with various Philips clock
radios (tested on AJ3650).

Not tested, but these should also work: AJ260 ... maybe others?

A complete message is 112 bits:
- 4-bit initial preamble, always 0
- 4-bit packet separator, always 0, followed by 32-bit data packet.
- Packets are repeated 3 times for 108 bits total.

32-bit data packet format:

    0001cccc tttttttt tt000000 0b0?ssss

- c: channel: 0=channel 2, 2=channel 1, 4=channel 3 (4 bits)
- t: temperature in Celsius: subtract 500 and divide by 10 (10 bits)
- b: battery status: 0 = OK, 1 = LOW (1 bit)
- ?: unknown: always 1 in every packet I've seen (1 bit)
- s: CRC: non-standard CRC-4, poly 0x9, init 0x1

Pulse width:
- Short: 2000 us = 0
- Long: 6000 us = 1
Gap width:
- Short: 6000 us
- Long: 2000 us
Gap width between packets: 29000 us

Presumably the 4-bit preamble is meant to be a sync of some sort,
but it has the exact same pulse/gap width as a short pulse, and
gets processed as data.
*/
r_device philips_aj3650 = {
        .name        = "Philips outdoor temperature sensor (type AJ3650)",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 2000,
        .long_width  = 6000,
//        .gap_limit   = 8000,
        .reset_limit = 30000,
        .decode_fn   = &philips_aj3650_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/** @file
    Philips outdoor temperature sensor.

    Copyright (C) 2018 Nicolas Jourden <nicolas.jourden@laposte.net>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
Philips outdoor temperature sensor -- used with various Philips clock
radios (tested on AJ7010).
This is inspired from the other Philips driver made by Chris Coffey.

A complete message is 40 bits:
- 3 times sync of 1000us pulse + 1000us gap.
- 40 bits, 2000 us short or 6000 us long
- packet gap is 38 ms
- Packets are repeated 3 times.

40-bit data packet format:

    00000000 01000101 00100010 00101001 01001110 : g_philips_21.1_ch2_B.cu8
    00000000 01011010 01111100 00101001 00001111 : g_philips_21.4_ch1_C.cu8
    00000000 01011010 00000101 00100110 01111001 : gph_bootCh1_17.cu8
    00000000 01000101 00011110 00100110 01111101 : gph_bootCh2_17.cu8
    00000000 00110110 11100011 00100101 11110000 : gph_bootCh3_17.cu8

Data format is:

    00000000  0ccccccc tttttttt TTTTTTTT XXXXXXXX

- c: 7 bit channel: 0x5A=channel 1, 0x45=channel 2, 0x36=channel 3
- t: 16 bit temperature in ADC value that is then converted to deg. C.
- X: XOR sum, every 2nd packet without last data byte (T).
*/
r_device philips_aj7010 = {
        .name        = "Philips outdoor temperature sensor (type AJ7010)",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 2000,
        .long_width  = 6000,
        .sync_width  = 1000,
        .reset_limit = 30000,
        .decode_fn   = &philips_aj7010_decode,
        .disabled    = 0,
        .fields      = output_fields,
};

/* Quhwa
 * HS1527
 *
 * Tested devices:
 * QH-C-CE-3V (which should be compatible with QH-832AC),
 * also sold as "1 by One" wireless doorbell
 *
 * Copyright (C) 2016 Ask Jakobsen
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */
r_device quhwa = {
    .name          = "Quhwa",
    .modulation    = OOK_PULSE_PWM,
    .short_width   = 360,  // Pulse: Short 360µs, Long 1070µs
    .long_width    = 1070, // Gaps: Short 360µs, Long 1070µs
    .reset_limit   = 6600, // Intermessage Gap 6500µs
    .gap_limit     = 1200, // Long Gap 1120µs
    .sync_width    = 0,    // No sync bit used
    .tolerance     = 80,   // us
    .decode_fn     = &quhwa_callback,
    .disabled      = 0,
    .fields        = output_fields
};
/* Silvercrest remote decoder.
 *
 * Copyright (C) 2018 Benjamin Larsson
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 */
 r_device silvercrest = {
    .name           = "Silvercrest Remote Control",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 264,
    .long_width     = 744,
    .reset_limit    = 12000,
    .gap_limit      = 5000,
    .decode_fn      = &silvercrest_callback,
    .disabled       = 0,
    .fields        = output_fields,
};
/* Wireless Smoke & Heat Detector
 * Ningbo Siterwell Electronics  GS 558  Sw. V05  Ver. 1.3  on 433.885MHz
 * VisorTech RWM-460.f  Sw. V05, distributed by PEARL, seen on 433.674MHz
 *
 * A short wakeup pulse followed by a wide gap (11764 us gap),
 * followed by 24 data pulses and 2 short stop pulses (in a single bit width).
 * This is repeated 8 times with the next wakeup directly following
 * the preceding stop pulses.
 *
 * Bit width is 1731 us with
 * Short pulse: -___ 436 us pulse + 1299 us gap
 * Long pulse:  ---_ 1202 us pulse + 526 us gap
 * Stop pulse:  -_-_ 434us pulse + 434us gap + 434us pulse + 434us gap
 * = 2300 baud pulse width / 578 baud bit width
 *
 * 24 bits (6 nibbles):
 * - first 5 bits are unit number with bits reversed
 * - next 15(?) bits are group id, likely also reversed
 * - last 4 bits are always 0x3 (maybe hardware/protocol version)
 * Decoding will reverse the whole packet.
 * Short pulses are 0, long pulses 1, need to invert the demod output.
 *
 * Each device has it's own group id and unit number as well as a
 * shared/learned group id and unit number.
 * In learn mode the primary will offer it's group id and the next unit number.
 * The secondary device acknowledges pairing with 16 0x555555 packets
 * and copies the offered shared group id and unit number.
 * The primary device then increases it's unit number.
 * This means the primary will always have the same unit number as the
 * last learned secondary, weird.
 * Also you always need to learn from the same primary.
 *
 * Copyright (C) 2017 Christian W. Zuckschwerdt <zany@triq.net>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */
r_device smoke_gs558 = {
    .name           = "Wireless Smoke and Heat Detector GS 558",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 436, // Threshold between short and long pulse [us]
    .long_width     = 1202, // Maximum gap size before new row of bits [us]
    .gap_limit      = 1299 * 1.5f, // Maximum gap size before new row of bits [us]
    .reset_limit    = 11764 * 1.2f, // Maximum gap size before End Of Message [us]
    .decode_fn      = &smoke_gs558_callback,
    .disabled       = 0,
    .fields         = output_fields
};
/** @file
    Decoder for TFA Drop 30.3233.01.

    Copyright (C) 2020 Michael Haas

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
 */

/**
TFA Drop is a rain gauge with a tipping bucket mechanism.

Links:

 - Product page:
   - https://www.tfa-dostmann.de/en/produkt/wireless-rain-gauge-drop/
 - Manual 2019:
   - https://clientmedia.trade-server.net/1768_tfadost/media/2/66/16266.pdf
 - Manual 2020:
   - https://clientmedia.trade-server.net/1768_tfadost/media/3/04/16304.pdf
 - Discussion of protocol:
   - https://github.com/merbanan/rtl_433/issues/1240

The sensor has part number 30.3233.01. The full package, including the
base station, has part number 47.3005.01.

The device uses PWM encoding:

- 0 is encoded as 250 us pulse and a 500us gap
- 1 is encoded as 500 us pulse and a 250us gap

Note that this encoding scheme is inverted relative to the default
interpretation of short/long pulses in the PWM decoder in rtl_433.
The implementation below thus inverts the buffer. The protocol is
described below in the correct space, i.e. after the buffer has been
inverted.

Not every tip of the bucket triggers a message immediately. In some
cases, artifically tipping the bucket many times lead to the base
station ignoring the signal completely until the device was reset.

Data layout:

```
CCCCIIII IIIIIIII IIIIIIII BCUU XXXX RRRRRRRR CCCCCCCC SSSSSSSS MMMMMMMM
KKKK
```

- C: 4 bit message prefix, always 0x3
- I: 2.5 byte ID
- B: 1 bit, battery_low. 0 if battery OK, 1 if battery is low.
- C: 1 bit, device reset. Set to 1 briefly after battery insert.
- X: Transmission counter
     - Possible values: 0x0, 0x2, 0x4, 0x6, 0x8, 0xA, 0xE, 0xE.
     - Rolls over.
- R: LSB of 16-bit little endian rain counter
- S: MSB of 16-bit little endian rain counter
- C: Fixed to 0xaa
- M: Checksum.
   - Compute with reverse Galois LFSR with byte reflection, generator
     0x31 and key 0xf4.
- K: Unknown. Either b1011 or b0111.
     - Distribution: 50:50.

[Bitbench](http://triq.net/bitbench) string:

```
ID:hh ID:hh ID:hh BAT_LOW:b RESET:b UNKNOWN:bb XMIT_COUNTER:h RAIN_A:d
CONST:hh RAIN_B:d CHECK:8b UNKNOWN:bbxx xxxx
```

Some example data:

```
c240aaff09550021c
c240aabf095500e04
c240aafd095500b64
c240aafb0955003e4
c240aaf9095500a9c
c212b7f9035500e5c
c212b7f703550053c
c212b7f5035500c44
```


The rain bucket counter represents the number of tips of the rain
bucket. Each tip of the bucket corresponds to 0.254mm of rain.

The rain bucket counter does not start at 0. Instead, the counter
starts at 65526 to indicate 0 tips of the bucket. The counter rolls
over at 65535 to 0, which corresponds to 9 and 10 tips of the bucket.

If no change is detected, the sensor will continue broadcasting
identical values. This lasts at least for 20 minutes,
potentially forever.

The second nibble of byte 3 is a transmission counter: 0x0, 0x2, 0x4,
0x6, 0x8, 0xa, 0xc, 0xe. After the transmission with counter 0xe, the
counter rolls over to 0x0 on the next transmission and the cycle starts
over.

After battery insertion, the sensor will transmit 7 messages in rapid
succession, one message every 3 seconds. After the first message,
the remaining 6 messages have bit 1 of byte 3 set to 1. This could be
some sort of reset indicator.
For these 6 messages, the transmission counter does not increase.

After the full 7 messages, one regular message is sent after 30s.
Afterwards, messages are sent every 45s.
*/
r_device tfa_drop_303233 = {
        .name        = "TFA Drop Rain Gauge 30.3233.01",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 255,
        .long_width  = 510,
        .gap_limit   = 1300,
        .reset_limit = 2500,
        .sync_width  = 750,
        .decode_fn   = &tfa_drop_303233_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/* Example of a generic remote using PT2260/PT2262 SC2260/SC2262 EV1527 protocol
 *
 * fixed bit width of 1445 us
 * short pulse is 357 us (1/4th)
 * long pulse is 1064 (3/4th)
 * a packet is 15 pulses, the last pulse (short) is sync pulse
 * packet gap is 11.5 ms
 *
 * note that this decoder uses:
 * short-short (1 1 by the demod) as 0 (per protocol),
 * short-long (1 0 by the demod) as 1 (F per protocol),
 * long-long (0 0 by the demod) not used (1 per protocol).
 */
r_device waveman = {
    .name           = "Waveman Switch Transmitter",
    .modulation     = OOK_PULSE_PWM,
    .short_width    = 357,
    .long_width     = 1064,
    .gap_limit      = 1400,
    .reset_limit    = 12000,
    .sync_width     = 0,    // No sync bit used
    .tolerance      = 200,  // us
    .decode_fn      = &waveman_callback,
    .disabled       = 0,
    .fields         = output_fields
};
/** @file
    WG-PB12V1 Temperature Sensor.

    Copyright (C) 2015 Tommy Vestermark
    Modifications Copyright (C) 2017 Ciarán Mooney

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
WG-PB12V1 Temperature Sensor.

Device method to decode a generic wireless temperature probe. Probe marked
with WG-PB12V1-2016/11.

Format of Packets:

The packet format appears to be similar those the Lacrosse format.
(http://fredboboss.free.fr/articles/tx29.php)

    AAAAAAAA MMMMTTTT TTTTTTTT ???IIIII HHHHHHHH CCCCCCCC

- A: Preamble - 11111111
- M: Message type?, fixed 0x3, e.g. Fine Offset WH2 has 0x4 here
- T: Temperature, scale 10, offset 40
- I: ID of probe is set randomly each time the device is powered off-on,
     Note, base station has and unused "123" symbol, but ID values can be
     higher than this.
- H: Humidity - not used, is always 11111111
- C: Checksum - CRC8, polynomial 0x31, initial value 0x0, final value 0x0

Temperature:

Temperature value is "deci-celsius", ie 10 dC = 1C, offset by -40 C.

    0010 01011101 = 605 dC => 60.5 C
    Remove offset => 60.5 C - 40 C = 20.5 C

Unknown:

Possible uses could be weak battery, or new battery.

At the moment it this device cannot distinguish between a Fine Offset
device, see fineoffset.c.
*/
r_device wg_pb12v1 = {
        .name        = "WG-PB12V1 Temperature Sensor",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 564,  // Short pulse 564µs, long pulse 1476µs, fixed gap 960µs
        .long_width  = 1476, // Maximum pulse period (long pulse + fixed gap)
        .reset_limit = 2500, // We just want 1 package
        .decode_fn   = &wg_pb12v1_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/** @file
    WS2032 weather station.

    Copyright (C) 2019 Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.
 */
/**
WS2032 weather station.

- Outdoor temperature range: -40F to 140F (-40C to 60C)
- Temperature accuracy: +- 1.0 C
- Humidity range: 20% to 90%
- Humidity accuracy: +-5%
- Wind direction: E,S,W,N,SE,NE,SW,NW
- Wind direction accuracy: +- 10 deg
- Wind speed: 0 to 50m/s, Accuracy: 0.1 m/s

Data format:

    1x PRE:8h ID:16h ?8h DIR:4h TEMP:12d HUM:8d AVG?8d GUST?8d 24h SUM8h CHK8h TRAIL:3b

OOK with PWM. Long = 1000 us, short = 532 us, gap = 484 us.
The overlong and very short pulses are sync, see the Pulseview.

Temp, not 2's complement but a dedicated sign-bit, i.e. 1 bit sign, 11 bit temp.

*/
r_device ws2032 = {
        .name        = "WS2032 weather station",
        .modulation  = OOK_PULSE_PWM,
        .short_width = 500,
        .long_width  = 1000,
        .gap_limit   = 750,
        .reset_limit = 4000,
        .decode_fn   = &fineoffset_ws2032_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/* WT0124 Pool Thermometer decoder.
 *
 * Copyright (C) 2018 Benjamin Larsson
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 *
 */

/*

5e       ba       9a       9f       e1       34
01011110 10111010 10011010 10011111 11100001 00110100
5555RRRR RRRRTTTT TTTTTTTT UUCCFFFF XXXXXXXX ????????


5 = constant 5
R = random power on id
T = 12 bits of temperature with 0x900 bias and scaled by 10
U = unk, maybe battery indicator (display is missing one though)
C = channel
F = constant F
X = xor checksum
? = unknown

*/
r_device wt1024 = {
    .name          = "WT0124 Pool Thermometer",
    .modulation    = OOK_PULSE_PWM,
    .short_width   = 680,
    .long_width    = 1850,
    .reset_limit   = 30000,
    .gap_limit     = 4000,
    .sync_width    = 10000,
    .decode_fn     = &wt1024_callback,
    .disabled      = 0,
    .fields        = output_fields,
};


