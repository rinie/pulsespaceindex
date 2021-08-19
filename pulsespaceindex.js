/* eslint-disable no-plusplus */
/* eslint-disable no-bitwise */
// set DEBUG=*
//     pulseSpace.sort((a,b) => a.ps - b.ps);
// use header/footer pulse space conventions of lirc/pilight and nodo/rflink
// use basic observation from bye bye stand by protocol:
// send 3 times, receive 2 times identical packages: repetition is a feature.
// OOK On Off Keying: Pulse is signal, Space is no signal...
const debug = require('debug')('psi');
const debugv = require('debug')('psiv');

const debugm = require('debug')('psim');
const readline = require('readline');
const fs = require('fs');

const psixPulse = 0;
const psixSpace = 1;
const psixPulseSpace = 2; // fix with ES6 enums but...
const psixLength = 3; // enable for ... < psixLength; ++ loops
const ps01f0 = 0;
const ps01f1 = 2;
const ps01fFrameHT = 4;
const ps01fLength = 6; // enable for ... < ps01fLength; += psixPulseSpace loops

class PulseSpaceIndex {
  constructor(psi, micros = null, frameCount = 1, signalType = 'ook433') {
    this.signalType = signalType;
    this.frameCount = frameCount;
    this.count = (psi !== null) ? psi.length : null;
    this.micros = micros;
    this.counts = null; // filled by analyse
    this.ps01f = '000000'; // filled by detectPS01Values: minimal ps is p01s01, s is p0s01 or p00s01... s12 is p0s12...
    this.psx = null;
    this.psi = psi; // Pulse Space Index
    this.pi = null; // Pulse Index
    this.si = null; // Space Index
  }

  countPulseSpace() {
    const { psi } = this;
    let pi = '';
    let si = '';
    const counts = [];
    if (this.micros !== null) {
      for (let i = 0; i < this.micros.length; i++) {
        counts[i] = { i, t: this.micros[i], ct: [0, 0, 0] };
      }
    } else {
      for (let i = 0; i < psi.length - 1; i++) {
        const psii = parseInt(psi[i], 16);
        if (typeof counts[psii] === 'undefined') {
          counts[psii] = { i: psii, t: null, ct: [0, 0, 0] }; // i: pssii or psi[i]?
        }
      }
      // fill blanks
      for (let i = 0; i < counts.length; i++) {
        if (typeof counts[i] === 'undefined') {
          counts[i] = { i, t: null, ct: [0, 0, 0] };
        }
      }
    }
    for (let i = 0; i < psi.length - 1; i += 2) {
      // pulse 0,2,4...
      const psii = parseInt(psi[i], 16);
      pi += psi[i];
      if (typeof counts[psii] === 'undefined') {
        counts[psii] = { i: psii, t: null, ct: [1, 0, 1] }; // i: pssii or psi[i]?
      } else {
        counts[psii].ct[psixPulse] += 1;
        counts[psii].ct[psixPulseSpace] += 1;
      }

      // space 1,3,5,...
      const sii = parseInt(psi[i + 1], 16);
      si += psi[i + 1];
      if (typeof counts[sii] === 'undefined') {
        counts[sii] = { i: sii, t: null, ct: [0, 1, 1] };
      } else {
        counts[sii].ct[psixSpace] += 1;
        counts[sii].ct[psixPulseSpace] += 1;
      }
    }

    if (psi.length & 1) { // odd so process last pulse
      const i = psi.length - 1;
      const psii = parseInt(psi[i], 16);
      pi += psi[i];
      if (typeof counts[psii] === 'undefined') {
        counts[psii] = { i: psii, t: null, ct: [1, 0, 1] };
      } else {
        counts[psii].ct[psixPulse] += 1;
        counts[psii].ct[psixPulseSpace] += 1;
      }
    }
    this.counts = counts;
    this.pi = pi;
    this.si = si;
  }

