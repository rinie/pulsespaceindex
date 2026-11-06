'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const PulseSpaceIndex = require('./pulsespaceindex');

// --- constructor ---

test('constructor sets defaults', () => {
  const p = new PulseSpaceIndex('0101');
  assert.equal(p.count, 4);
  assert.equal(p.psx, null);
  assert.equal(p.ps01f, '000000');
  assert.equal(p.signalType, 'ook433');
  assert.equal(p.tryMan, true);
});

test('constructor accepts tryMan=false', () => {
  const p = new PulseSpaceIndex('0101', null, 1, 'ook433', false);
  assert.equal(p.tryMan, false);
});

test('constructor with null psi sets count null', () => {
  const p = new PulseSpaceIndex(null);
  assert.equal(p.count, null);
});

// --- countPulseSpace ---

test('countPulseSpace tallies pulse and space indices', () => {
  const p = new PulseSpaceIndex('00010001');
  p.countPulseSpace();
  assert.ok(p.counts[0].ct[0] > 0, 'pulse index 0 counted');
  assert.ok(p.counts[1].ct[1] > 0, 'space index 1 counted');
  assert.equal(p.pi, '0000');
  assert.equal(p.si, '0101');
});

// --- microsToPsi ---

test('microsToPsi clusters timing values and builds psi', () => {
  const p = new PulseSpaceIndex(null);
  // alternating T=500µs (idx 0) and 3T=1500µs (idx 1) spaces
  p.microsToPsi(
    [500, 1500, 500, 1500, 500, 1500, 500, 1500],
    'test', 'test'
  );
  assert.equal(p.micros.length, 2);
  assert.equal(p.psi, '01010101');
});

test('microsToPsi handles single-value signal', () => {
  const p = new PulseSpaceIndex(null);
  p.microsToPsi([500, 500, 500, 500], 'test', 'test');
  assert.equal(p.micros.length, 1);
  assert.equal(p.psi, '0000');
});

// --- format ---

test('format returns a non-empty string', () => {
  const p = new PulseSpaceIndex('00010001', null, 1, 'ook433');
  p.analyse();
  const f = p.format();
  assert.ok(typeof f === 'string' && f.length > 0, 'format returns non-empty string');
});

test('format includes psx and signalType', () => {
  const p = new PulseSpaceIndex('00010001', null, 1, 'ook433');
  p.analyse();
  const f = p.format();
  assert.ok(f.includes(`'${p.psx}'`), 'format includes psx');
  assert.ok(f.includes('ook433'), 'format includes signalType');
});

test('format includes micros when present', () => {
  const p = new PulseSpaceIndex(null);
  p.microsToPsi([500, 1500, 500, 1500, 500, 1500, 500, 1500], 'test', 'test');
  p.analyse();
  const f = p.format();
  assert.ok(f.includes('500'), 'format includes micros values');
});

// --- analyse ---

test('analyse sets psx for simple PDM signal', () => {
  const p = new PulseSpaceIndex('00010001', null, 1, 'ook433');
  p.analyse();
  assert.ok(p.psx !== null, 'psx is set');
  assert.match(p.psx, /^\d{6}:/, 'psx starts with ps01f prefix');
});

test('analyse does not set psx containing :m: when tryMan=false', () => {
  // PSI that qualifies for Manchester: ps01f "0011", length>=40, ratio ~2
  const psi = '000001111111'.repeat(4); // 48 chars
  const micros = [500, 1000]; // ratio 2.0
  const p = new PulseSpaceIndex(psi, micros, 1, 'ook433', false);
  p.analyse();
  assert.ok(p.psx !== null);
  assert.ok(!p.psx.includes(':m:') && !p.psx.includes(':dm:'), 'Manchester skipped');
});

test('analyse uses Manchester when tryMan=true and ratio qualifies', () => {
  const psi = '000001111111'.repeat(4); // 48 chars
  const micros = [500, 1000]; // ratio 2.0
  const p = new PulseSpaceIndex(psi, micros, 1, 'ook433', true);
  p.analyse();
  assert.ok(p.psx !== null);
  // Expect Manchester or Differential Manchester tag in result
  assert.ok(p.psx.includes(':m:') || p.psx.includes(':dm:'), 'Manchester used');
});

// --- tryManchester ---

test('tryManchester returns null when ps01f is not 0011', () => {
  const p = new PulseSpaceIndex('0101');
  assert.equal(p.tryManchester('0101', '010100'), null);
});

test('tryManchester returns null for single pair (too short for data)', () => {
  const p = new PulseSpaceIndex('00');
  assert.equal(p.tryManchester('00', '0011'), null);
});

test('tryManchester decodes a known Manchester sequence', () => {
  // PSI "000001111111": 2 preamble "00" pairs + boundary "01" + three "11" pairs
  // Expands to half-periods, preamble consumes 3 H,L pairs, then decodes 6 bits: 010101
  const p = new PulseSpaceIndex('000001111111');
  const result = p.tryManchester('000001111111', '0011');
  assert.ok(result !== null, 'should decode');
  assert.match(result, /^0011:m:/, 'tagged as Manchester');
});

// --- tryDifferentialManchester ---

test('tryDifferentialManchester returns null when ps01f is not 0011', () => {
  const p = new PulseSpaceIndex('0011');
  assert.equal(p.tryDifferentialManchester('0011', '010100'), null);
});

test('tryDifferentialManchester returns null for single pair', () => {
  const p = new PulseSpaceIndex('00');
  assert.equal(p.tryDifferentialManchester('00', '0011'), null);
});

test('tryDifferentialManchester decodes a known DM sequence', () => {
  // PSI "0011": "00" → H,L; "11" → H,H,L,L
  // half=[H,L,H,H,L,L], no same-polarity preamble, decodes bits 0,1,1
  const p = new PulseSpaceIndex('0011');
  const result = p.tryDifferentialManchester('0011', '0011');
  assert.equal(result, '0011:dm:011');
});
