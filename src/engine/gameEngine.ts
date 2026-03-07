import { Card, GameState, StatusEffect, StatusType } from "../types";
import { ENEMIES } from "../data/enemies";
import { STARTER_DECK, CARD_POOL, upgradeCard } from "../data/cards";
import { calcAttackDamage } from "./damageCalc";

// ---- ステータス効果 ----

function addStatus(statuses: StatusEffect[], type: StatusType, stacks: number): StatusEffect[] {
  const existing = statuses.find(s => s.type === type);
  if (existing) {
    return statuses.map(s => s.type === type ? { ...s, stacks: s.stacks + stacks } : s);
  }
  return [...statuses, { type, stacks }];
}

function tickStatuses(statuses: StatusEffect[]): { statuses: StatusEffect[]; poisonDmg: number; burnDmg: number } {
  let poisonDmg = 0;
  let burnDmg = 0;
  const next: StatusEffect[] = [];
  for (const s of statuses) {
    if (s.type === "poison") {
      poisonDmg += s.stacks;
      if (s.stacks > 1) next.push({ ...s, stacks: s.stacks - 1 });
    } else if (s.type === "burn") {
      burnDmg += s.stacks;
      next.push(s); // burn doesn't decay
    } else if (s.type === "weak" || s.type === "vulnerable") {
      if (s.stacks > 1) next.push({ ...s, stacks: s.stacks - 1 });
    } else {
      next.push(s); // strength persists
    }
  }
  return { statuses: next, poisonDmg, burnDmg };
}

// ---- ユーティリティ ----

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function drawHand(deck: Card[], discard: Card[], nextId: () => number, handSize = 5) {
  let d = [...deck];
  let dis = [...discard];
  if (d.length < handSize) {
    d = shuffle([...d, ...dis.map(c => ({ ...c, id: nextId() }))]);
    dis = [];
  }
  const hand = d.splice(0, handSize);
  return { hand, deck: d, discard: dis };
}

export function getRewardCards(nextId: () => number): Card[] {
  return shuffle([...CARD_POOL]).slice(0, 3).map(c => ({ ...c, id: nextId() }));
}

// ---- ゲーム初期化 ----

export function createGame(nextId: () => number): GameState {
  const first = ENEMIES[0];
  const allCards = shuffle(STARTER_DECK.map(c => ({ ...c, id: nextId() })));
  const { hand, deck, discard } = drawHand(allCards, [], nextId);
  return {
    phase: "start",
    heroHp: 80, heroMaxHp: 80, heroShield: 0,
    energy: 3, maxEnergy: 3,
    enemyHp: first.hp, enemyMaxHp: first.hp, enemyBlock: 0, enemyPatternIdx: 0,
    floorNum: 0, hand, deck, discard,
    log: ["✕ Floor 1 — SLIMEが現れた！"], turn: 1, rewardCards: [],
    heroStatuses: [], enemyStatuses: [],
    relics: [],
    stats: { totalDamage: 0, cardsPlayed: 0, turnsTotal: 0, enemiesKilled: 0 },
  };
}

// ---- フロア進行 ----

