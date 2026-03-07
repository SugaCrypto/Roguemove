import { Enemy } from "../types";

export const ENEMIES: Enemy[] = [
  {
    name: "SLIME", img: "/slime.png", hp: 50, pattern: [
      { type: "attack", value: 8 }, { type: "attack", value: 8 }, { type: "heavy_attack", value: 14 },
    ]
  },
  {
    name: "GOBLIN", img: "/goblin.png", hp: 70, pattern: [
      { type: "attack", value: 8 }, { type: "block", value: 6 }, { type: "attack", value: 12 },
    ]
  },
  {
    name: "ORC", img: "/orc.png", hp: 90, pattern: [
      { type: "attack", value: 12 }, { type: "block", value: 10 }, { type: "heavy_attack", value: 20 }, { type: "block", value: 8 },
    ]
  },
  {
    name: "VAMPIRE", img: "/vampire.png", hp: 80, pattern: [
      { type: "attack", value: 10 },
      { type: "debuff", value: 0, applyStatus: { type: "weak", stacks: 2 } },
      { type: "attack", value: 16 },
      { type: "heal", value: 8 },
    ]
  },
  {
    name: "DRAGON", img: "/dragon.png", hp: 120, pattern: [
      { type: "debuff", value: 0, applyStatus: { type: "vulnerable", stacks: 2 } },
      { type: "heavy_attack", value: 28 },
      { type: "debuff", value: 0, applyStatus: { type: "burn", stacks: 3 } },
      { type: "attack", value: 15 },
    ]
  },
];