  // detect dominating pulse and space values
  // distinct from Header Sync / Trailer space or preamble
  // denoted as data pulse 0, data pulse 1, data space 0 and data space 1
  // todo: PPM/PDM is single P, only (data) spaces have 2 values
  //
  // 2020 resolution:
  //  At least 2 data values (0101) but maybe 3 or 4
  //  Depending on the FrameCount data 1 may be a header or trailer value
  //  Assume optional partial start frame, 1 or more full frames, optional partial end frame...
  //  First pulse of a frame is often longer and last space of a frame is (always) longer.
  //  Use this to determine framelength Header/Data/Trailer with maximum one strange Pulse/Space inside the data
  //  So use the length between the 'non data pulses/spaces' as an indication of framecount and data versus header/trailer.
  //
  detectPS01Values() {
    const { psi } = this;
    const { counts } = this;
    // now check dominating pulse and space counts
    // max counts pulse and space counts
    const maxDomCounts = 2;
    // convert to string '01'...
    // ps01f 0011
    const ps01f = [0, 0, 0, 0, counts.length-1, counts.length-1];
    const ps01fCounts = [0, 0, 0, 0, 0, 0]; // accumulated counts <= 0, <= 1, >= ps01fFrameHT
    const min01ValuesCount = 1; // max one start/one stop sync? was 3

    // 2020: 0 value is ok but 1 value may be header/trailer
    // take 2 values with highest count
    // max distance will determine if 1 is data or not
    const maxI = counts.length;
    for (let i = 1; i < maxI; i++) {
      // if (i > 1 && this.count > 32) {
      //  min01ValuesCount = Math.round(this.count/32); // todo max this % of packages length
      // }
      for (let psix = 0; psix < psixPulseSpace; psix++) {
        if (typeof counts[i] === 'undefined') {
          debugv('Add counts[i]', i, maxI);
          counts[i] = { i: i, t: null, ct: [0, 0, 0] }; // i.. shift gaps?
        }
        const ct = counts[i].ct[psix];
        if (ct > min01ValuesCount) {
          const ct0 = counts[ps01f[ps01f0 + psix]].ct[psix];
          const ct1 = counts[ps01f[ps01f1 + psix]].ct[psix];
          // debugv(ps01f, psix, ct, ct0, ct1, i, psix+2);
          if (ct > ct1 || ct > ct0 || ps01f[ps01f0 + psix] === ps01f[ps01f1 + psix]) {
            ps01f[ps01f0 + psix] = ps01f[ps01f1 + psix];
            ps01f[ps01f1 + psix] = i;
          }
        }
      }
    }

    // check 0 values
    if (counts[ps01f[ps01f0 + psixPulse]].ct[psixPulse] === 0) {
      ps01f[ps01f0 + psixPulse] = ps01f[ps01f1 + psixPulse];
    }
    if (counts[ps01f[ps01f0 + psixSpace]].ct[psixSpace] === 0) {
      ps01f[ps01f0 + psixSpace] = ps01f[ps01f1 + psixSpace];
    }
    // ranges Always: ..0, Often ..1, Seldom: midSync (HeaderTrailer) , Trailer always (but discarded by may programs), Header often header/Trailer pulse/space
    // complicated by 'first incomplete/last incomplete...'
    // extend ps01f with ht as first header/trailer index
    // Use this to determine split values 0, 1, HT. Gap between 1 and HT may be midsync. 0=1 no diff...
    // so 0<=Max0 <=Max01 < MinHT<=counts.length, HT becomes F for frame Header/Trailer or separator..
    // Start with maxPulse and space >= maxPulse...
    const minFrameLength = 16;
    const maxps01fFrameHTCount = Math.round(this.psi.length / minFrameLength);
    for (let i = counts.length - 1; i > ps01f[ps01f0 + psixPulse]; --i) {
      if ((i > ps01f[ps01f0 + psixSpace]) && (counts[i].ct[psixSpace] > 0) && (counts[i].ct[psixSpace] <= maxps01fFrameHTCount)) {
        ps01f[ps01fFrameHT + psixSpace] = i;
      }
      if (counts[i].ct[psixPulse] > 0) {
        if ((counts[i].ct[psixPulse] <= maxps01fFrameHTCount)) {
          ps01f[ps01fFrameHT + psixPulse] = i;
        }
        if ((ps01f[ps01fFrameHT + psixSpace] === 0)
          && (counts[i].ct[psixSpace] <= maxps01fFrameHTCount)) {
          ps01f[ps01fFrameHT + psixSpace] = i;
        }
        break;
      }
    }
    // ps01fFrameHT currently stops on largest pulse. Misses bl 2680/2802 example spike/merge...
    // or fix this in first pulse after trailerSpace detection...
    // like headerSpace detection...

    // determine ps01fCounts...
    for (let i = 0; i < counts.length; i++) {
        // 0/1: accumulate from lowest
        for (let psix = 0; psix < psixPulseSpace; psix++) {
          if (i <= ps01f[ps01f0 + psix]) {
            ps01fCounts[ps01f0 + psix] += counts[i].ct[psix];
          }
          else if (i <= ps01f[ps01f1 + psix]) {
            ps01fCounts[ps01f1 + psix] += counts[i].ct[psix];
          }
          // HT accumulate to max ps01f1 and ps01fFrameHT may overlap for now
          if (i >= ps01f[ps01fFrameHT + psix]) {
            ps01fCounts[ps01fFrameHT + psix] += counts[i].ct[psix];
          }
       }
    }
    debugv('ps01fCounts', ps01f, ps01fCounts);
    // ps01fFrameHT now has potential Header pulse and Trailer Space
    // examine signal from start to finish
    // Stop on Header pulse and Trailer Space
    // Trailer Space: Next header pulse or header space?
    // Header pulse: next header space?
// todo
// frameSplit: none: no multiple frames
// first split then check Trailer Space, Header Pulse, Header Space.. (position and occurences)...
// rflink looses long Trailer spaces...
    let headerPulseCount = 0;
    let headerSpaceCount = 0;
    let headerSpaceIndex = ps01f[ps01fFrameHT + psixSpace];
    let trailerSpaceCount = 0;
    let frameStart = 0;
    let shortFrameSplits = 0;
    let frameSplits = 0;
    let frameLength = minFrameLength;
    const frameSplit = [];
    const s = this.psi;

    for (let j = 0; j < s.length; ) {
      if (j > 0) {
        debugv('FrameSplit', j, frameStart, j-frameStart, headerPulseCount, headerSpaceCount, trailerSpaceCount);
        // 3 situations: partial start frame, normal frame, Repeat frame (NEC) clear header, clear trailer 0 payload
        if ((frameStart === 0 && (trailerSpaceCount === 1))
          || ((j - frameStart) >= minFrameLength)
          || ((trailerSpaceCount >= headerPulseCount) && (headerPulseCount >= frameSplits + 1))
          ) {
          if (j - frameStart > frameLength) { // normal frame length...
            frameLength = j - frameStart;
          }
          frameStart = j;
          frameSplits++;
        }
        else { // todo NEC repeate frame 4206: Single data but clear header/trailer
              // headerPulse + headerSpace + trailerSpace overrules minFrameLength...
          shortFrameSplits++;
        }
      }
      // optional header
      if (s[j+psixPulse] >= ps01f[ps01fFrameHT + psixPulse]) {
        headerPulseCount++;
      }
      else if (s[j+psixPulse] > ps01f[ps01f1 + psixPulse]) {
        if (headerPulseCount > 0 && trailerSpaceCount > 0) {
          ps01f[ps01fFrameHT + psixPulse] = s[j+psixPulse];
          headerPulseCount++;
        }
      }
      if (s[j+psixSpace] > ps01f[ps01f1 + psixSpace]) {
        headerSpaceCount++;
        if (s[j+psixSpace] < headerSpaceIndex) {
          headerSpaceIndex = s[j+psixSpace];
        }
      }
      j += 2;
      // skip data
      while ((j < s.length - 1)
        && (s[j + psixPulse] < ps01f[ps01fFrameHT + psixPulse])
        && (s[j + psixSpace] < ps01f[ps01fFrameHT + psixSpace]))
        {
          j += 2;
        }
      // optional trailer
      if ((j < s.length - 1)
        //&& (s[j + psixPulse] < ps01f[ps01fFrameHT + psixPulse])
        && (s[j + psixSpace] >= ps01f[ps01fFrameHT + psixSpace])) {
          trailerSpaceCount++;
          j += 2;
        }
    }
    debugv('frameSplits', s.length, frameLength, frameStart, frameSplits, shortFrameSplits, headerPulseCount, headerSpaceCount, trailerSpaceCount);
   // if (frameLength > minFrameLength) {
   //   this.frameCount = Math.round(this.psi.length / frameLength);
   // }
   // else {
      this.frameCount = frameSplits + 1;
   // }

    // Header (optional): pulse and/or space
    // Trailer (no signal) pulse only.
    //  Repeated frame: Trailer followed by Header if any.
    // So HT is used to find frame boundaries TsHpHs...
    // Trailer Space >= Header Pulse
    // Header Space ?
    // Header first or space before header is trailer
    // Trailer: last or incomplete package?
    // frames or slices?
    // max distance

    // get some feeling for distances between FrameHT... counts.length
    let i = ((ps01f[ps01fFrameHT + psixPulse] <= ps01f[ps01fFrameHT + psixSpace])
      ? ps01f[ps01fFrameHT + psixPulse]
      : ps01f[ps01fFrameHT + psixSpace]);

    for (; i < counts.length; i++) {
      const maxDx = [0, 0, 0];
      const s = this.psi;
      for (let j = 0; j < s.length; j++) {
        const dx = [0, 0, 0];
        for (;s[j] < i; j++) {
          if ((!(j & 1)) && (counts[i].ct[psixPulse] > 0)) {
            dx[psixPulse]++;
          } else if (counts[i].ct[psixSpace] > 0) {
            dx[psixSpace]++;
          }
          dx[psixPulseSpace]++;
        }
        for (let psix = 0; psix < psixLength; psix++) {
          if (dx[psix] > maxDx[psix]) {
            maxDx[psix] = dx[psix];
          }
        }
      }
      counts[i].dx = maxDx;
    }

    // pulse [0] and [2]
    counts[ps01f[ps01f0 + psixPulse]].p = 0;
    if (ps01f[ps01f1 + psixPulse] !== ps01f[ps01f0 + psixPulse]) {
      if (ps01fCounts[ps01f1 + psixPulse] > frameSplits + 1) {
        counts[ps01f[ps01f1 + psixPulse]].p = 1;
      }
      else {
        ps01f[ps01f1 + psixPulse] = ps01f[ps01f0 + psixPulse];
      }
    }

    if (headerPulseCount === 0) {
      ps01f[ps01fFrameHT + psixPulse] = 0; // no header pulse
    }

    if (headerSpaceCount === 0 && trailerSpaceCount === 0) {
      ps01f[ps01fFrameHT + psixPulse] = 0; // no trailerSpace recorded
    }
    else {
      ps01f[ps01fFrameHT + psixSpace] = headerSpaceIndex;
    }

    // space [1] and [3]
    counts[ps01f[ps01f0 + psixSpace]].s = 0;
    if (ps01f[ps01f1 + psixSpace] !== ps01f[ps01f0 + psixSpace]) {
      if (ps01fCounts[ps01f1 + psixSpace] > frameSplits + 1) {
        counts[ps01f[ps01f1 + psixSpace]].s = 1;
      }
      else {
        ps01f[ps01f1 + psixSpace] = ps01f[ps01f0 + psixSpace];
      }
    }
    this.counts = counts;
    this.ps01f = ps01f.join('');
  }

