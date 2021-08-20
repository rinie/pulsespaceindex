# pulsespaceindex
PulseSpaceIndex node.js ES6 for analyzing OOK 433 and RF signals

Previously pulsespaceindex.h used in Arduino projects (Nodo/Embapps/he853 remote).
Now using Broadlink RM or Sonoff RF Bridge 433 move this to NodeJS
Also include samples from LIRC/RfLink/PiMatic and PiLight

Basic is an array of microsecond pulses of OOK signals
Either indexed (pulsespaceindex.h or pimatic) or not

set DEBUG=*
set DEBUG_DEPTH=3

http://tech.jolowe.se/home-automation-rf-protocols/

Kaku/Proove/Anslut/Nexa:
1: T, T
0: T, 5T
SYNC: T, 10T
Pause: T, 40T
T: 250 us

Packetformat
Every packet consists of a sync bit followed by 26 + 2 + 4 (total 32 logical data part bits) and is ended by a pause bit.

S HHHH HHHH HHHH HHHH HHHH HHHH HHGO CCEE P

S = Sync bit.
H = The first 26 bits are transmitter unique codes, and it is this code that the reciever "learns" to recognize.
G = Group code. Set to 0 for on, 1 for off.
O = On/Off bit. Set to 0 for on, 1 for off.
C = Channel bits. Proove/Anslut = 00, Nexa = 11.
E = Unit bits. Device to be turned on or off.
Proove/Anslut Unit #1 = 00, #2 = 01, #3 = 10.
Nexa Unit #1 = 11, #2 = 10, #3 = 01.
P = Pause bit.

For every button press, N identical packets are sent. For Proove/Anslut N is six, and for Nexa it is five.

RKR: Reverse 1/0 def?
Yes: 1 for on, 0 for off

ev1527 T T, 31T
H 3T, T
L T, 3T

20 ID
4 DATA

2021-08-20 Receive same NewKaku with Broadlink RM, RF Link and Tasmota Sonoff RF Brdige with Portisch firmware
psiv {
  signalType: 'ook433',
  comment: 'newkaku',
  frameCount: 1,
  count: 900,
  ticks: [ 10, 43, 85, 303, 1500 ],
  counts: [ 658, 215, 6, 6, 1 ],
  micros: [ 305, 1310, 2589, 9227, 45680 ],
  psi: '0001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000104'
}
psiv ps01fCounts [ 0, 0, 0, 1, 4, 2 ] [ 443, 215, 0, 215, 0, 13 ]
psiv FrameSplit 94 0 94 0 0 1
psiv FrameSplit 226 94 132 0 1 2
psiv FrameSplit 358 226 132 0 2 3
psiv FrameSplit 490 358 132 0 3 4
psiv FrameSplit 622 490 132 0 4 5
psiv FrameSplit 754 622 132 0 5 6
psiv frameSplits 886 132 754 6 0 0 6 7
psi ps01f 000102 0001 886
psiv psix 000102 {
  sx: '000102:',
  hexMode: false,
  constantMode: false,
  data0: [ '0', '0' ],
  data1: [ '0', '1' ],
  dataType: 's',
  start: 0,
  end: 886
}
psiv s datax 5656666a655-01 trailer 03 46 0 94 0101011001010110011001100110101001100101010101
psiv s header 02 datax 6aa99595999a9955 trailer 03 64 94 226 0110101010101001100101011001010110011001100110101001100101010101
psiv s header 02 datax 6aa99595999a9955 trailer 03 64 226 358 0110101010101001100101011001010110011001100110101001100101010101
psiv s header 02 datax 6aa99595999a9955 trailer 03 64 358 490 0110101010101001100101011001010110011001100110101001100101010101
psiv s header 02 datax 6aa99595999a9955 trailer 03 64 490 622 0110101010101001100101011001010110011001100110101001100101010101
psiv s header 02 datax 6aa99595999a9955 trailer 03 64 622 754 0110101010101001100101011001010110011001100110101001100101010101
psiv s header 02 datax 6aa99595999a9955 trailer 04 64 754 886 0110101010101001100101011001010110011001100110101001100101010101
psi PulseSpaceIndex {
  signalType: 'broadlink:ook433:newkaku',
  frameCount: 7,
  count: 886,
  micros: [ 305, 1310, 2589, 9227, 45680 ],
  counts: [
    { i: 0, t: 305, ct: [ 443, 215, 658 ], p: 0, s: 0 },
    { i: 1, t: 1310, ct: [ 0, 215, 215 ], s: 1 },
    { i: 2, t: 2589, ct: [ 0, 6, 6 ], dx: [ 0, 129, 129 ] },
    { i: 3, t: 9227, ct: [ 0, 6, 6 ], dx: [ 0, 131, 131 ] },
    { i: 4, t: 45680, ct: [ 0, 1, 1 ], dx: [ 0, 885, 885 ] }
  ],
  ps01f: '000102',
  psx: '000102:x5656666a655-010302x6aa99595999a9955-0302x6aa99595999a9955-0302x6aa99595999a9955-0302x6aa99595999a9955-0302x6aa99595999a9955-0302x6aa99595999a9955-04',
  psi: '0001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000104',
  pi: '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  si: '01010110010101100110011001101010011001010101013201101010101010011001010110010101100110011001101010011001010101013201101010101010011001010110010101100110011001101010011001010101013201101010101010011001010110010101100110011001101010011001010101013201101010101010011001010110010101100110011001101010011001010101013201101010101010011001010110010101100110011001101010011001010101013201101010101010011001010110010101100110011001101010011001010101014'
}

