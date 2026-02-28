import { describe, it, expect } from 'vitest'
import { computeCourseHandicap, getStrokesOnHole } from '../handicap'

// ---------------------------------------------------------------------------
// computeCourseHandicap
// ---------------------------------------------------------------------------

describe('computeCourseHandicap', () => {
  // When courseRating === par, the delta term is 0 so CH scales purely by slope.
  it('returns handicapIndex directly when slope=113 and courseRating=par', () => {
    expect(computeCourseHandicap(14.0, 113, 72, 72)).toBe(14)
    expect(computeCourseHandicap(0.0, 113, 72, 72)).toBe(0)
    expect(computeCourseHandicap(36.0, 113, 72, 72)).toBe(36)
  })

  it('rounds to nearest integer', () => {
    // 14.6 * (113/113) + 0 = 14.6 → rounds to 15
    expect(computeCourseHandicap(14.6, 113, 72, 72)).toBe(15)
    // 14.4 * 1 + 0 = 14.4 → rounds to 14
    expect(computeCourseHandicap(14.4, 113, 72, 72)).toBe(14)
  })

  it('scales by slope rating', () => {
    // 14.6 * (130/113) ≈ 16.8 → rounds to 17
    expect(computeCourseHandicap(14.6, 130, 72, 72)).toBe(17)
    // 14.6 * (100/113) ≈ 12.9 → rounds to 13
    expect(computeCourseHandicap(14.6, 100, 72, 72)).toBe(13)
  })

  it('adds course-rating-minus-par delta', () => {
    // 10 * 1 + (72 - 70) = 12
    expect(computeCourseHandicap(10.0, 113, 72, 70)).toBe(12)
    // 10 * 1 + (68 - 72) = 6
    expect(computeCourseHandicap(10.0, 113, 68, 72)).toBe(6)
  })

  it('returns 0 for scratch golfer on standard course', () => {
    expect(computeCourseHandicap(0, 113, 72, 72)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getStrokesOnHole
// ---------------------------------------------------------------------------

describe('getStrokesOnHole', () => {
  // --- null / edge cases ---
  it('returns 0 when strokeIndex is null', () => {
    expect(getStrokesOnHole(18, null, 18)).toBe(0)
    expect(getStrokesOnHole(0, null, 18)).toBe(0)
  })

  it('returns 0 when courseHandicap is 0 (scratch)', () => {
    expect(getStrokesOnHole(0, 1, 18)).toBe(0)
    expect(getStrokesOnHole(0, 18, 18)).toBe(0)
  })

  it('returns 0 when courseHandicap is negative', () => {
    // Plus-handicap players get no strokes
    expect(getStrokesOnHole(-2, 1, 18)).toBe(0)
  })

  // --- 18-hole courses ---
  it('gives 1 stroke on every hole when CH=18 (18-hole)', () => {
    // base = 18/18 = 1, remainder = 0 → all holes get exactly 1 stroke
    for (let si = 1; si <= 18; si++) {
      expect(getStrokesOnHole(18, si, 18)).toBe(1)
    }
  })

  it('gives 2 strokes on SI=1 and 1 stroke on SI>1 when CH=19 (18-hole)', () => {
    // base=1, remainder=1 → extra stroke for SI ≤ 1
    expect(getStrokesOnHole(19, 1, 18)).toBe(2)
    expect(getStrokesOnHole(19, 2, 18)).toBe(1)
    expect(getStrokesOnHole(19, 18, 18)).toBe(1)
  })

  it('gives 2 strokes on all holes when CH=36 (18-hole)', () => {
    // base=2, remainder=0 → 2 strokes everywhere, capped at 2
    for (let si = 1; si <= 18; si++) {
      expect(getStrokesOnHole(36, si, 18)).toBe(2)
    }
  })

  it('gives 1 stroke only on lowest SIs when CH < totalHoles', () => {
    // CH=9, 18-hole: base=0, remainder=9 → stroke on SI ≤ 9, none on SI > 9
    expect(getStrokesOnHole(9, 9, 18)).toBe(1)
    expect(getStrokesOnHole(9, 10, 18)).toBe(0)
    expect(getStrokesOnHole(9, 1, 18)).toBe(1)
  })

  // --- non-18-hole course (10 holes) ---
  it('distributes strokes correctly on a 10-hole course', () => {
    // CH=10, totalHoles=10: base=1, remainder=0 → 1 stroke per hole
    for (let si = 1; si <= 10; si++) {
      expect(getStrokesOnHole(10, si, 10)).toBe(1)
    }
  })

  it('gives 2 strokes on SI=1 for CH=11 on 10-hole course', () => {
    // base=1, remainder=1 → SI ≤ 1 gets extra
    expect(getStrokesOnHole(11, 1, 10)).toBe(2)
    expect(getStrokesOnHole(11, 2, 10)).toBe(1)
  })

  it('gives no strokes when CH < SI on small course', () => {
    // CH=3, 10-hole: base=0, remainder=3 → only SI 1/2/3 get 1 stroke
    expect(getStrokesOnHole(3, 1, 10)).toBe(1)
    expect(getStrokesOnHole(3, 3, 10)).toBe(1)
    expect(getStrokesOnHole(3, 4, 10)).toBe(0)
  })

  // --- cap at 2 ---
  it('never returns more than 2 strokes per hole', () => {
    // Very high CH (e.g. 54) on 18-hole course: base=3, remainder=0 → capped at 2
    expect(getStrokesOnHole(54, 1, 18)).toBe(2)
    expect(getStrokesOnHole(54, 18, 18)).toBe(2)
  })
})