  print() { // uniform output format
    // console.log('tja', this);
    const sep = ';';
    const newOutputFormat = true;
    if (newOutputFormat) {
      if (this.micros !== null) {
        console.log(this.count.toString(), this.micros.toString(), `'${this.psx}'`, (this.signalType).toString().replace(/ /g, '_'));
      } else {
        console.log(this.count.toString(), `'${this.psx}'`, (this.signalType).toString().replace(/ /g, '_'));
      }
    } else if (this.micros !== null) {
      console.log(this.count.toString(), sep, this.micros.length, sep, ...this.micros, sep, `'${this.psi}'`, sep, (this.signalType).toString().replace(/ /g, '_'));
    } else {
      console.log(this.count.toString(), sep, `'${this.psi}'`, sep, (this.signalType).toString().replace(/ /g, '_'));
    }
  }

  sxAdd(sx, data, constantMode = false, hexMode = false) {
    if (sx.constantMode !== constantMode) {
      sx.sx += (constantMode) ? 'c0' : 'c-';
      sx.constantMode = constantMode;
      sx.hexMode = false;
    }
    if (sx.hexMode !== hexMode) {
      sx.sx += (hexMode) ? 'x' : '-';
      sx.hexMode = hexMode;
    }
    sx.sx += data;
  }

