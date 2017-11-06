'use strict';
// set DEBUG=*
// 		pulseSpace.sort((a,b) => a.ps - b.ps);
// use header/footer pulse space conventions of lirc/pilight and nodo/rflink
// use basic observation from bye bye stand by protocol: send 3 times, receive 2 times identical packages: repetition is a feature.
const debug = require('debug')('pulsespaceindex');
const debugv = require('debug')('pulsespaceindexverbose');

class PulseSpaceIndex {
    constructor(psi, micros = null, frameCount = 1, signalType = 'ook433') {
      this.signalType = signalType;
      this.frameCount = frameCount;
      this.psi = psi;
      this.count = (psi !== null) ? psi.length : null;
      this.micros = micros;
      this.counts = null; // filled by analyse
      this.pi = null;
      this.si = null;
    }
    analyse() {
		let psi = this.psi;
		let pi = '';
		let si = '';
		let counts = [];

		// check for 2 or 3 dominating data counts: Single pulse and up to 2 spaces or 2 p/s values
		// definitely longer: header/footer signals
		// shorter (spikes) or small difference: merge
		// more data values: unknown encoding for this approach
		if (this.micros !== null) {
			for (let i = 0; i < this.micros.length; i++) {
				counts[i] = [0, 0, 0];
			}
		}

		for (let i = 0; i < psi.length-1; i+= 2) {
			pi = pi + psi[i];
			if (typeof counts[psi[i]] == 'undefined') {
				counts[psi[i]] = [1, 1, 0];
			}
			else {
				counts[psi[i]][0] += 1;
				counts[psi[i]][1] += 1;
			}

			si = si + psi[i + 1];
			if (typeof counts[psi[i+1]] == 'undefined') {
				counts[psi[i + 1]] = [1, 0, 1];
			}
			else {
				counts[psi[i + 1]][0] += 1;
				counts[psi[i + 1]][2] += 1;
			}
		}
		if (psi.length & 1) { // odd so process last pulse
			let i = psi.length-1;
			pi = pi + psi[i];
			if (typeof counts[psi[i]] == 'undefined') {
				counts[psi[i]] = [1, 1, 0];
			}
			else {
				counts[psi[i]][0] += 1;
				counts[psi[i]][1] += 1;
			}
		}
		this.counts = counts;
		this.pi = pi;
		this.si = si;
	}
	microsToPsi(pulses, comment) { // convert pulseSpace micro signal to psi
		debugv('microsToPsi ', comment);
		let repeat = 0;
    	let pulseSpaceCount = pulses.length;
    	let psValue = [];
    	let psCount = [];
    	let nPulseSpace = 0;
    	// determine values and count
    	for (let i = 0; i < pulseSpaceCount; i++) {
			let ps = pulses[i];
			let j = psValue.indexOf(ps);
			if (j === -1) {
				//pulseSpace.push(ps); // ms decode
				psValue[nPulseSpace] = ps + 0;
				psCount[nPulseSpace] = 1;
				nPulseSpace++;
			}
			else {
				psCount[j] += 1;
			}
		}
    	// fill pulseSpace with these and sort
		let pulseSpace = [];
		for (let i = 0; i < psValue.length; i++) {
			pulseSpace[i] = {ps: psValue[i], count: psCount[i]};
		}
		pulseSpace.sort((a,b) => a.ps - b.ps);
		//debugv(pulseSpace);

		// merge values within minGap range
		let index = 0;
		let psv = psValue[0];
		let psct = 0;
		//let minGap = (psv < 10) ? 1 : (psv < 100) ? 3 : (psv < 1000) ? 10 : 100;
		let minGap = (psv < 1000) ? 50 : 100;
		let ms = [];
		let counts = [];
		let i = 0;
		for (; i < pulseSpace.length; i++) {
			if (pulseSpace[i].ps > psv + minGap) {
				pulseSpace[i-1].totalCount = psct;
				ms.push(pulseSpace[i-1].ps);
				counts.push(pulseSpace[i-1].totalCount);
				index++;
				psct = pulseSpace[i].count;
				psv = pulseSpace[i].ps;
				minGap = (psv < 1000) ? 50 : 100;
			}
			else {
				psct += pulseSpace[i].count;
				psv = pulseSpace[i].ps;
			}
			pulseSpace[i] = {ps: pulseSpace[i].ps, count: pulseSpace[i].count, index: index};
		}
		if (i > 0) {
			pulseSpace[i-1].totalCount = psct;
			ms.push(pulseSpace[i-1].ps);
			counts.push(pulseSpace[i-1].totalCount);
		}
		//debugv(pulseSpace);
		//debugv(ms);
		//debugv(counts);

    	// todo: sort unique values and index them psi
    	let pulseSpace2 = '';
    	let pulseSpaceX = '';
    	let psx = 0;
    	let psxi = 0;
    	let fLastWas2 = false;
    	for (let i = 0; i < pulseSpaceCount; i++) {
			let ps = pulses[i];

			let psi = pulseSpace.find((a) => a.ps === ps);
			pulseSpace2 = pulseSpace2 + psi.index.toString(16);

			// hex for 01, otherwise + space
			if (psi.index <= 1) {
				if (fLastWas2) {
					pulseSpaceX = pulseSpaceX + ' ';
				}
				psx = (psx << 1) | psi.index;
				psxi++;
				if (psxi >= 8) {
					pulseSpaceX = pulseSpaceX + psx.toString(16);
					psx = 0;
					psxi = 0;
				}
				fLastWas2 = false;
			}
			else {
				if (psxi > 0) {
					pulseSpaceX = pulseSpaceX + psx.toString(16).toUpperCase() + ' ';
					psxi = 0;
				}
				else if (!fLastWas2) {
					pulseSpaceX = pulseSpaceX + ' ';
				}
				pulseSpaceX = pulseSpaceX + psi.index.toString(16).toUpperCase();
				fLastWas2 = true;
			}
			//console.log('psx ', psxi, psx.toString(16), psi.index, pulseSpaceX);
		}
		if (psxi > 0) {
			pulseSpaceX = pulseSpaceX + psx.toString(16).toUpperCase();
			psxi = 0;
		}
		// put in this
		this.psi = pulseSpace2;
		this.count = this.psi.length;;
		this.micros = ms;
		this.frameCount = repeat + 1;
		//this.signalType = signalType;
		//this.psx = pulseSpaceX.toUpperCase()
    }
};

