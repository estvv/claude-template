/**
 * Tunable domain rules. Everything a future "game balance" discussion would
 * touch lives here rather than scattered across server actions.
 */

/** Tokens credited to a member when they join a group. */
export const STARTING_TOKENS = 100;

/**
 * Share of an achievement's base points awarded by arrival rank, in OPEN mode.
 * Matches the example in docs/FEATURES.md: base 50 → 50 / 40 / 25.
 * Ranks past the end of the list use the last value.
 */
export const RANK_MULTIPLIERS = [1, 0.8, 0.5, 0.25];

/** How long the community has to estimate a member-created achievement. */
export const ESTIMATION_WINDOW_HOURS = 48;

/** How long the community has to validate a submitted completion. */
export const VALIDATION_WINDOW_HOURS = 48;

/** Fallback value when an estimation vote closes with no votes at all. */
export const DEFAULT_POINTS = 20;

/** Inactivity threshold before a member gets nudged. */
export const INACTIVITY_REMINDER_DAYS = 30;

export function pointsForRank(basePoints: number, rank: number): number {
  const multiplier =
    RANK_MULTIPLIERS[Math.min(rank, RANK_MULTIPLIERS.length) - 1];
  return Math.round(basePoints * multiplier);
}