  /*
   * Compact l10t
   * x 4 0/1 bits to one hex digit
   * todo: Pulse Distance modulation: all pulses are 0 c0...
   * todo: Kaku Old: c01, 0 01, 1, 10, 2/F 00
   * todo: Manchester/Biphase
   * todo: Header/header data Trailer/Pause. Longer signal or repeated 1s
   */
  psix(s, ps01f) {
    const dataType = ((ps01f[0] != ps01f[2]) ? 'p' : '') + ((ps01f[1] != ps01f[3]) ? 's' : '');
    const sx = {
      sx: `${ps01f}:`,
      hexMode: false,
      constantMode: false,
      data0: [ps01f[0], ps01f[1]],
      data1: [ps01f[2], ps01f[3]],
      dataType,
      start: 0,
      end: s.length,
    };

    // ps both s + previous, p + next
    // data both 01 (and) , header/trailer at least one > 1
    // alternate > 1 sections with <= 1 sections,
    // <=1 sections always start with pulse, end with space...
    let i = sx.start;
    let j = i;
    const len = sx.end;
    debugv('psix', ps01f, sx);
    while (i < len) {
      const iLast = i;
      let header = ''; // pulse or pulse space
      let data = '';
      let datax = '';
      let trailer = ''; // space
      // header optional > 1 section
      while ((j < len - 1) && ((s[j] > sx.data1[psixPulse]) || (s[j + 1] > sx.data1[psixSpace]))) {
        header += s[j++]; // pulse
        header += s[j++]; // space
      }
      if (j > i) {
        // debugv('header', header, i, j);
        this.sxAdd(sx, header);
        i = j;
      }

      // data <= 1 section
      let dataNibble = '';
      while ((j < len - 1) && ((s[j] <= sx.data1[psixPulse]) && (s[j + 1] <= sx.data1[psixSpace]))) {
        if (dataType === 'ps') {
          dataNibble += (s[j + 0] === sx.data0[psixPulse]) ? '0' : '1';
          dataNibble += (s[j + 1] === sx.data0[psixSpace]) ? '0' : '1';
        } else if (dataType === 'p') {
          dataNibble += (s[j + 0] === sx.data0[psixPulse]) ? '0' : '1';
        } else { // 's'
          dataNibble += (s[j + 1] === sx.data0[psixSpace]) ? '0' : '1';
        }
        // debugv('dataNibble', dataNibble, j);
        if (dataNibble.length >= 4) {
          data += dataNibble;
          datax += parseInt(dataNibble, 2).toString(16);
          this.sxAdd(sx, parseInt(dataNibble, 2).toString(16), false, true);
          dataNibble = '';
        }
        j += 2;
      }
      if (dataNibble.length > 0) {
        data += dataNibble;
        datax += `-${dataNibble}`;
        this.sxAdd(sx, dataNibble);
      }
      i = j;
      // Trailer optional > 1 Space
      if ((j < len - 1) && ((s[j] <= sx.data1[psixPulse]) && (s[j + 1] > sx.data1[psixSpace]))) {
        trailer += s[j++];
        trailer += s[j++];
        this.sxAdd(sx, trailer);
        if (header.length > 0) {
          debugv(dataType, 'header', header, 'datax', datax, 'trailer', trailer, data.length, iLast, j, data);
        } else {
          debugv(dataType, 'datax', datax, 'trailer', trailer, data.length, iLast, j, data);
        }
      } else if (header.length > 0) {
        debugv(dataType, 'header', header, 'datax', datax, data.length, iLast, j, data);
      } else {
        debugv(dataType, 'datax', datax, data.length, iLast, j, data);
      }
      i = j;
      if (i <= iLast) {
        i = iLast + 2;
      }
      j = i;
    }
    return sx.sx;
  }

