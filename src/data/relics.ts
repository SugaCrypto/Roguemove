import { Relic } from "../types";

export const RELICS: Relic[] = [
  { id: "burning_blood", name: "Burning Blood", description: "戦闘終了時 HP+6", icon: "🩸" },
  { id: "anchor", name: "Anchor", description: "毎ターン開始時 Block+3", icon: "⚓" },
  { id: "bag_of_marbles", name: "Bag of Marbles", description: "戦闘開始時 敵にVulnerable 1", icon: "🔮" },
  { id: "ring_of_snake", name: "Ring of Snake", description: "毎ターン手札+1 (6枚)", icon: "🐍" },
  { id: "molten_egg", name: "Molten Egg", description: "攻撃カード獲得時 自動UP", icon: "🥚" },
];