psiv Rflink Domoticzlog  2020-01-28 11:11:31.230 RFLink: 20;E4;NewKaku;ID=00d0904a;SWITCH=3;CMD=ON;
psiv Rflink Domoticzlog  2020-01-28 11:11:31.233 (RFLink) Light/Switch (Unknown)
psim microsToPsi  rflink:2020-01-28 14:50:31.239 RFLink: 20;E0;DEBUG;Pulses=132;Pulses(uSec)=30,2700,120,210,120,1200,120,1200,120,210,120,1200,120,210,120,1200,120,210,120,1200,120,210,120,1200,120,210,120,1200,120,210,120,210,120,1230,120,1200,120,210,120,210,120,1200,120,210,120,1200,120,210,120,1200,120,1200,120,210,120,210,120,1200,90,210,120,1200,120,210,120,1230,120,1200,120,210,90,210,120,1200,90,1200,120,210,120,180,120,1200,120,1200,120,210,120,180,120,1200,120,1200,120,210,120,1200,120,210,120,1200,120,210,120,180,120,1200,120,1200,120,210,120,180,120,1200,120,180,120,1200,120,180,120,1200,120,210,120,1230,120,210,120,1200,120,6990;
psiv ps01fCounts [ 0, 0, 0, 1, 3, 2 ] [ 66, 32, 0, 32, 0, 2 ]
psiv frameSplits 132 16 0 0 0 0 1 1
psi ps01f 000102 0001 132
psiv psix 000102 {
  sx: '000102:',
  hexMode: false,
  constantMode: false,
  data0: [ '0', '0' ],
  data1: [ '0', '1' ],
  dataType: 's',
  start: 0,
  end: 132
}
psiv s header 02 datax 6aa99595999a9955 trailer 03 64 0 132 0110101010101001100101011001010110011001100110101001100101010101
psi PulseSpaceIndex {
  signalType: 'rflink:29',
  frameCount: 1,
  count: 132,
  micros: [ 145, 1203, 2700, 6990 ],
  counts: [
    { i: 0, t: 145, ct: [ 66, 32, 98 ], p: 0, s: 0 },
    { i: 1, t: 1203, ct: [ 0, 32, 32 ], s: 1 },
    { i: 2, t: 2700, ct: [ 0, 1, 1 ], dx: [ 0, 129, 129 ] },
    { i: 3, t: 6990, ct: [ 0, 1, 1 ], dx: [ 0, 131, 131 ] }
  ],
  ps01f: '000102',
  psx: '000102:02x6aa99595999a9955-03',
  psi: '020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103',
  pi: '000000000000000000000000000000000000000000000000000000000000000000',
  si: '201101010101010011001010110010101100110011001101010011001010101013'
}