  tryManchester(s, ps01f) {
    const dataType = ((ps01f[0] != ps01f[2]) ? 'p' : '') + ((ps01f[1] != ps01f[3]) ? 's' : '');
    const sx = {
      sx: `${ps01f}:`,
      hexMode: false,
      constantMode: false,
      data0: [ps01f[0], ps01f[1]],
      data1: [ps01f[2], ps01f[3]],
      dataType,
      start: 0,
      end: s.length,
    };

    // ps both s + previous, p + next
    // data both 01 (and) , header/trailer at least one > 1
    // alternate > 1 sections with <= 1 sections,
    // <=1 sections always start with pulse, end with space...
    let i = sx.start;
    let j = i;
    const len = sx.end;
    if (ps01f.slice(0,4) != '0011') {
      return;
    }
    debugv('tryManchester', ps01f, sx);
    while (i < len) {
      const iLast = i;
      let header = ''; // pulse or pulse space
      let data = '';
      let datax = '';
      let trailer = ''; // space
      // header optional > 1 section
      while ((j < len - 1) && ((s[j] > 1) || (s[j + 1] > 1))) {
        header += s[j++]; // pulse
        header += s[j++]; // space
      }
      if (j > i) {
        // debugv('header', header, i, j);
        this.sxAdd(sx, header);
        i = j;
      }

      let preambleLength = 0;
      while ((j < len - 1) && ((s[j] === '1'))) {
        preambleLength++;
        j++;
      }
      let curValue = '0';
      // data <= 1 section
      let dataNibble = curValue;
      while ((j < len - 1) && ((s[j] <= '1'))) {
        if (s[j] === '0') {
          if (s[j + 1] === '0') {
            j++;
          } else { // no manchester
            debugv('tryManchester no manchester', s[j + 1], j, sx);
          }
        } else { // 1
          curValue = (curValue === '0') ? '1' : '0';
        }
        dataNibble += curValue;
        // debugv('dataNibble', dataNibble, j);
        if (dataNibble.length >= 4) {
          data += dataNibble;
          datax += parseInt(dataNibble, 2).toString(16);
          this.sxAdd(sx, parseInt(dataNibble, 2).toString(16), false, true);
          dataNibble = '';
        }
        j++;
      }
      if (dataNibble.length > 0) {
        data += dataNibble;
        datax += `-${dataNibble}`;
        this.sxAdd(sx, dataNibble);
      }
      i = j;
      // Trailer optional > 1 Space
      if ((j < len - 1) && ((s[j] <= sx.data1[psixPulse]) && (s[j + 1] > sx.data1[psixSpace]))) {
        trailer += s[j++];
        trailer += s[j++];
        this.sxAdd(sx, trailer);
        if (header.length > 0) {
          debugv('tryManchester', dataType, 'header', header, 'preambleLength', preambleLength, 'datax', datax, 'trailer', trailer, data.length, iLast, j, data);
        } else {
          debugv('tryManchester', dataType, 'preambleLength', preambleLength, 'datax', datax, 'trailer', trailer, data.length, iLast, j, data);
        }
      } else if (header.length > 0) {
        debugv('tryManchester', dataType, 'header', header, 'preambleLength', preambleLength, 'datax', datax, data.length, iLast, j, data);
      } else {
        debugv('tryManchester', dataType, 'preambleLength', preambleLength, 'datax', datax, data.length, iLast, j, data);
      }
      i = j;
      if (i <= iLast) {
        i = iLast + 2;
      }
      j = i;
    }
    return sx.sx;
  }

