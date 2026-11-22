/* Ambient Weather F007TH Thermo-Hygrometer
 * contributed by David Ediger
 * discovered by Ron C. Lewis
 *
 * The check is an LFSR Digest-8, gen 0x98, key 0x3e, init 0x64
 *

#include "decoder.h"

// three repeats without gap
// full preamble is 0x00145 (the last bits might not be fixed, e.g. 0x00146)
// and on decoding also 0xffd45
static const uint8_t preamble_pattern[2] = {0x01, 0x45}; // 12 bits
static const uint8_t preamble_inverted[2] = {0xfd, 0x45}; // 12 bits
*/
r_device ambient_weather = {
    .name          = "Ambient Weather Temperature Sensor",
    .modulation    = OOK_PULSE_MANCHESTER_ZEROBIT,
    .short_width   = 500,
    .long_width    = 0, // not used
    .reset_limit   = 2400,
    .decode_fn     = &ambient_weather_callback,
    .disabled      = 0,
    .fields        = output_fields
};
/** ELV Energy Counter ESA 1000/2000.
 *
 * Copyright (C) 2016 TylerDurden23, initial cleanup by Benjamin Larsson
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.


#include "decoder.h"

#define MAXMSG 40               // ESA messages
*/

r_device esa_energy = {
    .name           = "ESA1000 / ESA2000 Energy Monitor",
    .modulation     = OOK_PULSE_MANCHESTER_ZEROBIT,
    .short_width    = 260,
    .long_width     = 0,
    .reset_limit    = 3000,
    .decode_fn      = &esa_cost_callback,
    .disabled       = 1,
    .fields         = output_fields,
};
/** @file
    Honeywell (Ademco) Door/Window Sensors (345Mhz).

    Copyright (C) 2016 adam1010
    Copyright (C) 2019 Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/**
Honeywell (Ademco) Door/Window Sensors (345.0Mhz).

Tested with the Honeywell 5811 Wireless Door/Window transmitters.

Also: 2Gig DW10 door sensors,
and Resolution Products RE208 (wire to air repeater).
And DW11 with 96 bit packets.

Maybe: 5890PI?

64 bit packets, repeated multiple times per open/close event.

Protocol whitepaper: "DEFCON 22: Home Insecurity" by Logan Lamb.

Data layout:

    PP PP C IIIII EE SS SS

- P: 16bit Preamble and sync bit (always ff fe)
- C: 4bit Channel
- I: 20bit Device serial number / or counter value
- E: 8bit Event, where 0x80 = Open/Close, 0x04 = Heartbeat / or id
- S: 16bit CRC

*/
r_device honeywell = {
        .name        = "Honeywell Door/Window Sensor, 2Gig DW10/DW11, RE208 repeater",
        .modulation  = OOK_PULSE_MANCHESTER_ZEROBIT,
        .short_width = 156,
        .long_width  = 0,
        .reset_limit = 292,
        .decode_fn   = &honeywell_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/* IBIS vehicle information beacon, used in public transportation.
 *
 * The packet is 28 manchester encoded bytes with a Preamble of 0xAAB and
 * 16-bit CRC, containing a company ID, vehicle ID, (door opening) counter,
 * and various flags.
 *
 * Copyright (C) 2017 Christian W. Zuckschwerdt <zany@triq.net>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.

static int ibis_beacon_callback(r_device *decoder, bitbuffer_t *bitbuffer) {
    data_t *data;
    uint8_t search = 0xAB; // preamble is 0xAAB
    uint8_t msg[32];
    unsigned len;
    unsigned pos;
    unsigned i;
    int id;
    unsigned counter;
    int crc;
    int crc_calculated;
    char code_str[63];

    // 224 bits data + 12 bits preamble
*/

r_device ibis_beacon = {
    .name           = "IBIS beacon",
    .modulation     = OOK_PULSE_MANCHESTER_ZEROBIT,
    .short_width    = 30,  // Nominal width of clock half period [us]
    .long_width     = 0,   // Not used
    .reset_limit    = 100, // Maximum gap size before End Of Message [us].
    .decode_fn      = &ibis_beacon_callback,
    .disabled       = 0,
    .fields         = output_fields,
};
/* Maverick ET-73x BBQ Sensor
 *
 * Copyright (C) 2016 gismo2004
 * Credits to all users of mentioned forum below!
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
*/

/**The thermometer transmits 4 identical messages every 12 seconds at 433.92 MHz,
 * using on-off keying and 2000bps Manchester encoding,
 * with each message preceded by 8 carrier pulses 230 us wide and 5 ms apart.
 *
 * Each message consists of 26 nibbles (104 bits total) which are again manchester (IEEE) encoded (52 bits)
 * For nibble 24 some devices are sending 0x1 or 0x2 ?
 *
 * Payload:
 * P = 12 bit Preamble (raw 0x55666a, decoded 0xfa8)
 * F =  4 bit device state (2=default; 7=init)
 * T = 10 bit temp1 (degree C, offset by 532)
 * t = 10 bit temp2 (degree C, offset by 532)
 * D = 16 bit digest (over FTt, includes non-transmitted device id renewed on a device reset) gen 0x8810 init 0xdd38
 *
 * nibble: 0 1 2 3 4 5 6  7 8 9 10 11 12
 * msg:    P P P F T T Tt t t D D  D  D
 * PRE:12h FLAG:4h TA:10d TB:10d | DIGEST:16h
 *
 * further information can be found here: https://forums.adafruit.com/viewtopic.php?f=8&t=25414

static int maverick_et73x_callback(r_device *decoder, bitbuffer_t *bitbuffer)
{
    data_t *data;
    bitbuffer_t mc = {0};

    if (bitbuffer->num_rows != 1)
        return 0;

    //check correct data length
    if (bitbuffer->bits_per_row[0] != 104) // 104 raw half-bits, 52 bits payload
        return 0;

    //check for correct preamble (0x55666a)
    if ((bitbuffer->bb[0][0] != 0x55 ) || bitbuffer->bb[0][1] != 0x66 || bitbuffer->bb[0][2] != 0x6a)
        return 0; // preamble missing
*/

r_device maverick_et73x = {
    .name           = "Maverick ET-732/733 BBQ Sensor",
    .modulation     = OOK_PULSE_MANCHESTER_ZEROBIT,
    .short_width    = 230,
    .long_width     = 0, //not used
    .reset_limit    = 4000,
    //.reset_limit    = 6000, // if pulse_demod_manchester_zerobit implements gap_limit
    //.gap_limit      = 1000, // if pulse_demod_manchester_zerobit implements gap_limit
    .decode_fn      = &maverick_et73x_callback,
    .disabled       = 0,
    .fields         = output_fields
};


r_device oregon_scientific = {
        .name        = "Oregon Scientific Weather Sensor",
        .modulation  = OOK_PULSE_MANCHESTER_ZEROBIT,
        .short_width = 440, // Nominal 1024Hz (488µs), but pulses are shorter than pauses
        .long_width  = 0,   // not used
        .reset_limit = 2400,
        .decode_fn   = &oregon_scientific_decode,
        .disabled    = 0,
        .fields      = output_fields,
};
/** @file
    Various Oregon Scientific protocols.

    Copyright (C) 2015 Helge Weissig, Denis Bodor, Tommy Vestermark, Karl Lattimer,
    deennoo, pclov3r, onlinux, Pasquale Fiorillo.

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/
/** @file
    Schrader TPMS protocol.

    Copyright (C) 2016 Benjamin Larsson
    and 2017 Christian W. Zuckschwerdt <zany@triq.net>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
*/

/**
Schrader TPMS decoder.

Packet payload: 1 sync nibble and 8 bytes data, 17 nibbles:

    0 12 34 56 78 9A BC DE F0
    7 f6 70 3a 38 b2 00 49 49
    S PF FI II II II PP TT CC

- S: sync
- P: preamble (0xf)
- F: flags
- I: id (28 bit)
- P: pressure from 0 bar to 6.375 bar, resolution of 25 mbar/hectopascal per bit
- T: temperature from -50 C to 205 C (1 bit = 1 temperature count 1 C)
- C: CRC8 from nibble 1 to E
    /* Reject wrong amount of bits * /
    if (bitbuffer->bits_per_row[0] != 68)
        return 0;
*/
r_device schraeder = {
        .name        = "Schrader TPMS",
        .modulation  = OOK_PULSE_MANCHESTER_ZEROBIT,
        .short_width = 120,
        .long_width  = 0,
        .reset_limit = 480,
        .decode_fn   = &schraeder_callback,
        .disabled    = 0,
        .fields      = output_fields,
};
/**
TPMS Model: Schrader Electronics EG53MA4.
Contributed by: Leonardo Hamada (hkazu).

Also Schrader PA66-GF35 (OPEL OEM 13348393) TPMS Sensor.

Probable packet payload:

    SSSSSSSSSS ???????? IIIIII TT PP CC

- S: sync
- ?: might contain the preamble, status and battery flags
- I: id (24 bits), could extend into flag bits (?)
- P: pressure, 25 mbar per bit
- T: temperature, degrees Fahrenheit
- C: checksum, sum of byte data modulo 256
* /
static int schrader_EG53MA4_callback(r_device *decoder, bitbuffer_t *bitbuffer) {
    data_t *data;
    uint8_t b[10];
    int serial_id;
    char id_str[9];
    unsigned flags;
    char flags_str[9];
    int pressure;    // mbar
    int temperature; // degree Fahrenheit
    int checksum;

    /* Check for incorrect number of bits received * /
    if (bitbuffer->bits_per_row[0] != 120)
*/
r_device schrader_EG53MA4 = {
        .name        = "Schrader TPMS EG53MA4, PA66GF35",
        .modulation  = OOK_PULSE_MANCHESTER_ZEROBIT,
        .short_width = 123,
        .long_width  = 0,
        .reset_limit = 300,
        .decode_fn   = &schrader_EG53MA4_callback,
        .disabled    = 0,
        .fields      = output_fields_EG53MA4,
};
/*
 * Emos TTX201 Thermo Remote Sensor
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * Manufacturer: Ewig Industries Macao
 * Maybe same as Ewig TTX201M (FCC ID: N9ZTTX201M)
 *
 * Transmit Interval: every ~61 s
 * Frequency: 433.92 MHz
 * Manchester Encoding, pulse width: 500 us, interpacket gap width 1500 us.
 *
 * A complete message is 445 bits:
 *      PPPPPPPP PPPPPPPP P
 *   LL LLKKKKKK IIIIIIII S???BCCC ?XXXTTTT TTTTTTTT MMMMMMMM JJJJ  (repeated 7 times)
 *   LL LLKKKKKK IIIIIIII S???BCCC ?XXXTTTT TTTTTTTT MMMMMMMM       (last packet without J)
 *
 * 17-bit initial preamble, always 0
 *   PPPPPPPP PPPPPPPP P = 0x00 0x00 0
 *
 * 54-bit data packet format
 *   0    1   2    3   4    5   6    7   8    9   10   11  12   13  (nibbles #, aligned to 8-bit values)
 *   ..LL LLKKKKKK IIIIIIII S???BCCC ?XXXTTTT TTTTTTTT MMMMMMMM JJJJ
 *
 *   L = 4-bit start of packet, always 0
 *   K = 6-bit checksum, sum of nibbles 3-12
 *   I = 8-bit sensor ID
 *   S = startup (0 = normal operation, 1 = reset or battery changed)
 *   ? = unknown, always 0
 *   B = battery status (0 = OK, 1 = low)
 *   C = 3-bit channel, 0-4
 *   X = 3-bit packet index, 0-7
 *   T = 12-bit signed temperature * 10 in Celsius
 *   M = 8-bit postmark, always 0x14
 *   J = 4-bit packet separator, always 0xF
 *
 * Sample received raw data package:
 *   bitbuffer:: Number of rows: 10
 *   [00] {17} 00 00 00             : 00000000 00000000 0
 *   [01] {54} 07 30 80 00 42 05 3c
 *   [02] {54} 07 70 80 04 42 05 3c
 *   [03] {54} 07 b0 80 08 42 05 3c
 *   [04] {54} 07 f0 80 0c 42 05 3c
 *   [05] {54} 08 30 80 10 42 05 3c
 *   [06] {54} 08 70 80 14 42 05 3c
 *   [07] {54} 08 b0 80 18 42 05 3c
 *   [08] {50} 08 f0 80 1c 42 05 00 : 00001000 11110000 10000000 00011100 01000010 00000101 00
 *   [09] { 1} 00                   : 0
 *
 * Data decoded:
 *   r  cs    K   ID    S   B  C  X    T    M     J
 *   1  28    28  194  0x0  0  0  0   264  0x14  0xf
 *   2  29    29  194  0x0  0  0  1   264  0x14  0xf
 *   3  30    30  194  0x0  0  0  2   264  0x14  0xf
 *   4  31    31  194  0x0  0  0  3   264  0x14  0xf
 *   5  32    32  194  0x0  0  0  4   264  0x14  0xf
 *   6  33    33  194  0x0  0  0  5   264  0x14  0xf
 *   7  34    34  194  0x0  0  0  6   264  0x14  0xf
 *   8  35    35  194  0x0  0  0  7   264  0x14
 *

#include "decoder.h"

#define MSG_PREAMBLE_BITS    17
#define MSG_PACKET_MIN_BITS  50
#define MSG_PACKET_BITS      54
#define MSG_PACKET_POSTMARK  0x14
#define MSG_MIN_ROWS         2
#define MSG_MAX_ROWS         10

#define MSG_PAD_BITS         ((((MSG_PACKET_BITS / 8) + 1) * 8) - MSG_PACKET_BITS)
#define MSG_PACKET_LEN       ((MSG_PACKET_BITS + MSG_PAD_BITS) / 8)
*/
r_device ttx201 = {
    .name          = "Emos TTX201 Temperature Sensor",
    .modulation    = OOK_PULSE_MANCHESTER_ZEROBIT,
    .short_width   = 510,
    .long_width    = 0, // not used
    .reset_limit   = 1700,
    .tolerance     = 250,
    .decode_fn     = &ttx201_callback,
    .disabled      = 0,
    .fields        = output_fields
};

