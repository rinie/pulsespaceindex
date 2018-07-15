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
