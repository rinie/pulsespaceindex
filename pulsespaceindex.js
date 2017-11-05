'use strict';
// set DEBUG=*
// 		pulseSpace.sort((a,b) => a.ps - b.ps);
// use header/footer pulse space conventions of lirc/pilight and nodo/rflink
// use basic observation from bye bye stand by protocol: send 3 times, receive 2 times identical packages: repetition is a feature.
const debug = require('debug')('pulsespaceindex');
const debugv = require('debug')('pulsespaceindexverbose');

class PulseSpaceIndex {
    constructor(psi, micros = null, frameCount = 1, signalType = 'ook433') {
      this.psi = psi;
      this.count = psi.length;
      this.micros = micros;
      this.frameCount = frameCount;
      this.signalType = signalType;
      this.pi = null;
      this.si = null;
    }
    analyse() {
		let psi = this.psi;
		let pi = '';
		let si = '';
		for (let i = 0; i < psi.length-1; i+= 2) {
			pi = pi + psi[i];
			si = si + psi[i + 1];
		}
		this.pi = pi;
		this.si = si;
	}
	microsToPsi(pulses) { // convert pulseSpace micro signal to psi
		let repeat = 0;
    	let pulseSpaceCount = pulses.length;
    	let psValue = [];
    	let psCount = [];
    	let nPulseSpace = 0;
    	for (let i = 8; i < psc; i++) {
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
		let pulseSpace = [];
		for (let i = 0; i < psValue.length; i++) {
			pulseSpace[i] = {ps: psValue[i], count: psCount[i], ms: psValue[i]};
		}

		pulseSpace.sort((a,b) => a.ps - b.ps);

		let index = 0;
		let psv = psValue[0];
		let psct = 0;
		let i = 0;
		let minGap = (psv < 10) ? 1 : (psv < 100) ? 3 : (psv < 1000) ? 10 : 100;
		let ms = [];
		let counts = [];
		for (; i < pulseSpace.length; i++) {
			if (pulseSpace[i].ps > psv + minGap) {
				pulseSpace[i-1].totalCount = psct;
				ms.push(pulseSpace[i-1].ms);
				counts.push(pulseSpace[i-1].totalCount);
				index++;
				psct = pulseSpace[i].count;
				psv = pulseSpace[i].ps;
				minGap = (psv < 10) ? 1 : (psv < 100) ? 3 : (psv < 1000) ? 10 : 100;
			}
			else {
				psct += pulseSpace[i].count;
				psv = pulseSpace[i].ps;
			}
			pulseSpace[i] = {ps: pulseSpace[i].ps, count: pulseSpace[i].count, ms: pulseSpace[i].ms, index: index};
		}
		pulseSpace[i-1].totalCount = psct;
		ms.push(pulseSpace[i-1].ms);
		counts.push(pulseSpace[i-1].totalCount);

    	// todo: sort unique values and index them psi
    	let pulseSpace2 = '';
    	let pulseSpaceX = '';
    	let psx = 0;
    	let psxi = 0;
    	let fLastWas2 = false;
		for (; i < pulseSpace.length; i++) {
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
		this.count = pulseSpaceCount;
		this.micros = ms;
		this.frameCount = repeat + 1;
		//this.signalType = signalType;
		this.psx = pulseSpaceX.toUpperCase()
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
	const readline = require('readline');
	const fs = require('fs');
	var lc = 0;
	const rl = readline.createInterface({
	  input: fs.createReadStream(`./${process.argv[2]}`),
	  crlfDelay: Infinity
	});

	rl.on('line', (line) => {
	  console.log(line);
	  lc++;
	});
}
