export type CardType = "attack" | "defend" | "bash";
export type Phase = "start" | "battle" | "next_enemy" | "reward" | "win" | "lose";
export type EnemyActionType = "attack" | "block" | "heavy_attack" | "heal";

export interface EnemyAction {
    type: EnemyActionType;
    value: number;
}

export interface Card {
    id: number;
    name: string;
    type: CardType;
    cost: number;
    value: number;
    hits?: number;  // Double Strike など多段ヒット
    heal?: number;  // Vampiric Strike など吸血効果
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
}