  analyse() {
    const { psi } = this;
    this.countPulseSpace();
    // AGC/Signal detection may have single short pulse value
    // likely wrong: merge with normal short pulse
    // pi: '031111111111111...' then becomes pi: '020000000000000
    // todo this.fixFirstPulse();
    // based on trailing space / signal timeout detect repeated packages first/last may be partial
    // this.detectRepeatedPackages();
    this.detectPS01Values();
    debug('ps01f', this.ps01f, this.ps01f.slice(0,4), this.psi.length);
    if (this.ps01f.slice(0,4) === '0011' && this.psi.length >= 140) {
      this.tryManchester(this.psi, this.ps01f);
    }
    this.psx = this.psix(this.psi, this.ps01f);
    // debug('psx', this.psix(this.psi));
    this.print();
  }

  microsToPsi(pulses, comment, signalType) { // convert pulseSpace micro signal to psi
    debugm('microsToPsi ', comment);
    const repeat = 0;
    const pulseSpaceCount = pulses.length;
    const psValue = [];
    const psCount = [];
    let nPulseSpace = 0;
    // determine values and count
    // debugm(pulses);
    for (let i = 0; i < pulseSpaceCount; i++) {
      const ps = pulses[i];
      const j = psValue.indexOf(ps);
      if (j === -1) {
        // pulseSpace.push(ps); // ms decode
        psValue[nPulseSpace] = ps + 0;
        psCount[nPulseSpace] = 1;
        nPulseSpace++;
      } else {
        psCount[j] += 1;
      }
    }
    // fill pulseSpace with these and sort
    const pulseSpace = [];
    for (let i = 0; i < psValue.length; i++) {
      pulseSpace[i] = { ps: psValue[i], count: psCount[i] };
    }
    pulseSpace.sort((a, b) => a.ps - b.ps);
    // debugm(pulseSpace);
    // debugv(pulseSpace);
    // 2020: longest pulse is signal determines tolerance
    // ....: longest gaps are no signal: Intergap or end of package or both
    // ....: longest gaps distance indicate repeated packages/frameCount?
    // .....: move to analyse and don't merge?
    // merge values within minGap range
    /*
// Due to sensor lag, when received, Marks  tend to be 100us too long and
//                                   Spaces tend to be 100us too short
#define MARK_EXCESS    100

// Upper and Lower percentage tolerances in measurements
#define TOLERANCE       25
#define LTOL            (1.0 - (TOLERANCE/100.))
#define UTOL            (1.0 + (TOLERANCE/100.))

// Minimum gap between IR transmissions
#define _GAP            5000
*/
    const ms = [];
    const counts = [];
    let index = 0;
    let psct = 0;
    let psv = pulseSpace[0].ps;
    let i = 0;
    for (; i < pulseSpace.length; i++) {
      // this is too hard coded
      // use accumulative 0 detection to determine 0/1 and then decide the gap range
      // short spikes (first pulse..) HHIIT max 5 per frame not 0/1 (Intermediate gap is rare).
      // try 1 value until 500
      // Proper determine pulse 0 and space 0.
      // al values <= that: merge
      // determine space/pulse excess: Note and merge...
      let mergeGap = (psv <= 500) ? 500 : psv + 250;
      if (pulseSpace[i].ps > mergeGap) {
        // console.log('Merge gap', mergeGap, pulseSpace[i].ps, index, psct);
        if (index < 2) {
          if (psct <= 2) { // start spike
            mergeGap = pulseSpace[i].ps;
          } else if (psv >= 400 && index < 1) {
            mergeGap = 700;
          }
        }
      }
      if (pulseSpace[i].ps > mergeGap) { // new value
        pulseSpace[i - 1].totalCount = psct;
        ms.push(psv);
        counts.push(psct);
        index++;
        psct = pulseSpace[i].count;
        psv = pulseSpace[i].ps;
      } else { // merge
        psv = psv * psct + pulseSpace[i].ps * pulseSpace[i].count;
        psct += pulseSpace[i].count;
        psv = Math.round(psv / psct);
      }
      pulseSpace[i] = { ps: pulseSpace[i].ps, count: pulseSpace[i].count, index };
    }
    // debugm(pulseSpace);
    // debugm(ms);
    // debugm(counts);
    if (i > 0) {
      pulseSpace[i - 1].totalCount = psct;
      ms.push(pulseSpace[i - 1].ps);
      counts.push(pulseSpace[i - 1].totalCount);
    }
    // debugm(pulseSpace);
    // debugm(ms);
    // debugm(counts);

    // todo: sort unique values and index them psi
    let pulseSpace2 = '';
    let pulseSpaceX = '';
    let psx = 0;
    let psxi = 0;
    let fLastWas2 = false;
    for (i = 0; i < pulseSpaceCount; i++) {
      const ps = pulses[i];

      const psi = pulseSpace.find(a => a.ps === ps);
      pulseSpace2 += psi.index.toString(16);

      // hex for 01, otherwise + space
      if (psi.index <= 1) {
        if (fLastWas2) {
          pulseSpaceX = `${pulseSpaceX} `;
        }
        psx = (psx << 1) | psi.index;
        psxi++;
        if (psxi >= 8) {
          pulseSpaceX += psx.toString(16);
          psx = 0;
          psxi = 0;
        }
        fLastWas2 = false;
      } else {
        if (psxi > 0) {
          pulseSpaceX = `${pulseSpaceX + psx.toString(16).toUpperCase()} `;
          psxi = 0;
        } else if (!fLastWas2) {
          pulseSpaceX = `${pulseSpaceX} `;
        }
        pulseSpaceX += psi.index.toString(16).toUpperCase();
        fLastWas2 = true;
      }
      // console.log('psx ', psxi, psx.toString(16), psi.index, pulseSpaceX);
    }
    if (psxi > 0) {
      pulseSpaceX += psx.toString(16).toUpperCase();
      psxi = 0;
    }
    // put in this
    this.psi = pulseSpace2;
    this.count = this.psi.length;
    this.micros = ms;
    this.frameCount = repeat + 1;
    this.signalType = signalType;
  }
}

