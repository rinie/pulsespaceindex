'use strict';
// set DEBUG=*
// 		pulseSpace.sort((a,b) => a.ps - b.ps);
// use header/footer pulse space conventions of lirc/pilight and nodo/rflink
// use basic observation from bye bye stand by protocol: send 3 times, receive 2 times identical packages: repetition is a feature.
const debug = require('debug')('psi');
const debugv = require('debug')('psiv');
const psixPulse = 0, psixSpace = 1, psixPulseSpace = 2; // fix with ES6 enums but...

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
		// TODO: convert traditional code to ES6
		// totals and frequency. merge/max data/skip holes and multi frame detection

		// check for 2 or 3 dominating data counts: Single pulse and up to 2 spaces or 2 p/s values
		// definitely longer: header/footer signals
		// shorter (spikes) or small difference: merge
		// more data values: unknown encoding for this approach
		if (this.micros !== null) {
			for (let i = 0; i < this.micros.length; i++) {
				counts[i] = {i: i, t: this.micros[i], ct: [0, 0, 0]};
			}
		}

		for (let i = 0; i < psi.length-1; i+= 2) {
			const psii = parseInt(psi[i], 16);
			pi = pi + psi[i];
			if (typeof counts[psii] == 'undefined') {
				counts[psii] = {i: psii, t: null , ct: [1, 0, 1]}; // i: pssii or psi[i]?
			}
			else {
				counts[psii].ct[psixPulse] += 1;
				counts[psii].ct[psixPulseSpace] += 1;
			}

			const sii = parseInt(psi[i + 1], 16);
			si = si + psi[i + 1];
			if (typeof counts[sii] == 'undefined') {
				counts[psi[sii]] = {i: sii, t: null , ct: [0, 1, 1]};
			}
			else {
				counts[sii].ct[psixSpace] += 1;
				counts[sii].ct[psixPulseSpace] += 1;
			}
		}
		if (psi.length & 1) { // odd so process last pulse
			let i = psi.length-1;
			const psii = parseInt(psi[i], 16);
			pi = pi + psi[i];
			if (typeof counts[psii] == 'undefined') {
				counts[psii] = {i: psii, t: null , ct: [1, 0, 1]};
			}
			else {
				counts[psii].ct[psixPulse] += 1;
				counts[psii].ct[psixPulseSpace] += 1;
			}
		}

		// check repeated packages data header/footer split
		// start at largest time, split data as long as you keep 'large chunks'
		// RF: prefer chunk start with pulse
		// check # repeats and repeat length
		// then check identical chunks... psi is string of hex characters.
		let psiii = [];
		for (let split = counts.length - 1; split > 2; split--) {
			const splitv = split.toString(16); // header/footer (or no data/body) value
			let start = 0;
			let end = 0;
			let psii = [];
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
						let e1 = (end & 1) ? end + 1 : end;
						let e2 = (i & 1) ? i : i - 1;
						if (e1 > start) {
							//debugv('e1', i, start, end, e1, e2, psi.slice(start, e1));
							psii.push(psi.slice(start, e1));
							start = e1;
						}
						else {
							debugv('e2', i, start, end, e1, e2, psi[i]);
							//start = e2-1;
						}
						break;
					}
				}
			}
			// check signal/noise
			let minPacket = 32;
			let maxPacket = 32;
			let isNoise = true;
			let noiseCount = 0;
			let signalCount = 0;
			let repeatCount = 0;
			let psiil = [];
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
					let fNoise = (psii[i].length < minPacket);
					if (fNoise) {
						// new noise value
						noiseCount++;
					}
					else {
						signalCount++;
						if (psii[i].length > maxPacket) { // new length
							maxPacket = psii[i].length;
						}
						// new data value
						psiil.push({psi: psii[i], /* noise: fNoise, */ rep: 0, len: psii[i].length});
					}
				}
			}
			isNoise = (noiseCount >= signalCount) && (repeatCount <= 1);
			if (!isNoise) {
				psiii = {
					packets: psiil,
					split: split,
					signalCount: signalCount,
					noiseCount: noiseCount,
					repeatCount: repeatCount,
				}
			}
			// todo final split
			//debugv(`Split ${split} mp:${maxPacket} sc: ${signalCount} nc: ${noiseCount} rc: ${repeatCount} try`);
			//debugv('psiil', psiil);
		}
		if (typeof psiii.split == 'undefined') {
			debugv('Split none');
		}
		else {
			debugv(`Split ${psiii.split} sc: ${psiii.signalCount} nc: ${psiii.noiseCount} rc: ${psiii.repeatCount}`);
			debug(psiii);
		}
		// now check dominating pulse and space counts
		let skip = 0;
		// 2 max counts
		let pDomCount = [0, 0];
		let sDomCount = [0, 0];
		for (let i = 0; i < counts.length; i++) {
			if (typeof counts[i] == 'undefined') {
				counts[i] = {i: null, t: null, ct: [0, 0, 0]};
				skip++;
			}
			else {
				if (counts[i].ct[psixPulseSpace] === 0) {
					counts[i].i = null;
					skip++;
				}
				else if (skip > 0) {
					counts[i].i -= skip;
				}
				if (counts[i].ct[psixPulse] > counts[pDomCount[0]].ct[psixPulse]) {
					pDomCount[0] = i;
				}
				if (counts[i].ct[psixSpace] > counts[sDomCount[0]].ct[psixSpace]) {
					sDomCount[0] = i;
				}
			}
		}

		if (pDomCount[0] === 0) {
			pDomCount[1] = 1;
		}
		if (sDomCount[0] === 0) {
			sDomCount[1] = 1;
		}
		for (let i = 0; i < counts.length; i++) {
			if ((i !== pDomCount[0]) && ((counts[i].ct[psixPulse] <= counts[pDomCount[0]].ct[psixPulse]))
				&& (counts[i].ct[psixPulse] > counts[pDomCount[1]].ct[psixPulse])){
				pDomCount[1] = i;
			}
			if ((i !== sDomCount[0]) && ((counts[i].ct[psixSpace] <= counts[sDomCount[0]].ct[psixSpace]))
				&& (counts[i].ct[psixSpace] > counts[sDomCount[1]].ct[psixSpace])){
				sDomCount[1] = i;
			}
		}

		counts[pDomCount[0]].p = 0;
		if (counts[pDomCount[1]].ct[psixPulse] > 2) {
			counts[pDomCount[1]].p = 1;
		}
		counts[sDomCount[0]].s = 0;
		if (counts[sDomCount[1]].ct[psixSpace] > 2) {
			counts[sDomCount[1]].s = 1;
		}
		this.counts = counts;
		this.pi = pi;
		this.si = si;
		this.print();
	}
	print() { // uniform output format
		//console.log('tja', this);
		let sep = ',';
		if (this.micros !== null) {
			console.log(this.count.toString(), sep, "\'" + this.psi+ "\'", ',', this.micros.length, ',', ...this.micros, ',', (this.signalType).toString().replace(/ /g, '_'));
		}
		else {
			console.log(this.count.toString(), sep, "\'" + this.psi+ "\'", ',', (this.signalType).toString().replace(/ /g, '_'));
		}
	}
	microsToPsi(pulses, comment, signalType) { // convert pulseSpace micro signal to psi
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
		this.signalType = signalType;
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
			var psi = new PulseSpaceIndex(sample.psi, sample.micros, sample.frameCount, 'broadlink:' + sample.signalType);
		}
		else if (sample.pulseLengths !== undefined) { // pimatic samples
			let brand = (sample.brands !== undefined) ? ('pimatic:' + sample.brands).split(',', 1) : 'pimatic';
			var psi = new PulseSpaceIndex(sample.psi, sample.pulseLengths, 1, brand);
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
			if (sample.signalType === undefined) {
				sample.signalType = 'ook433';
			}
			var psi = new PulseSpaceIndex(ps, sample.avgMicro, sample.frameCount, 'NodoDueRkr:' + sample.signalType);
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
			psi.microsToPsi(pulses, 'rflink:' + line, 'rflink:' + (lc + 1) );
			psi.analyse();
			debug(psi);
		}
		else {
			// input like ev1527 253 759 759 253 759...
			// split on space skip first element
			let pulsess = line.split(' ');
			let protocol = pulsess[0];
			pulsess.shift();
			let pulses = Array.from(pulsess, x => Number(x));
			var psi = new PulseSpaceIndex(null);
			psi.microsToPsi(pulses, 'pilight:' + line, 'pilight:' + protocol);
			psi.analyse();
			debug(psi);
		}
	  lc++;
	});
}
