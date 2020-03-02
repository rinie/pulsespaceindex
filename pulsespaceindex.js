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

    // check repeated packages data header/footer split
    // start at largest time, split data as long as you keep 'large chunks'
    // RF: prefer chunk start with pulse
    // check # repeats and repeat length
    // then check identical chunks... psi is string of hex characters.
  detectRepeatedPackages() {
    const { psi } = this;
    const counts = this.counts;
    let psiii = [];
    for (let split = counts.length - 1; split > 2; split--) {
      const splitv = split.toString(16); // header/footer (or no data/body) value
      let start = 0;
      let end = 0;
      const psii = [];
      for (let i = 0; i < psi.length; i++) {
        // until split
        for (; i < psi.length; i++) {
          if (psi[i] >= splitv) {
            end = i;
            break;
          }
        }
        for (; i < psi.length; i++) {
          if (psi[i] < splitv) {
            const e1 = (end & 1) ? end + 1 : end;
            const e2 = (i & 1) ? i : i - 1;
            if (e1 > start) {
              // debugv('e1', i, start, end, e1, e2, psi.slice(start, e1));
              psii.push(psi.slice(start, e1));
              start = e1;
            } else {
              debugv('e2', i, start, end, e1, e2, psi[i]);
              // start = e2-1;
            }
            break;
          }
        }
      }
      // check signal/noise
      const minPacket = 32;
      let maxPacket = 32;
      let isNoise = true;
      let noiseCount = 0;
      let signalCount = 0;
      let repeatCount = 0;
      const psiil = [];
      for (let i = 0; i < psii.length; i++) {
        let fFound = false;
        for (let j = 0; j < psiil.length; j++) {
          if (psii[i] === psiil[j].psi) {
            psiil[j].rep++;
            fFound = true;
            if (psii[i].length >= minPacket) {
              repeatCount++; // signal repeat count
            }
            break;
          }
        }
        if (!fFound) {
          const fNoise = (psii[i].length < minPacket);
          if (fNoise) {
            // new noise value
            noiseCount++;
          } else {
            signalCount++;
            if (psii[i].length > maxPacket) { // new length
              maxPacket = psii[i].length;
            }
            // new data value
            psiil.push({ psi: psii[i], /* noise: fNoise, */ rep: 0, len: psii[i].length });
          }
        }
      }
      isNoise = (noiseCount >= signalCount) && (repeatCount <= 1);
      if (!isNoise) {
        psiii = {
          packets: psiil,
          split,
          signalCount,
          noiseCount,
          repeatCount,
        };
      }
      // todo final split
      // debugv(`Split ${split} mp:${maxPacket} sc: ${signalCount} nc: ${noiseCount} rc: ${repeatCount} try`);
      // debugv('psiil', psiil);
    }
    if (typeof psiii.split === 'undefined') {
      debugv('Split none');
    } else {
      debugv(`Split ${psiii.split} sc: ${psiii.signalCount} nc: ${psiii.noiseCount} rc: ${psiii.repeatCount}`);
      debug(psiii);
    }
    this.counts = counts;
  }

  // detect dominating pulse and space values
  // distinct from Header Sync / Trailer space or preamble
  // denoted as data pulse 0, data pulse 1, data space 0 and data space 1
  // todo: PPM is single P, only (data) spaces have 2 values
  //
  detectPS01Values() {
    const { psi } = this;
    const counts = this.counts;
    // now check dominating pulse and space counts
    // max counts pulse and space counts
    const maxDomCounts = 2;
    const domCountIndex = [[-1,-1], [-1,-1]];
    const min01ValuesCount = 3; // max one start/one stop sync?
    for (let i = 0; i < counts.length; i++) {
        for (let psix = 0; psix < psixPulseSpace; psix++) {
          let ct = counts[i].ct[psix];
          if (ct > min01ValuesCount) {
            if (domCountIndex[0][psix] === -1) {
              domCountIndex[0][psix] = i;
            }
            else if (ct >= counts[domCountIndex[0][psix]].ct[psix]) {
              domCountIndex[1][psix] = domCountIndex[0][psix];
              domCountIndex[0][psix] = i;
            }
            else if (domCountIndex[1][psix] === -1) {
              domCountIndex[1][psix] = i;
            }
            else if (ct >= counts[domCountIndex[1][psix]].ct[psix]) {
              domCountIndex[1][psix] = i;
            }
          }
        }
    }

    for (let psix = 0; psix < psixPulseSpace; psix++) {
      if (domCountIndex[1][psix] !== -1 && domCountIndex[0][psix] > domCountIndex[1][psix]) {
        const d = domCountIndex[0][psix];
        domCountIndex[0][psix] = domCountIndex[1][psix];
        domCountIndex[1][psix] = d;
      }
    }

    let max01Index = 0;
    // register in counts[].p
    for (let i = 0; i < maxDomCounts; i++) {
       if (domCountIndex[i][psixPulse] !== -1) {
          counts[domCountIndex[i][psixPulse]].p = i;
          max01Index = domCountIndex[i][psixPulse];
        }
    }
    // register in counts[].s
    for (let i = 0; i < maxDomCounts; i++) {
       if (domCountIndex[i][psixSpace] !== -1) {
          counts[domCountIndex[i][psixSpace]].s = i;
          if (domCountIndex[i][psixSpace] > max01Index) {
            max01Index = domCountIndex[i][psixSpace];
          }
        }
    }
    //debugv('max01Index', max01Index);
    for (let i = 0; i < max01Index; i++) {
      if (counts[i].p === undefined && counts[i].ct[psixPulse] > 0) {
        if (counts[i].s === undefined && counts[i].ct[psixSpace] > 0) {
          let pMergeIndex = domCountIndex[0][psixPulse];
          let sMergeIndex = domCountIndex[0][psixSpace]; //to simple closest to ...
          //debugv('max01Index merge ps', max01Index, i);
          counts[i].mergeToIx = [pMergeIndex, sMergeIndex];
        }
        else {
          let pMergeIndex = domCountIndex[0][psixPulse];
          //debugv('max01Index merge p', max01Index, i);
          counts[i].mergeToIx = [pMergeIndex, -1];
        }
      }
      else if (counts[i].s === undefined && counts[i].ct[psixSpace] > 0) {
        let sMergeIndex = domCountIndex[0][psixSpace];
        //debugv('max01Index merge s', max01Index, i);
        counts[i].mergeToIx = [-1, sMergeIndex];
      }
    }
    // todo: merge pulse gaps until sDomCount[1]..
    this.counts = counts;
  }

  print() { // uniform output format
    // console.log('tja', this);
    const sep = ',';
    if (this.micros !== null) {
      console.log(this.count.toString(), sep, `'${this.psi}'`, ',', this.micros.length, ',', ...this.micros, ',', (this.signalType).toString().replace(/ /g, '_'));
    } else {
      console.log(this.count.toString(), sep, `'${this.psi}'`, ',', (this.signalType).toString().replace(/ /g, '_'));
    }
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
      let mergeGap = psv + ((psv < 1000) ? 50 : 100);
      if (pulseSpace[i].ps > mergeGap) {
        pulseSpace[i - 1].totalCount = psct;
        ms.push(psv);
        counts.push(psct);
        index++;
        psct = pulseSpace[i].count;
        psv = pulseSpace[i].ps;
      } else {
        psct += pulseSpace[i].count;
        psv = pulseSpace[i].ps;
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
      var psi = new PulseSpaceIndex(sample.psi, sample.micros, sample.frameCount, `broadlink:${sample.signalType}`);
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
