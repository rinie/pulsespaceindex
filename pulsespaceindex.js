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

class PulseSpaceIndex {
  constructor(psi, micros = null, frameCount = 1, signalType = 'ook433') {
    this.signalType = signalType;
    this.frameCount = frameCount;
    this.count = (psi !== null) ? psi.length : null;
    this.micros = micros;
    this.counts = null; // filled by analyse
    this.ps01 = '0000'; // filled by detectPS01Values: minimal ps is p01s01, s is p0s01 or p00s01... s12 is p0s12...
    this.psx = null;
    this.psi = psi; // Pulse Space Index
    this.pi = null; // Pulse Index
    this.si = null; //Space Index
  }

  countPulseSpace() {
    const { psi } = this;
    let pi = '';
    let si = '';
    const counts = [];
    if (this.micros !== null) {
      for (let i = 0; i < this.micros.length; i++) {
        counts[i] = { i:i, t: this.micros[i], ct: [0, 0, 0] };
      }
    }
    else {
      for (let i = 0; i < psi.length - 1; i ++) {
        const psii = parseInt(psi[i], 16);
        if (typeof counts[psii] === 'undefined') {
          counts[psii] = { i: psii, t: null, ct: [0, 0, 0] }; // i: pssii or psi[i]?
         }
      }
      // fill blanks
      for (let i = 0; i < counts.length; i++) {
        if (typeof counts[i] === 'undefined') {
          counts[i] = { i: i, t: null, ct: [0, 0, 0] };
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
  detectPS01Values() {
    const { psi } = this;
    const counts = this.counts;
    // now check dominating pulse and space counts
    // max counts pulse and space counts
    const maxDomCounts = 2;
    // convert to string '01'...
    // ps01 0011
    let ps01 = [0,0,0,0];
    let min01ValuesCount = 1; // max one start/one stop sync? was 3
    const maxI = (counts.length < 4) ? counts.length : 4;
    for (let i = 1; i < maxI; i++) {
        if (i > 1 && this.count > 32) {
          min01ValuesCount = Math.round(this.count/32); // todo max this % of packages length
        }
        for (let psix = 0; psix < psixPulseSpace; psix++) {
          let ct = counts[i].ct[psix];
          if (ct > min01ValuesCount) {
            let ct0 = counts[ps01[psix + 0]].ct[psix];
            let ct1 = counts[ps01[psix + 2]].ct[psix];
            //debugv(ps01, psix, ct, ct0, ct1, i, psix+2);
            if (ct >= ct1 || ct >= ct0 || ps01[psix + 0] === ps01[psix + 2]) {
              ps01[psix + 0] = ps01[psix + 2];
              ps01[psix + 2] = i;
            }
          }
        }
    }
    //debugv(ps01);

    // check 0 values
    // pulse [0] and [2]
    if (counts[ps01[0]].ct[psixPulse] === 0) {
      ps01[0] = ps01[2];
    }
    counts[ps01[0]].p = 0;
    if (ps01[0] !== ps01[2]) {
      counts[ps01[2]].p = 1;
    }

    // space [1] and [3]
    if (counts[ps01[1]].ct[psixSpace] === 0) {
      ps01[1] = ps01[3];
    }
    counts[ps01[1]].s = 0;
    if (ps01[1] !== ps01[3]) {
      counts[ps01[3]].s = 1;
    }

    this.counts = counts;
    this.ps01 = ps01.join('');
  }

  print() { // uniform output format
    // console.log('tja', this);
    const sep = ';';
    const newOutputFormat = true;
    if (newOutputFormat) {
      if (this.micros !== null) {
        console.log(this.count.toString(), this.micros.toString(),`'${this.psx}'`, (this.signalType).toString().replace(/ /g, '_'));
      } else {
        console.log(this.count.toString(), `'${this.psx}'`, (this.signalType).toString().replace(/ /g, '_'));
      }
    }
    else {
      if (this.micros !== null) {
        console.log(this.count.toString(), sep, this.micros.length, sep, ...this.micros, sep, `'${this.psi}'`, sep, (this.signalType).toString().replace(/ /g, '_'));
      } else {
        console.log(this.count.toString(), sep, `'${this.psi}'`, sep, (this.signalType).toString().replace(/ /g, '_'));
      }
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
   * todo: Header/Leader data Trailer/Pause. Longer signal or repeated 1s
   */
  psix(s, ps01) {
    const dataType = ((ps01[0] != ps01[2]) ? 'p' : '') + ((ps01[1] != ps01[3]) ? 's' : '');
    const sx = {
      sx: ps01 + ':',
      hexMode: false,
      constantMode: false,
      data0: [ps01[0], ps01[1]],
      data1: [ps01[2], ps01[3]],
      dataType: dataType,
      start: 0,
      end: s.length
    }

    // ps both s + previous, p + next
    // data both 01 (and) , leader/trailer at least one > 1
    // alternate > 1 sections with <= 1 sections,
    // <=1 sections always start with pulse, end with space...
    let i = sx.start;
    let j = i;
    const len = sx.end;
    debugv('psix', ps01, sx);
    while (i < len) {
      let iLast = i;
      let leader = ''; // pulse or pulse space
      let data = '';
      let datax = '';
      let trailer = ''; // space
      // Leader optional > 1 section
      while ((j < len-1) && ((s[j] > sx.data1[psixPulse]) || (s[j+1] > sx.data1[psixSpace]))) {
          leader += s[j++];  // pulse
          leader += s[j++]; // space
      }
      if (j > i) {
        // debugv('leader', leader, i, j);
        this.sxAdd(sx, leader);
        i = j;
      }

      // data <= 1 section
      let dataNibble = '';
      while ((j < len-1) && ((s[j] <= sx.data1[psixPulse]) && (s[j+1] <= sx.data1[psixSpace]))) {
        if (dataType === 'ps') {
            dataNibble += (s[j+0] === sx.data0[psixPulse]) ? '0' : '1';
            dataNibble += (s[j+1] === sx.data0[psixSpace]) ? '0' : '1';
        }
        else if (dataType === 'p') {
            dataNibble += (s[j+0] === sx.data0[psixPulse]) ? '0' : '1';
        }
        else { // 's'
            dataNibble += (s[j+1] === sx.data0[psixSpace]) ? '0' : '1';
        }
        //debugv('dataNibble', dataNibble, j);
        if (dataNibble.length >= 4) {
          data += dataNibble;
          datax += parseInt(dataNibble, 2).toString(16);
          this.sxAdd(sx, parseInt(dataNibble, 2).toString(16), false, true);
          dataNibble = '';
        }
        j+= 2;
      }
      if (dataNibble.length > 0) {
          data += dataNibble;
          datax += '-' + dataNibble;
          this.sxAdd(sx, dataNibble);
      }
      i = j;
      // Trailer optional > 1 Space
      if ((j < len-1) && ((s[j] <= sx.data1[psixPulse]) && (s[j+1] > sx.data1[psixSpace]))) {
        trailer += s[j++];
        trailer += s[j++];
        this.sxAdd(sx, trailer);
        if (leader.length > 0 ) {
          debugv(dataType, 'leader', leader, 'datax', datax, 'trailer', trailer, data.length, iLast, j, data);
        }
        else {
          debugv(dataType, 'datax', datax, 'trailer', trailer, data.length, iLast, j, data);
        }
      }
      else {
        if (leader.length > 0 ) {
          debugv(dataType, 'leader', leader, 'datax', datax, data.length, iLast, j, data);
        }
        else {
          debugv(dataType, 'datax', datax, data.length, iLast, j, data);
        }
      }
      i = j;
      if (i <= iLast) {
        i = iLast + 2;
      }
      j = i;
    }
    return sx.sx;
  }

  tryManchester(s, ps01) {
    const dataType = ((ps01[0] != ps01[2]) ? 'p' : '') + ((ps01[1] != ps01[3]) ? 's' : '');
    const sx = {
      sx: ps01 + ':',
      hexMode: false,
      constantMode: false,
      data0: [ps01[0], ps01[1]],
      data1: [ps01[2], ps01[3]],
      dataType: dataType,
      start: 0,
      end: s.length
    }

    // ps both s + previous, p + next
    // data both 01 (and) , leader/trailer at least one > 1
    // alternate > 1 sections with <= 1 sections,
    // <=1 sections always start with pulse, end with space...
    let i = sx.start;
    let j = i;
    const len = sx.end;
    if (ps01 != '0011') {
      return;
    }
    debugv('tryManchester', ps01, sx);
    while (i < len) {
      let iLast = i;
      let leader = ''; // pulse or pulse space
      let data = '';
      let datax = '';
      let trailer = ''; // space
      // Leader optional > 1 section
      while ((j < len-1) && ((s[j] > 1) || (s[j+1] > 1))) {
          leader += s[j++];  // pulse
          leader += s[j++]; // space
      }
      if (j > i) {
        // debugv('leader', leader, i, j);
        this.sxAdd(sx, leader);
        i = j;
      }

      let preambleLength = 0;
      while ((j < len-1) && ((s[j] === '1'))) {
            preambleLength++;
            j++
      }
      let curValue = '0';
      // data <= 1 section
      let dataNibble = curValue;
      while ((j < len-1) && ((s[j] <= '1'))) {
        if (s[j] === '0') {
            if (s[j+1] === '0') {
              j++;
            }
            else { // no manchester
              debugv('tryManchester no manchester', s[j+1], j, sx);
              ;
            }
          }
          else { // 1
            curValue = (curValue === '0') ? '1' : '0';
          }
        dataNibble += curValue;
        //debugv('dataNibble', dataNibble, j);
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
          datax += '-' + dataNibble;
          this.sxAdd(sx, dataNibble);
      }
      i = j;
      // Trailer optional > 1 Space
      if ((j < len-1) && ((s[j] <= sx.data1[psixPulse]) && (s[j+1] > sx.data1[psixSpace]))) {
        trailer += s[j++];
        trailer += s[j++];
        this.sxAdd(sx, trailer);
        if (leader.length > 0 ) {
          debugv('tryManchester', dataType, 'leader', leader, 'preambleLength', preambleLength, 'datax', datax, 'trailer', trailer, data.length, iLast, j, data);
        }
        else {
          debugv('tryManchester', dataType, 'preambleLength', preambleLength, 'datax', datax, 'trailer', trailer, data.length, iLast, j, data);
        }
      }
      else {
        if (leader.length > 0 ) {
          debugv('tryManchester', dataType, 'leader', leader, 'preambleLength', preambleLength, 'datax', datax, data.length, iLast, j, data);
        }
        else {
          debugv('tryManchester', dataType, 'preambleLength', preambleLength, 'datax', datax, data.length, iLast, j, data);
        }
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
    //this.detectRepeatedPackages();
    this.detectPS01Values();
    if (this.ps01 === '0011' && this.psi.length === 232) {
      this.tryManchester(this.psi, this.ps01);
    }
    this.psx = this.psix(this.psi, this.ps01);
    //debug('psx', this.psix(this.psi));
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
    //debugm(pulses);
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
      pulseSpace[i] = { ps: psValue[i], count: psCount[i]};
    }
    pulseSpace.sort((a, b) => a.ps - b.ps);
    //debugm(pulseSpace);
    // debugv(pulseSpace);
    // 2020: longest pulse is signal determines tolerance
    // ....: longest gaps are no signal: Intergap or end of packege or both
    // ....: longest gaps distance indicate repeated packages/frameCount?
    //.....: move to analyse and don't merge?
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
      // try 1 value until 500
      let mergeGap = (psv <= 500) ? 500 : psv + 250;
      if (pulseSpace[i].ps > mergeGap) {
        //console.log('Merge gap', mergeGap, pulseSpace[i].ps, index, psct);
        if (index < 2) {
          if (psct <= 2) { // start spike
            mergeGap = pulseSpace[i].ps;
          }
          else if (psv >= 400 && index < 1) {
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
    //debugm(pulseSpace);
    //debugm(ms);
    //debugm(counts);
    if (i > 0) {
      pulseSpace[i - 1].totalCount = psct;
      ms.push(pulseSpace[i - 1].ps);
      counts.push(pulseSpace[i - 1].totalCount);
    }
    //debugm(pulseSpace);
    //debugm(ms);
    //debugm(counts);

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