export function advanceFloor(
  prev: GameState, nextId: () => number, extraHp = 0, extraCard?: Card
): GameState {
  const nextFloor = prev.floorNum + 1;
  if (nextFloor >= ENEMIES.length) return { ...prev, phase: "win", rewardCards: [] };
  const next = ENEMIES[nextFloor];
  let pool = [...prev.deck, ...prev.discard, ...prev.hand];

  // Molten Egg: auto-upgrade attack cards on acquisition
  if (extraCard) {
    let newCard = { ...extraCard, id: nextId() };
    if (prev.relics.includes("molten_egg") && (newCard.type === "attack" || newCard.type === "bash") && !newCard.upgraded) {
      newCard = upgradeCard(newCard);
    }
    pool.push(newCard);
  }

  const drawn = drawHand(shuffle(pool), [], nextId);
  const healLog = extraHp > 0 ? [`💚 HP+${extraHp}回復！`] : [];

  // Burning Blood: +6 HP after combat
  let hp = Math.min(prev.heroMaxHp, prev.heroHp + extraHp);
  if (prev.relics.includes("burning_blood")) {
    hp = Math.min(prev.heroMaxHp, hp + 6);
    healLog.push("🩸 Burning Blood: HP+6");
  }

  // Bag of Marbles: apply vulnerable 1 to enemy at start
  const enemyStatuses: StatusEffect[] = [];
  if (prev.relics.includes("bag_of_marbles")) {
    enemyStatuses.push({ type: "vulnerable", stacks: 1 });
  }

  return {
    ...prev, phase: "battle",
    heroHp: hp,
    enemyHp: next.hp, enemyMaxHp: next.hp, enemyBlock: 0, enemyPatternIdx: 0,
    heroShield: 0, floorNum: nextFloor,
    hand: drawn.hand, deck: drawn.deck, discard: [],
    log: [...prev.log, ...healLog, `✕ Floor ${nextFloor + 1} — ${next.name}が現れた！`],
    turn: 1, energy: prev.maxEnergy, rewardCards: [],
    heroStatuses: [], enemyStatuses,
  };
}

// ---- カードプレイ ----

export interface PlayCardResult {
  state: GameState;
  damageDealt: number;
  healAmount: number;
  shieldGained: number;
  enemyKilled: boolean;
}

export function playCard(prev: GameState, card: Card): PlayCardResult {
  if (prev.phase !== "battle" || prev.energy < card.cost) {
    return { state: prev, damageDealt: 0, healAmount: 0, shieldGained: 0, enemyKilled: false };
  }
  const enemy = ENEMIES[Math.min(prev.floorNum, ENEMIES.length - 1)];
  let { energy, heroShield, enemyHp, heroHp, enemyBlock } = prev;
  let heroStatuses = [...prev.heroStatuses];
  let enemyStatuses = [...prev.enemyStatuses];
  energy -= card.cost;
  const newHand = prev.hand.filter(c => c.id !== card.id);
  let newLog = [...prev.log];
  let damageDealt = 0;
  let healAmount = 0;
  let shieldGained = 0;

  if (card.type === "attack" || card.type === "bash") {
    const hits = card.hits ?? 1;
    const result = calcAttackDamage(card.value, hits, enemyBlock, heroStatuses, enemyStatuses);
    enemyBlock = result.remainingBlock;
    enemyHp = Math.max(0, enemyHp - result.hpDamage);
    damageDealt = result.hpDamage;
    const label = hits > 1 ? `${card.value}×${hits}` : `${result.hpDamage + result.blockConsumed}`;
    newLog.push(`⚔ ${card.name} → ${enemy.name}に${label}ダメージ！`);
    if (card.heal && result.hpDamage > 0) {
      heroHp = Math.min(prev.heroMaxHp, heroHp + card.heal);
      healAmount = card.heal;
      newLog.push(`💚 吸血！HP+${card.heal}回復`);
    }
  } else if (card.type === "defend") {
    heroShield += card.value;
    shieldGained = card.value;
    newLog.push(`🛡 ${card.name} → シールド+${card.value}`);
  }
  // skill type: no damage, no shield (effects only via applyToSelf/applyToEnemy)

  // Apply status effects from card
  if (card.applyToEnemy) {
    enemyStatuses = addStatus(enemyStatuses, card.applyToEnemy.type, card.applyToEnemy.stacks);
    newLog.push(`☠ ${enemy.name}に${statusLabel(card.applyToEnemy.type)}${card.applyToEnemy.stacks}付与！`);
  }
  if (card.applyToSelf) {
    heroStatuses = addStatus(heroStatuses, card.applyToSelf.type, card.applyToSelf.stacks);
    newLog.push(`✦ ${statusLabel(card.applyToSelf.type)}${card.applyToSelf.stacks}を獲得！`);
  }

  const enemyKilled = enemyHp <= 0;
  const phase = enemyKilled ? "next_enemy" : prev.phase;
  if (enemyKilled) newLog.push(`✕ ${enemy.name}を倒した！`);

  const stats = {
    ...prev.stats,
    totalDamage: prev.stats.totalDamage + damageDealt,
    cardsPlayed: prev.stats.cardsPlayed + 1,
    enemiesKilled: prev.stats.enemiesKilled + (enemyKilled ? 1 : 0),
  };

  return {
    state: {
      ...prev, energy, heroShield, enemyHp, heroHp, enemyBlock,
      hand: newHand, discard: [...prev.discard, card], log: newLog, phase,
      heroStatuses, enemyStatuses, stats,
    },
    damageDealt, healAmount, shieldGained, enemyKilled,
  };
}

