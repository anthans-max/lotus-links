import { describe, it, expect } from 'vitest'
import {
  computeStablefordPoints,
  parseStablefordConfig,
  DEFAULT_STABLEFORD_CONFIG,
  type StablefordPointsConfig,
} from '../stableford'

// ---------------------------------------------------------------------------
// computeStablefordPoints — default config
// ---------------------------------------------------------------------------

describe('computeStablefordPoints (default config)', () => {
  const cfg = DEFAULT_STABLEFORD_CONFIG

  it('albatross (−3 or better net): par 4, gross 1, 0 strokes', () => {
    expect(computeStablefordPoints(1, 4, 0, cfg)).toBe(20)
  })

  it('albatross at exactly −3', () => {
    // gross 3, par 6, 0 strokes → net=3, relative=−3
    expect(computeStablefordPoints(3, 6, 0, cfg)).toBe(20)
  })

  it('albatross boundary: −4 net still scores albatross', () => {
    // gross 1, par 5 → relative=−4 ≤ −3
    expect(computeStablefordPoints(1, 5, 0, cfg)).toBe(20)
  })

  it('eagle (−2 net): par 4, gross 2, 0 strokes', () => {
    expect(computeStablefordPoints(2, 4, 0, cfg)).toBe(10)
  })

  it('birdie (−1 net): par 4, gross 3, 0 strokes', () => {
    expect(computeStablefordPoints(3, 4, 0, cfg)).toBe(5)
  })

  it('par (0 net): par 4, gross 4, 0 strokes', () => {
    expect(computeStablefordPoints(4, 4, 0, cfg)).toBe(3)
  })

  it('bogey (+1 net): par 4, gross 5, 0 strokes', () => {
    expect(computeStablefordPoints(5, 4, 0, cfg)).toBe(1)
  })

  it('double bogey (+2 net): par 4, gross 6, 0 strokes', () => {
    expect(computeStablefordPoints(6, 4, 0, cfg)).toBe(0)
  })

  it('triple bogey (+3 net): par 4, gross 7, 0 strokes', () => {
    expect(computeStablefordPoints(7, 4, 0, cfg)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// computeStablefordPoints — with handicap strokes received
// ---------------------------------------------------------------------------

describe('computeStablefordPoints with stroke allocation', () => {
  const cfg = DEFAULT_STABLEFORD_CONFIG

  it('gross bogey + 1 handicap stroke = net par → 3 pts', () => {
    // gross 5, par 4, 1 stroke → netScore=4, relative=0
    expect(computeStablefordPoints(5, 4, 1, cfg)).toBe(3)
  })

  it('gross double-bogey + 2 handicap strokes = net par → 3 pts', () => {
    // gross 6, par 4, 2 strokes → netScore=4, relative=0
    expect(computeStablefordPoints(6, 4, 2, cfg)).toBe(3)
  })

  it('gross par + 1 stroke = net birdie → 5 pts', () => {
    // gross 4, par 4, 1 stroke → netScore=3, relative=−1
    expect(computeStablefordPoints(4, 4, 1, cfg)).toBe(5)
  })

  it('gross eagle + 1 stroke = net albatross → 20 pts', () => {
    // gross 2, par 5, 1 stroke → netScore=1, relative=−4
    expect(computeStablefordPoints(2, 5, 1, cfg)).toBe(20)
  })

  it('gross par3 ace + 0 strokes = net eagle on par-3 → 10 pts', () => {
    // gross 1, par 3, 0 strokes → netScore=1, relative=−2
    expect(computeStablefordPoints(1, 3, 0, cfg)).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// computeStablefordPoints — custom config (verify engine uses passed-in values)
// ---------------------------------------------------------------------------

describe('computeStablefordPoints (custom config)', () => {
  // Classic PGA-Tour style Stableford (target: birdie=5, par=2, bogey=-1 …)
  // We use positive-only values to stay within type contract.
  const custom: StablefordPointsConfig = {
    double_bogey_or_worse: 0,
    bogey: 1,
    par: 2,    // ≠ default (3)
    birdie: 4, // ≠ default (5)
    eagle: 8,  // ≠ default (10)
    albatross: 16, // ≠ default (20)
  }

  it('uses custom par value (2), not the default (3)', () => {
    expect(computeStablefordPoints(4, 4, 0, custom)).toBe(2)
  })

  it('uses custom birdie value (4), not the default (5)', () => {
    expect(computeStablefordPoints(3, 4, 0, custom)).toBe(4)
  })

  it('uses custom eagle value (8), not the default (10)', () => {
    expect(computeStablefordPoints(2, 4, 0, custom)).toBe(8)
  })

  it('uses custom albatross value (16), not the default (20)', () => {
    expect(computeStablefordPoints(1, 4, 0, custom)).toBe(16)
  })

  it('double-bogey still returns custom 0', () => {
    expect(computeStablefordPoints(6, 4, 0, custom)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// parseStablefordConfig
// ---------------------------------------------------------------------------

describe('parseStablefordConfig', () => {
  it('returns DEFAULT_STABLEFORD_CONFIG for null', () => {
    expect(parseStablefordConfig(null)).toEqual(DEFAULT_STABLEFORD_CONFIG)
  })

  it('returns DEFAULT_STABLEFORD_CONFIG for undefined', () => {
    expect(parseStablefordConfig(undefined)).toEqual(DEFAULT_STABLEFORD_CONFIG)
  })

  it('returns DEFAULT_STABLEFORD_CONFIG for an array', () => {
    expect(parseStablefordConfig([1, 2, 3])).toEqual(DEFAULT_STABLEFORD_CONFIG)
  })

  it('returns DEFAULT_STABLEFORD_CONFIG for a string', () => {
    expect(parseStablefordConfig('{"par":3}')).toEqual(DEFAULT_STABLEFORD_CONFIG)
  })

  it('parses a fully valid config object', () => {
    const raw = {
      double_bogey_or_worse: 0,
      bogey: 1,
      par: 2,
      birdie: 4,
      eagle: 8,
      albatross: 16,
    }
    expect(parseStablefordConfig(raw)).toEqual(raw)
  })

  it('falls back to defaults for missing keys', () => {
    const partial = { birdie: 7 }
    const result = parseStablefordConfig(partial)
    expect(result.birdie).toBe(7)
    expect(result.par).toBe(DEFAULT_STABLEFORD_CONFIG.par)
    expect(result.bogey).toBe(DEFAULT_STABLEFORD_CONFIG.bogey)
  })

  it('falls back to default for a negative value', () => {
    const result = parseStablefordConfig({ par: -1 })
    expect(result.par).toBe(DEFAULT_STABLEFORD_CONFIG.par)
  })

  it('falls back to default for a non-integer value', () => {
    const result = parseStablefordConfig({ birdie: 5.5 })
    expect(result.birdie).toBe(DEFAULT_STABLEFORD_CONFIG.birdie)
  })

  it('falls back to default for a string value', () => {
    const result = parseStablefordConfig({ par: '3' })
    expect(result.par).toBe(DEFAULT_STABLEFORD_CONFIG.par)
  })

  it('returns a fresh copy (does not mutate DEFAULT_STABLEFORD_CONFIG)', () => {
    const result = parseStablefordConfig(null)
    result.par = 999
    expect(DEFAULT_STABLEFORD_CONFIG.par).toBe(3)
  })
})