if (process.argv[2].toLowerCase().endsWith('.js')) { // js module
  debug(`Samples: ${process.argv[2]}`);

  // eslint-disable-next-line import/no-dynamic-require,global-require
  const samples = require(process.argv[2]);
  for (let j = 0; j < samples.samples.length; j++) {
    const sample = samples.samples[j];
    debugv(sample);
    if (sample.psi !== undefined && sample.pulseLengths === undefined) { // broadlink samples
      var psi = new PulseSpaceIndex(sample.psi, sample.micros, sample.frameCount, `broadlink:${sample.signalType}:${sample.comment}`);
    } else if (sample.pulseLengths !== undefined) { // pimatic samples
      const brand = (sample.brands !== undefined) ? (`pimatic:${sample.brands}`).split(',', 1) : 'pimatic';
      var psi = new PulseSpaceIndex(sample.psi, sample.pulseLengths, 1, brand);
    } else { // arduino samples
      let { ps } = sample;
      const { p } = sample;
      const { s } = sample;
      if (ps === undefined) {
        if (p.length > 0) {
          ps = '';
          for (let i = 0; i < p.length; i++) {
            ps = `${ps + p[i]}0`;
          }
        } else {
          ps = '';
          for (let i = 0; i < s.length; i++) {
            ps = `${ps}0${s[i]}`;
          }
        }
      }
      if (sample.signalType === undefined) {
        sample.signalType = 'ook433';
      }
      var psi = new PulseSpaceIndex(ps, sample.avgMicro, sample.frameCount, `NodoDueRkr:${sample.signalType}`);
    }
    psi.analyse();
    debug(psi);
  }
} else { // assume csv or text
  debug(`Samples csvtxt: ${process.argv[2]}`);
  let lc = 0;
  const rl = readline.createInterface({
    input: fs.createReadStream(`./${process.argv[2]}`),
    crlfDelay: Infinity,
  });

  rl.on('line', (line) => {
    if (line.includes('#')) {
      // comment
      debugv('comment ', line);
    } else if (line.includes('Pulses=')) {
      // input like 20;B9;DEBUG;Pulses=132;Pulses(uSec)=200,2550,150,...;
      // match )= until eol or ; split on ,
      const pulses = Array.from(line.match(/\)=([^;]+)/)[1].split(','), x => Number(x));
      const psi = new PulseSpaceIndex(null);
      psi.microsToPsi(pulses, `rflink:${line}`, `rflink:${lc + 1}`);
      psi.analyse();
      debug(psi);
    } else if (line.includes('AA B1 ')) {
      // Tasmota Portisch Sonoff RFbridge v212:22:52.999 RSL: RESULT = {"Time":"2021-08-18T12:22:52","RfRaw":{"Data":"AA B1 03 0172 041A 2AF8 01010110010101010101011001010101010101100110010102 55"}}
      const ptData = line.match(/AA B1 .*55/)[0].split(' ');
      const nrPulseLengths = Number(ptData[2]);
      const pulseLengths = Array.from(ptData.slice(3, 3 + nrPulseLengths), x => parseInt(x, 16));
      const ppsi = ptData[3 + nrPulseLengths];
      // debugv('Tasmota Portisch ', ptData, pulseLengths, psi);
      var psi = new PulseSpaceIndex(ppsi, pulseLengths, 1, 'Tasmota Portisch Sonoff RFbridge');
      psi.analyse();
      debug(psi);
    } else if (line.includes('RFLink')) {
      debugv('Rflink Domoticzlog ', line);
    } else {
      // input like ev1527 253 759 759 253 759...
      // split on space skip first element
      const pulsess = line.split(' ');
      const protocol = pulsess[0];
      pulsess.shift();
      const pulses = Array.from(pulsess, x => Number(x));
      const psi = new PulseSpaceIndex(null);
      psi.microsToPsi(pulses, `pilight:${line}`, `pilight:${protocol}`);
      psi.analyse();
      debug(psi);
    }
    lc++;
  });
}