if (process.argv[2].toLowerCase().endsWith('.js')) { // js module
	debug(`Samples: ${process.argv[2]}`);

	const samples = require(process.argv[2]);
	for (let j = 0; j < samples.samples.length; j++) {
		let sample = samples.samples[j];
		debugv(sample);
		if (sample.psi !== undefined && sample.pulseLengths === undefined) { // broadlink samples
			var psi = new PulseSpaceIndex(sample.psi, sample.micros, sample.frameCount, sample.signalType);
		}
		else if (sample.pulseLengths !== undefined) { // pimatic samples
			var psi = new PulseSpaceIndex(sample.psi, sample.pulseLengths);
		}
		else { // arduino samples
			let ps = sample.ps;
			let p = sample.p;
			let s = sample.s;
			if (ps === undefined) {
				if (p.length > 0) {
					ps = '';
					for (let i = 0; i < p.length; i++) {
						ps = ps + p[i] + '0';
					}
				}
				else {
					ps = '';
					for (let i = 0; i < s.length; i++) {
						ps = ps + '0' + s[i];
					}
				}
			}
			var psi = new PulseSpaceIndex(ps, sample.maxMicro, sample.frameCount, sample.signalType);
		}
		psi.analyse();
		debug(psi);
	}
}
else { // assume csv or text
	debug(`Samples csvtxt: ${process.argv[2]}`);
	const readline = require('readline');
	const fs = require('fs');
	var lc = 0;
	const rl = readline.createInterface({
	  input: fs.createReadStream(`./${process.argv[2]}`),
	  crlfDelay: Infinity
	});

	rl.on('line', (line) => {
		if (line.includes('#')){
			// comment
			debugv('comment ', line);
		}
		else if (line.includes('=')) {
			// input like 20;B9;DEBUG;Pulses=132;Pulses(uSec)=200,2550,150,...;
			// match )= until eol or ; split on ,
			let pulses = Array.from(line.match(/\)=([^;]+)/)[1].split(','), x => Number(x));
			var psi = new PulseSpaceIndex(null);
			psi.microsToPsi(pulses, 'rflink:' + line);
			psi.analyse();
			debug(psi);
		}
		else {
			// input like ev1527 253 759 759 253 759...
			// split on space skip first element
			let pulsess = line.split(' ');
			pulsess.shift();
			let pulses = Array.from(pulsess, x => Number(x));
			var psi = new PulseSpaceIndex(null);
			psi.microsToPsi(pulses, 'pilight:' + line);
			psi.analyse();
			debug(psi);
		}
	  lc++;
	});
}