psim microsToPsi  [
  'AA B1 04 012C 09CE 04C4 23BE 010002020002000200020002000200000202000002000200020200000200020002020000020200000202000002020002000200000202000002000200020002000203 55',
  index: 74,
  input: '20:49:32.267 RSL: RESULT = {"Time":"2021-08-19T20:49:32","RfRaw":{"Data":"AA B1 04 012C 09CE 04C4 23BE 010002020002000200020002000200000202000002000200020200000200020002020000020200000202000002020002000200000202000002000200020002000203 55"}}',
  groups: undefined
]
psiv ps01fCounts [ 0, 0, 0, 1, 3, 2 ] [ 66, 32, 0, 32, 0, 2 ]
psiv frameSplits 132 16 0 0 0 0 1 1
psi ps01f 000102 0001 132
psiv psix 000102 {
  sx: '000102:',
  hexMode: false,
  constantMode: false,
  data0: [ '0', '0' ],
  data1: [ '0', '1' ],
  dataType: 's',
  start: 0,
  end: 132
}
psiv s header 02 datax 6aa99595999a9955 trailer 03 64 0 132 0110101010101001100101011001010110011001100110101001100101010101
psi PulseSpaceIndex {
  signalType: 'Portisch Sorted',
  frameCount: 1,
  count: 132,
  micros: [ 300, 1220, 2510, 9150 ],
  counts: [
    { i: 0, t: 300, ct: [ 66, 32, 98 ], p: 0, s: 0 },
    { i: 1, t: 1220, ct: [ 0, 32, 32 ], s: 1 },
    { i: 2, t: 2510, ct: [ 0, 1, 1 ], dx: [ 0, 129, 129 ] },
    { i: 3, t: 9150, ct: [ 0, 1, 1 ], dx: [ 0, 131, 131 ] }
  ],
  ps01f: '000102',
  psx: '000102:02x6aa99595999a9955-03',
  psi: '020001010001000100010001000100000101000001000100010100000100010001010000010100000101000001010001000100000101000001000100010001000103',
  pi: '000000000000000000000000000000000000000000000000000000000000000000',
  si: '201101010101010011001010110010101100110011001101010011001010101013'
}

Old comments...

pimatic sorted buckets en dan kijken of je buiten header/footer 0/1 codering kunt gebruiken.
Nodo: eerste/laatste 2 kunnen verminkt zijn.
Rest moet 'tov einde' matchen
Laatste footer is timeout...

Manchester is nodig. PDM kan je ook direct.
Repeat
T
Pulses

(Bit)Mapping
Encode/Decode

... signal preamble/sync data footer en dan repeat

0 timings
1 PSI
2 optional decode
5 map

lowlevel:
- Lirc
- AnalysIR
- pimatic
- pilight
- broadlink
- Sonoff basic
- Sonoff hacked
- he853

- RF link?
- RC switch?

PSI 
PSIX

PSIH
PSID


var OokTimings = [
{
	ProtocolName: 'AnBan',
	BaseTime: 320, //  T
	Sync: [1, 15], // High/Low
	Trail: [0, 0],
	Data: [[1, 3], [3, 1]],
	WireBitCount: 28,
	FrameCount: 7
},
{
	ProtocolName: 'UK',
	BaseTime: 1, // no T
	Sync: [320, 9700], // https://wiki.pilight.org/doku.php/elro_he_switch_v7_0 1, 31 aka 9920
	Trail: [0, 0],
	Data: [[320, 960], [960, 320]], // [[1,3],[3,1]],
	WireBitCount: 24,
	FrameCount: 18
},
{
	ProtocolName: 'GER',
	BaseTime: 1, // no T
	Sync: [260, 8600], // https://wiki.pilight.org/doku.php/elro_ad_v7_0 302/1208/10268 or 1, 4, 34
	Trail: [0, 0],
	Data: [[260, 260], [260, 1300]], // [[1,1],[1,5]],
	WireBitCount: 57,
	FrameCount: 7
},
{
	ProtocolName: 'KAKU',
	BaseTime: 350, // Base Time us
	Sync: [0, 0],
	Trail: [1, 32],
	Data: [[1, 3], [3, 1], [1, 1]], // 0, 1, Short or F he853 cannot handle 2
	WireBitCount: 24, // Unit 0..5 inversed, ID 6..10 inversed, Fixed 11, always 0, OnOf 12 inversed (Inversed or 0/1 wrong?)
	FrameCount: 7,
/*
  ms: [ 396, 1127, 11085, [length]: 3 ],
  psi: '01 01 01 10 01 01 01 01 01 01 01 10 01 01 01 01 01 01 01 10 01 10 01 01 02' }
  00 01 00 00 00 01 00 00 00 01 01 00
  010101100101010101010110010101010101011001100101 02
  000100000001000000010100
  010001000110

  01000 10001 10
*/
	// protocol info, not direct timing
	BitEncoding: ['00', '01', '02'],
},
{
	ProtocolName: 'KAKUNEW',
	BaseTime: 275, // Base Time us
	Sync: [1, 8],
	Trail: [1, 32],
	Data: [[1, 1], [1, 4]], // 0 = 01, 1=10, Dim = 00 2/F/_
	WireBitCount: 64, //+4*2 for dim. 32 net bits: ID 0..25, All: 26, OnOff: 27, Unit 28..31
	FrameCount: 18,

	// protocol info, not direct timing
	BitEncoding: ['01', '10', '00'],
} ,
{
	ProtocolName: 'X10',
	BaseTime: 560, // Base Time us
	Sync: [16, 8],
	Trail: [1, 72],
	Data: [[1, 1], [1, 2]],
	WireBitCount: 32,
	FrameCount: 7
} //,
];
