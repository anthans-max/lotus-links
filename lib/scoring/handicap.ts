/**
 * USGA handicap utilities — pure functions, no side effects.
 *
 * References:
 *   USGA Course Handicap™ formula:
 *   Course Handicap = ROUND( Handicap Index × (Slope Rating ÷ 113) + (Course Rating − Par) )
 *
 *   Stroke allocation (per USGA Rules of Handicapping Section 9):
 *   A player receives 1 stroke on each hole whose Stroke Index ≤ Course Handicap.
 *   If Course Handicap > totalHoles: player receives 2 strokes on holes whose
 *   Stroke Index ≤ (Course Handicap − totalHoles), plus 1 stroke on the rest.
 *
 * Note: "Stroke Index" (SI) = the `handicap` field in the `holes` table.
 * For non-18-hole courses the same formula applies with `totalHoles` substituted
 * for 18, distributing strokes proportionally across the round.
 */

/**
 * Compute Course Handicap from a player's Handicap Index.
 *
 * @param handicapIndex  Player's USGA Handicap Index (e.g. 14.6)
 * @param slopeRating    Course slope rating (standard = 113)
 * @param courseRating   Course rating (strokes for a scratch golfer)
 * @param par            Course par
 * @returns              Integer Course Handicap
 */
export function computeCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  const raw = handicapIndex * (slopeRating / 113) + (courseRating - par)
  return Math.round(raw)
}

/**
 * Returns the number of handicap strokes a player receives on a specific hole.
 *
 * Works for any hole count (9, 10, 18, etc.) by scaling the stroke allocation
 * proportionally: base strokes = floor(courseHandicap / totalHoles), with
 * extra strokes distributed to holes with the lowest Stroke Indexes.
 *
 * @param courseHandicap  Computed integer Course Handicap (may be 0 for scratch)
 * @param strokeIndex     The hole's Stroke Index (1 = hardest). Null → 0 strokes.
 * @param totalHoles      Number of holes in the round (default 18)
 * @returns               0, 1, or 2 strokes received on this hole
 */
export function getStrokesOnHole(
  courseHandicap: number,
  strokeIndex: number | null,
  totalHoles = 18
): 0 | 1 | 2 {
  if (strokeIndex == null || courseHandicap <= 0 || totalHoles === 0) return 0
  const base = Math.floor(courseHandicap / totalHoles)
  const remainder = courseHandicap % totalHoles
  const extra = strokeIndex <= remainder ? 1 : 0
  return Math.min(2, base + extra) as 0 | 1 | 2
}
