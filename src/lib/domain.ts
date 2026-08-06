/**
 * String-union types mirroring the `String` columns in schema.prisma.
 * Prisma does not support native enums on SQLite, so the constraint lives here
 * and is enforced at the application boundary.
 */

export type AchievementMode = "OPEN" | "PERSONAL";

export type AchievementStatus =
  | "ESTIMATING"
  | "ACTIVE"
  | "RESOLVED"
  | "CANCELLED";

export type CompletionStatus = "PENDING" | "VALIDATED" | "REJECTED";

export type ValidationDecision = "VALIDATE" | "REJECT";

export type BetType = "YES_NO" | "WHO";

export type BetStatus = "OPEN" | "RESOLVED" | "REFUNDED";

export const ACHIEVEMENT_MODE_LABELS: Record<AchievementMode, string> = {
  OPEN: "Compétition",
  PERSONAL: "Défi personnel",
};

export const ACHIEVEMENT_STATUS_LABELS: Record<AchievementStatus, string> = {
  ESTIMATING: "Estimation en cours",
  ACTIVE: "En cours",
  RESOLVED: "Terminé",
  CANCELLED: "Annulé",
};

export const COMPLETION_STATUS_LABELS: Record<CompletionStatus, string> = {
  PENDING: "En attente de validation",
  VALIDATED: "Validé",
  REJECTED: "Rejeté",
};

/** A bet's type is always derived from its achievement's mode, never chosen. */
export function betTypeForMode(mode: AchievementMode): BetType {
  return mode === "PERSONAL" ? "YES_NO" : "WHO";
}
