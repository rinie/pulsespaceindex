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
