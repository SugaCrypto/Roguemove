import { Card } from "../types";

export type CardBlueprint = Omit<Card, "id">;

export function upgradeCard(card: Card): Card {
  if (card.upgraded) return card;
  const upgraded: Card = { ...card, upgraded: true, name: card.name + "+" };
  // Attack/bash: +50% value (rounded up)
  if (card.type === "attack" || card.type === "bash") {
    upgraded.value = Math.ceil(card.value * 1.5);
    if (card.heal) upgraded.heal = Math.ceil(card.heal * 1.5);
  }
  // Defend: +50% value
  else if (card.type === "defend") {
    upgraded.value = Math.ceil(card.value * 1.5);
  }
  // Skill: cost -1 (min 0) or boost stacks
  else if (card.type === "skill") {
    if (card.cost > 0) upgraded.cost = card.cost - 1;
    if (card.applyToEnemy) upgraded.applyToEnemy = { ...card.applyToEnemy, stacks: card.applyToEnemy.stacks + 2 };
    if (card.applyToSelf) upgraded.applyToSelf = { ...card.applyToSelf, stacks: card.applyToSelf.stacks + 1 };
  }
  // Status stacks boost for attack cards with status
  if ((card.type === "attack" || card.type === "bash") && card.applyToEnemy) {
    upgraded.applyToEnemy = { ...card.applyToEnemy, stacks: card.applyToEnemy.stacks + 1 };
  }
  return upgraded;
}

export const STARTER_DECK: CardBlueprint[] = [
  ...Array(5).fill(null).map(() => ({ name: "Strike", type: "attack" as const, cost: 1, value: 6 })),
  ...Array(4).fill(null).map(() => ({ name: "Defend", type: "defend" as const, cost: 1, value: 5 })),
  { name: "Bash", type: "bash" as const, cost: 2, value: 8 },
];

export const CARD_POOL: CardBlueprint[] = [
  { name: "Whirlwind", type: "attack", cost: 1, value: 4 },
  { name: "Quick Strike", type: "attack", cost: 0, value: 3 },
  { name: "Fireball", type: "attack", cost: 2, value: 14 },
  { name: "Double Strike", type: "attack", cost: 2, value: 5, hits: 2 },
  { name: "Vampiric Strike", type: "attack", cost: 2, value: 8, heal: 4 },
  { name: "Iron Wall", type: "defend", cost: 2, value: 10 },
  { name: "Fortify", type: "defend", cost: 1, value: 7 },
  { name: "Power Bash", type: "bash", cost: 2, value: 12 },
  // Status effect cards
  { name: "Poison Dagger", type: "attack", cost: 1, value: 3, applyToEnemy: { type: "poison", stacks: 3 } },
  { name: "Crippling Blow", type: "attack", cost: 1, value: 5, applyToEnemy: { type: "weak", stacks: 2 } },
  { name: "Expose", type: "bash", cost: 1, value: 3, applyToEnemy: { type: "vulnerable", stacks: 2 } },
  { name: "Battle Cry", type: "skill", cost: 1, value: 0, applyToSelf: { type: "strength", stacks: 2 } },
  { name: "Toxic Cloud", type: "skill", cost: 2, value: 0, applyToEnemy: { type: "poison", stacks: 6 } },
  { name: "Flame Strike", type: "attack", cost: 2, value: 6, applyToEnemy: { type: "burn", stacks: 3 } },
];
