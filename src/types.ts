export type CardType = "attack" | "defend" | "bash" | "skill";
export type Phase = "start" | "battle" | "next_enemy" | "reward" | "upgrade_select" | "win" | "lose";
export type EnemyActionType = "attack" | "block" | "heavy_attack" | "heal" | "debuff";
export type StatusType = "poison" | "strength" | "weak" | "vulnerable" | "burn";

export interface StatusEffect {
    type: StatusType;
    stacks: number;
}

export interface EnemyAction {
    type: EnemyActionType;
    value: number;
    applyStatus?: { type: StatusType; stacks: number };
}

export interface Card {
    id: number;
    name: string;
    type: CardType;
    cost: number;
    value: number;
    hits?: number;
    heal?: number;
    applyToEnemy?: { type: StatusType; stacks: number };
    applyToSelf?: { type: StatusType; stacks: number };
    upgraded?: boolean;
}

export type RelicId = "burning_blood" | "anchor" | "bag_of_marbles" | "ring_of_snake" | "molten_egg";

export interface Relic {
    id: RelicId;
    name: string;
    description: string;
    icon: string;
}

export interface Enemy {
    name: string;
    img: string;
    hp: number;
    pattern: EnemyAction[];
}

export interface FloatingText {
    id: number;
    text: string;
    x: number;
    y: number;
    color: string;
}

export interface GameState {
    phase: Phase;
    heroHp: number; heroMaxHp: number; heroShield: number;
    energy: number; maxEnergy: number;
    enemyHp: number; enemyMaxHp: number;
    enemyBlock: number;
    enemyPatternIdx: number;
    floorNum: number;
    hand: Card[]; deck: Card[]; discard: Card[];
    log: string[];
    turn: number;
    rewardCards: Card[];
    heroStatuses: StatusEffect[];
    enemyStatuses: StatusEffect[];
    relics: RelicId[];
    stats: RunStats;
}

export interface RunStats {
    totalDamage: number;
    cardsPlayed: number;
    turnsTotal: number;
    enemiesKilled: number;
}