function statusLabel(type: StatusType): string {
  switch (type) {
    case "poison": return "毒";
    case "strength": return "筋力";
    case "weak": return "弱体";
    case "vulnerable": return "脆弱";
    case "burn": return "火傷";
  }
}

// ---- ターン終了（敵行動） ----

export interface EndTurnResult {
  state: GameState;
  enemyAction: { type: string; value: number };
  damageToHero: number;
  enemyHeal: number;
  enemyBlockGained: number;
  heroDefeated: boolean;
  poisonDmgToEnemy: number;
  poisonDmgToHero: number;
}

export function endTurn(prev: GameState, nextId: () => number): EndTurnResult {
  if (prev.phase !== "battle") {
    return {
      state: prev, enemyAction: { type: "none", value: 0 },
      damageToHero: 0, enemyHeal: 0, enemyBlockGained: 0, heroDefeated: false,
      poisonDmgToEnemy: 0, poisonDmgToHero: 0,
    };
  }
  const enemy = ENEMIES[Math.min(prev.floorNum, ENEMIES.length - 1)];
  const action = enemy.pattern[prev.enemyPatternIdx % enemy.pattern.length];
  const nextIdx = (prev.enemyPatternIdx + 1) % enemy.pattern.length;
  let { heroHp, heroShield, enemyHp } = prev;
  let heroStatuses = [...prev.heroStatuses];
  let enemyStatuses = [...prev.enemyStatuses];
  let enemyBlock = 0;
  let newLog = [...prev.log];
  let damageToHero = 0;
  let enemyHeal = 0;
  let enemyBlockGained = 0;

  // Enemy action
  if (action.type === "attack" || action.type === "heavy_attack") {
    const result = calcAttackDamage(action.value, 1, heroShield, enemyStatuses, heroStatuses);
    heroHp = Math.max(0, heroHp - result.hpDamage);
    damageToHero = result.hpDamage;
    newLog.push(`▶ ${enemy.name}の攻撃！${result.hpDamage}ダメージ`);
  } else if (action.type === "block") {
    enemyBlock = action.value;
    enemyBlockGained = action.value;
    newLog.push(`▶ ${enemy.name}がブロック！+${action.value}`);
  } else if (action.type === "heal") {
    enemyHp = Math.min(prev.enemyMaxHp, enemyHp + action.value);
    enemyHeal = action.value;
    newLog.push(`▶ ${enemy.name}がHP回復！+${action.value}`);
  } else if (action.type === "debuff" && action.applyStatus) {
    heroStatuses = addStatus(heroStatuses, action.applyStatus.type, action.applyStatus.stacks);
    newLog.push(`▶ ${enemy.name}が${statusLabel(action.applyStatus.type)}${action.applyStatus.stacks}を付与！`);
  }

  // Tick enemy statuses (poison/burn DOT)
  const enemyTick = tickStatuses(enemyStatuses);
  enemyStatuses = enemyTick.statuses;
  const poisonDmgToEnemy = enemyTick.poisonDmg + enemyTick.burnDmg;
  if (enemyTick.poisonDmg > 0) {
    enemyHp = Math.max(0, enemyHp - enemyTick.poisonDmg);
    newLog.push(`☠ ${enemy.name}に毒ダメージ${enemyTick.poisonDmg}！`);
  }
  if (enemyTick.burnDmg > 0) {
    enemyHp = Math.max(0, enemyHp - enemyTick.burnDmg);
    newLog.push(`🔥 ${enemy.name}に火傷ダメージ${enemyTick.burnDmg}！`);
  }

  // Tick hero statuses
  const heroTick = tickStatuses(heroStatuses);
  heroStatuses = heroTick.statuses;
  const poisonDmgToHero = heroTick.poisonDmg + heroTick.burnDmg;
  if (heroTick.poisonDmg > 0) {
    heroHp = Math.max(0, heroHp - heroTick.poisonDmg);
    newLog.push(`☠ 毒ダメージ${heroTick.poisonDmg}！`);
  }
  if (heroTick.burnDmg > 0) {
    heroHp = Math.max(0, heroHp - heroTick.burnDmg);
    newLog.push(`🔥 火傷ダメージ${heroTick.burnDmg}！`);
  }

  // Check enemy death from DOT
  const enemyKilledByDot = enemyHp <= 0 && prev.enemyHp > 0;
  if (enemyKilledByDot) newLog.push(`✕ ${enemy.name}を倒した！`);

  // Relic: Anchor — Block+3 at turn start
  let heroShieldNew = 0;
  if (prev.relics.includes("anchor")) {
    heroShieldNew = 3;
  }

  // Relic: Ring of Snake — draw 6 cards instead of 5
  const handSize = prev.relics.includes("ring_of_snake") ? 6 : 5;
  const drawn = drawHand(prev.deck, [...prev.discard, ...prev.hand], nextId, handSize);
  const heroDefeated = heroHp <= 0;

  const stats = {
    ...prev.stats,
    totalDamage: prev.stats.totalDamage + poisonDmgToEnemy,
    turnsTotal: prev.stats.turnsTotal + 1,
    enemiesKilled: prev.stats.enemiesKilled + (enemyKilledByDot ? 1 : 0),
  };

  return {
    state: {
      ...prev, heroHp, heroShield: heroShieldNew, enemyHp, enemyBlock,
      enemyPatternIdx: nextIdx,
      hand: drawn.hand, deck: drawn.deck, discard: drawn.discard,
      log: newLog,
      phase: heroDefeated ? "lose" : enemyKilledByDot ? "next_enemy" : "battle",
      turn: prev.turn + 1, energy: prev.maxEnergy,
      heroStatuses, enemyStatuses, stats,
    },
    enemyAction: action, damageToHero, enemyHeal, enemyBlockGained, heroDefeated,
    poisonDmgToEnemy, poisonDmgToHero,
  };
}

// ---- スキップフロア（デバッグ用） ----

export function skipFloor(prev: GameState, nextId: () => number): GameState {
  const nextFloor = prev.floorNum + 1;
  if (nextFloor >= ENEMIES.length) return { ...prev, phase: "win" };
  const next = ENEMIES[nextFloor];
  const drawn = drawHand(shuffle([...prev.deck, ...prev.discard, ...prev.hand]), [], nextId);
  return {
    ...prev, phase: "battle",
    enemyHp: next.hp, enemyMaxHp: next.hp, enemyBlock: 0, enemyPatternIdx: 0,
    heroShield: 0, floorNum: nextFloor,
    hand: drawn.hand, deck: drawn.deck, discard: [],
    log: [...prev.log, `✕ Floor ${nextFloor + 1} — ${next.name}が現れた！`],
    turn: 1, energy: prev.maxEnergy, rewardCards: [],
    heroStatuses: [], enemyStatuses: [],
  };
}
