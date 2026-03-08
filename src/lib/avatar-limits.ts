import { getPlanLimits } from "@/lib/plans";

export const FREE_AVATAR_REGENERATIONS = 3;

type Entity = {
  avatarRegenCount: number;
  avatarRegenMonth: string | null;
  avatarRegenCountInMonth: number;
};

/**
 * Whether the user can regenerate an avatar based on plan limits.
 * Free: 3 total. Pro: 10/month. Family: unlimited.
 */
export function canRegenerateAvatar(entity: Entity, plan: string): boolean {
  const limits = getPlanLimits(plan).avatarRegen;
  if (limits.type === "unlimited") return true;
  if (limits.type === "total")
    return entity.avatarRegenCount < limits.max;
  if (limits.type === "perMonth") {
    const thisMonth = getCurrentMonth();
    if (entity.avatarRegenMonth !== thisMonth) return true;
    return entity.avatarRegenCountInMonth < limits.max;
  }
  return false;
}

/** User-facing message when limit reached. */
export function avatarLimitMessage(entity: Entity, plan: string): string {
  if (canRegenerateAvatar(entity, plan)) return "";
  const limits = getPlanLimits(plan).avatarRegen;
  if (limits.type === "total")
    return "You've used your 3 free regenerations. Upgrade to Pro for more.";
  if (limits.type === "perMonth")
    return "You've used your 10 regenerations this month. Resets next month or upgrade to Family for unlimited.";
  return "Avatar regeneration limit reached.";
}

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** After a successful regeneration, return the Prisma update for Dog or CastMember. */
export function getAvatarRegenUpdate(entity: Entity, plan: string): {
  avatarRegenCount: number;
  avatarRegenMonth: string | null;
  avatarRegenCountInMonth: number;
} {
  const thisMonth = getCurrentMonth();
  const limits = getPlanLimits(plan).avatarRegen;
  const newTotal = entity.avatarRegenCount + 1;

  if (limits.type === "perMonth") {
    const sameMonth = entity.avatarRegenMonth === thisMonth;
    return {
      avatarRegenCount: newTotal,
      avatarRegenMonth: thisMonth,
      avatarRegenCountInMonth: sameMonth ? entity.avatarRegenCountInMonth + 1 : 1,
    };
  }
  return {
    avatarRegenCount: newTotal,
    avatarRegenMonth: entity.avatarRegenMonth,
    avatarRegenCountInMonth: entity.avatarRegenCountInMonth,
  };
}
