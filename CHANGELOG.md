# Changelog

All notable changes to pulsespaceindex are documented here.

## [Unreleased] - 2026-04-16

### Added
- **Manchester encoding decoder** (`tryManchester`): fully implements G.E. Thomas
  convention (H→L = bit 1, L→H = bit 0) by expanding PSI pairs to a flat
  half-period sequence, stripping the leading preamble, then decoding bit pairs.
  Output is tagged with `:m:` in the `psx` field.
- 2:1 timing ratio guard in `analyse()`: Manchester decoding only triggers when
  `micros[1] / micros[0]` is between 1.7 and 2.3, preventing false positives on
  PWM signals with 3:1 ratios (ev1527, elro, sc2262, etc.).
- Minimum PSI length threshold lowered from 140 to 40 symbols to support shorter
  Manchester packets.

### Changed
- `tryMan` flag enabled (`true`); Manchester result is now used as `psx` when
  decoding succeeds, replacing the generic `psix` path for qualifying signals.

---

## [1.0.0] - 2021-08-23

### Added
- Multi-receiver comparison: RFLINK, Sonoff/Portisch (via Tasmota), and
  Broadlink RM now produce consistent normalised output for the same signal.
- Tasmota/Portisch Sonoff RF Bridge support: parses `AA B1` hex frames,
  converts bucket-indexed data to microsecond arrays via `microsToPsi`.
- NewKaku decoding: bit 0 = `0001`, bit 1 = `0100` (or space-only `01`/`10`).
- Frame header/trailer detection in `detectPS01Values`: identifies sync pulses
  and trailer spaces to split repeated frames and determine `frameCount`.
- `detectPS01Values` extended with `ps01fFrameHT` (header/trailer threshold)
  and per-index distance metrics (`dx`) for frame boundary analysis.
- Experimental Manchester decoding stub (`tryManchester`) targeting Oregon
  Scientific ORSV2 signals.

### Changed
- `analyse()` refactored: `countPulseSpace` → `detectPS01Values` → `psix`
  pipeline with frame-split logic replacing earlier heuristics.
- `psix` output format unified: `${ps01f}:${encoded_data}` with `x` prefix for
  hex-packed nibbles and `c0`/`c-` constant-mode markers.
- `microsToPsi` merge heuristic tuned: spike detection for first pulse, 500 µs
  floor for the first bucket, and weighted-average merging of close values.

### Fixed
- Undefined count entries in `detectPS01Values` no longer crash on sparse PSI.
- `psix` header/data/trailer boundary detection corrected for signals where the
  first pulse index equals the header threshold.

### Security
- Bumped `lodash` 4.17.15 → 4.17.21 (prototype pollution, CVE-2021-23337).
- Bumped `hosted-git-info` 2.8.8 → 2.8.9 (ReDoS, CVE-2021-23362).
- Bumped `path-parse` 1.0.6 → 1.0.7 (ReDoS, CVE-2021-23343).

---

## [0.9.0] - 2020-06-14

### Added
- Frame-length analysis using Excel export (`analyse with excel on length`).
- `countPulseSpace` split out from `analyse` to separate counting from
  PS01 value detection.
- `mergeToIx` helper for mapping raw timing values to bucket indices.

### Changed
- `detectPS01Values` improved: two-pass dominating-count selection with
  accumulated `ps01fCounts`, replacing single-pass heuristic.
- `psix` fixed: `l01t` encoding and `psx` field populated correctly.

### Fixed
- Undefined error in counts array when PSI contains non-contiguous indices.

---

## [0.8.0] - 2020-02-16

### Added
- Broadlink RM sample data from `broadlinkjs-rm` fork.
- RFLink data from Domoticz log files.
- ESLint with airbnb-base config; code formatted to pass linting.
- `readline`-based CSV/text file processing supporting:
  - RFLink `Pulses(uSec)=` format
  - Pilight space-separated microsecond lines
  - Comment lines starting with `#`

### Changed
- `analyse()` refactored into `countPulseSpace` / `detectRepeatedPackages` /
  `detectPS01Values` sub-methods.

---

## [0.1.0] - 2017-11-05

### Added
- Initial ES6 `PulseSpaceIndex` class ported from Arduino C (`pulsespaceindex.h`).
- `microsToPsi`: converts raw microsecond pulse arrays to normalised hex PSI
  strings by clustering timing values into up to 16 buckets.
- `countPulseSpace`: counts per-index occurrences split by pulse and space
  positions.
- `psix`: compact hex encoder mapping PS01 data to nibble-packed output.
- `print`: uniform `;`-separated console output.
- Pimatic sample data (TFA, Velleman, Xiron, Globaltronics, Prologue, etc.).
- Arduino/Nodo reference samples (`samples1.js`, `samples2.js`).
- Original Arduino header file preserved in `arduino/pulsespaceindex.h`.
