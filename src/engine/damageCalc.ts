import { StatusEffect } from "../types";

export interface DamageResult {
  hpDamage: number;
  blockConsumed: number;
  remainingBlock: number;
}

function getStacks(statuses: StatusEffect[], type: string): number {
  return statuses.find(s => s.type === type)?.stacks ?? 0;
}

export function calcAttackDamage(
  baseDamage: number,
  hits: number,
  targetBlock: number,
  attackerStatuses: StatusEffect[] = [],
  targetStatuses: StatusEffect[] = [],
): DamageResult {
  const strength = getStacks(attackerStatuses, "strength");
  const isWeak = getStacks(attackerStatuses, "weak") > 0;
  const isVulnerable = getStacks(targetStatuses, "vulnerable") > 0;

  let dmgPerHit = baseDamage + strength;
  if (isWeak) dmgPerHit = Math.floor(dmgPerHit * 0.75);
  if (isVulnerable) dmgPerHit = Math.floor(dmgPerHit * 1.5);

  const total = Math.max(0, dmgPerHit * hits);
  const blockConsumed = Math.min(targetBlock, total);
  const hpDamage = total - blockConsumed;
  return { hpDamage, blockConsumed, remainingBlock: targetBlock - blockConsumed };
}
