import { Card, StatusType } from "./types";

const STATUS_ICONS: Record<StatusType, string> = {
  poison: "☠", strength: "💪", weak: "📉", vulnerable: "🎯", burn: "🔥",
};

export function cardValueLabel(card: Card): string {
  const parts: string[] = [];
  if (card.type === "defend") parts.push(`DEF ${card.value}`);
  else if (card.type === "skill") { /* no base value */ }
  else if (card.hits) parts.push(`DMG ${card.value}×${card.hits}`);
  else if (card.value > 0) parts.push(`DMG ${card.value}`);
  if (card.heal) parts.push(`HP+${card.heal}`);
  if (card.applyToEnemy) parts.push(`${STATUS_ICONS[card.applyToEnemy.type]}${card.applyToEnemy.stacks}`);
  if (card.applyToSelf) parts.push(`${STATUS_ICONS[card.applyToSelf.type]}+${card.applyToSelf.stacks}`);
  return parts.join(" / ") || "SKILL";
}

export function cardIcon(card: Card): string {
  if (card.type === "attack") return "⚔️";
  if (card.type === "defend") return "🛡";
  if (card.type === "skill") return "✦";
  return "💥";
}

export function statusIcon(type: StatusType): string {
  return STATUS_ICONS[type];
}
