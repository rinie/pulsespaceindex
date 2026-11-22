# Changelog

All notable changes to pulsespaceindex are documented here.

## [2.0.0] - 2026-11-22

Breaking for library users: `analyse()` no longer prints, and
`microsToPsi()` no longer throws on bad input. Command-line output is
unchanged for all sample files.

### Changed
- **`analyse()` no longer prints.** It returns `psx` and writes nothing to
  stdout; set `DEBUG=psio` to log each result through the `debug` module.
  Library code that relied on the printed line should call `print()` (or use
  `format()`) after `analyse()`. The CLI now calls `print()` itself.
- **`microsToPsi()` rejects bad input** (empty, non-array, NaN, Infinity,
  negative or non-number values) instead of throwing. It returns `false` and
  sets `psi` to `null`; `analyse()` then returns `''`. On valid input it
  returns `true`.
- **ESLint 9 with flat config.** ESLint 8 is end of life and the official
  `eslint-config-airbnb-base` only supports ESLint 7/8, so `.eslintrc.js` is
  replaced by `eslint.config.mjs` using `eslint-config-airbnb-extended/legacy`,
  a port of the same Airbnb base rules. New `npm run lint` script; CI runs it
  before the tests. `arduino/` is not linted.
- **Source and `samples/*.js` pass Airbnb lint.** Formatting fixes, unused
  variables removed, `!=` replaced by `!==`, `continue` removed from the
  Manchester decoders. The exported sample data is unchanged apart from tabs
  replaced by spaces in one pimatic `comment`.
- **rtl_433 C reference files renamed to `.c`.** `samples/rtl_433_ook_pulse_nrz.js`
  and `samples/rtl_433_ook_pulse_pwm.js` held rtl_433 C source, not
  JavaScript; they are now `samples/rtl_433_ook_pulse_nrz.c` and
  `samples/rtl_433_ook_pulse_pwm.c`.

### Added
- **`PulseSpaceIndex.parseLine(line, lineNo)`**: the CLI's text/CSV line
  parsing, now usable and testable on its own.
- **PSI text input** (`samples/kaku.txt`): lines of the older output format
  `<count> , '<psi>' , <n> , <µs0> <µs1> ... , <name>` are analysed directly.
- Tests for `microsToPsi()` input checks, `parseLine()` and the CLI on
  `samples/kaku.txt` and `samples/debugkaku20210823.csv` (32 tests in total).

### Removed
- The undocumented `sxAdd()` method. It is replaced by a module-level psx
  builder used by `psix()`, `tryManchester()` and `tryDifferentialManchester()`.

### Fixed
- `samples/kaku.txt` and `samples/debugkaku20210823.csv` no longer crash the
  CLI. Lines in the current output format (`<count> <µs,...> '<psx>' ...`) are
  skipped with one summary on stderr, since psx is a result, not pulse data.
  Other unrecognised lines are skipped with a per-line warning on stderr.
- An RFLink line without `Pulses(uSec)=` or a Portisch `AA B1` line without the
  closing `55` is skipped with a warning instead of crashing.

---

## [1.1.0] - 2026-11-06

### Added
- **Manchester encoding decoder** (`tryManchester`): fully implements G.E. Thomas
  convention (H→L = bit 1, L→H = bit 0) by expanding PSI pairs to a flat
  half-period sequence, stripping the leading preamble, then decoding bit pairs.
  Output is tagged with `:m:` in the `psx` field.
- **Differential Manchester decoder** (`tryDifferentialManchester`): biphase-mark
  encoding — mandatory clock-boundary transition, same-polarity pair = bit 1,
  different-polarity pair = bit 0. Tried as fallback when standard Manchester
  returns null. Output tagged with `:dm:`.
- 2:1 timing ratio guard in `analyse()`: Manchester decoding only triggers when
  `micros[1] / micros[0]` is between 1.7 and 2.3, preventing false positives on
  PWM signals with 3:1 ratios (ev1527, elro, sc2262, etc.).
- Minimum PSI length threshold lowered from 140 to 40 symbols to support shorter
  Manchester packets.
- **`format()` method**: returns the uniform output string
  (`<count> [<micros>] '<psx>' <signalType>`) without side-effects, making
  programmatic use and testing straightforward. `print()` now delegates to it.
- **`tryMan` constructor option**: 5th parameter (default `true`) replaces the
  module-level constant, allowing per-instance Manchester decoding control.
- **ES6 module export**: `module.exports = PulseSpaceIndex` added so the file can
  be `require()`d as a library without crashing on import.
- **CLI improvements**: `--help`/`-h` and `--version`/`-v` flags; input path
  resolved with `path.resolve()` so relative paths work from any cwd.
- **Unit tests** (`test.js`): 18 tests via Node's built-in `node:test` covering
  constructor, `countPulseSpace`, `microsToPsi`, `format`, `analyse`,
  `tryManchester`, and `tryDifferentialManchester`.
- **CI** (`.github/workflows/ci.yml`): runs `npm test` on Node 22 and 24 for
  every push and pull request.
- **JSDoc** on all public API members: class, constructor, `microsToPsi`,
  `analyse`, `format`, `print`, `tryManchester`, `tryDifferentialManchester`.

### Changed
- `tryMan` flag enabled (`true`) by default; Manchester result is used as `psx`
  when decoding succeeds, replacing the generic `psix` path for qualifying signals.
- CI matrix updated to Node 22.x (Maintenance LTS) and 24.x (Active LTS),
  dropping EOL 18.x and 20.x.

### Security
- Bumped `debug` 3.x → 4.4.0.
- Bumped `eslint` 5.x → 8.57.0 and `eslint-config-airbnb-base` 13.x → 15.0.0.
- Bumped `js-yaml` 4.1.1 → 4.3.2 (CPU DoS via YAML merge sequences,
  back-ported from v5).

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
