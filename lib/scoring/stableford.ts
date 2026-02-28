/**
 * Stableford scoring utilities — pure functions, no side effects.
 *
 * Point values per outcome are configurable at the tournament level.
 * Pass a StablefordPointsConfig to computeStablefordPoints; the function
 * never reads from any global or default state.
 */

export interface StablefordPointsConfig {
  /** Net Double Bogey (+2) or worse */
  double_bogey_or_worse: number
  /** Net Bogey (+1) */
  bogey: number
  /** Net Par (0) */
  par: number
  /** Net Birdie (−1) */
  birdie: number
  /** Net Eagle (−2) */
  eagle: number
  /** Net Albatross (−3 or better) */
  albatross: number
}

/**
 * Default point values per the standard modified Stableford scale used in this
 * application.  These match the CLAUDE.md spec and are used when no tournament-
 * specific config has been saved.
 */
export const DEFAULT_STABLEFORD_CONFIG: StablefordPointsConfig = {
  double_bogey_or_worse: 0,
  bogey: 1,
  par: 3,
  birdie: 5,
  eagle: 10,
  albatross: 20,
}

/**
 * Compute Stableford points earned on a single hole.
 *
 * The net score (gross − strokesReceived) is compared to par to determine
 * the outcome tier, then the configured point value for that tier is returned.
 *
 * @param grossScore       Actual strokes taken on the hole
 * @param par              Par for this hole
 * @param strokesReceived  Handicap strokes received on this hole (0 | 1 | 2)
 * @param pointsConfig     Tournament-level point values per outcome tier
 * @returns                Points earned (non-negative integer)
 */
export function computeStablefordPoints(
  grossScore: number,
  par: number,
  strokesReceived: number,
  pointsConfig: StablefordPointsConfig
): number {
  const netScore = grossScore - strokesReceived
  const relative = netScore - par // negative = under par

  if (relative <= -3) return pointsConfig.albatross
  if (relative === -2) return pointsConfig.eagle
  if (relative === -1) return pointsConfig.birdie
  if (relative === 0) return pointsConfig.par
  if (relative === 1) return pointsConfig.bogey
  return pointsConfig.double_bogey_or_worse
}

/**
 * Parse a raw JSONB value from Supabase into a validated StablefordPointsConfig.
 * Falls back to DEFAULT_STABLEFORD_CONFIG for any missing or invalid keys.
 */
export function parseStablefordConfig(raw: unknown): StablefordPointsConfig {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_STABLEFORD_CONFIG }
  }
  const obj = raw as Record<string, unknown>
  const safe = (key: keyof StablefordPointsConfig): number => {
    const v = obj[key]
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return v
    return DEFAULT_STABLEFORD_CONFIG[key]
  }
  return {
    double_bogey_or_worse: safe('double_bogey_or_worse'),
    bogey: safe('bogey'),
    par: safe('par'),
    birdie: safe('birdie'),
    eagle: safe('eagle'),
    albatross: safe('albatross'),
  }
}
