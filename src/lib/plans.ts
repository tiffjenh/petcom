/**
 * Pricing & subscription tier limits.
 * Free | Pro ($9.99/mo) | Family ($19.99/mo)
 */

export type PlanId = "free" | "pro" | "family";

export type AvatarRegenLimit =
  | { type: "total"; max: number }
  | { type: "perMonth"; max: number }
  | { type: "unlimited" };

export type PlanLimits = {
  maxDogs: number;
  maxCastMembers: number;
  maxEpisodesPerWeek: number;
  /** Free: 7; Pro/Family: unlimited (use a large number or filter by "all") */
  episodeArchiveDays: number | null;
  maxComedyStylePicks: number;
  hdDownload: boolean;
  removeWatermark: boolean;
  avatarRegen: AvatarRegenLimit;
  socialSharing: boolean;
  priorityGeneration: boolean;
};

const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    maxDogs: 1,
    maxCastMembers: 2,
    maxEpisodesPerWeek: 3,
    episodeArchiveDays: 7,
    maxComedyStylePicks: 1,
    hdDownload: false,
    removeWatermark: false,
    avatarRegen: { type: "total", max: 3 },
    socialSharing: true,
    priorityGeneration: false,
  },
  pro: {
    maxDogs: 3,
    maxCastMembers: 6,
    maxEpisodesPerWeek: 7,
    episodeArchiveDays: null,
    maxComedyStylePicks: 3,
    hdDownload: true,
    removeWatermark: true,
    avatarRegen: { type: "perMonth", max: 10 },
    socialSharing: true,
    priorityGeneration: true,
  },
  family: {
    maxDogs: 6,
    maxCastMembers: 12,
    maxEpisodesPerWeek: 7,
    episodeArchiveDays: null,
    maxComedyStylePicks: 3,
    hdDownload: true,
    removeWatermark: true,
    avatarRegen: { type: "unlimited" },
    socialSharing: true,
    priorityGeneration: true,
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  const key = plan === "pro" || plan === "family" ? plan : "free";
  return PLANS[key];
}

export function getPlanId(plan: string | null | undefined): PlanId {
  return plan === "pro" || plan === "family" ? plan : "free";
}

/** Price in dollars (display). */
export const PLAN_PRICES: Record<PlanId, string> = {
  free: "$0",
  pro: "$9.99",
  family: "$19.99",
};
