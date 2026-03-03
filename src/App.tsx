import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { Card, FloatingText, GameState } from "./types";
import BattleArena from "./components/BattleArena";
import HandArea from "./components/HandArea";
import BattleLog from "./components/BattleLog";
import RewardScreen from "./components/RewardScreen";

const HERO_IMG = "/hero.png";

export const ENEMIES = [
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
      { type: "attack", value: 10 }, { type: "heal", value: 8 }, { type: "attack", value: 16 }, { type: "attack", value: 12 },
    ]
  },
  {
    name: "DRAGON", img: "/dragon.png", hp: 120, pattern: [
      { type: "block", value: 15 }, { type: "heavy_attack", value: 28 }, { type: "attack", value: 15 }, { type: "attack", value: 15 },
    ]
  },
] as const;

type CardBlueprint = Omit<Card, "id">;

const STARTER_DECK: CardBlueprint[] = [
  ...Array(5).fill(null).map(() => ({ name: "Strike", type: "attack" as const, cost: 1, value: 6 })),
  ...Array(4).fill(null).map(() => ({ name: "Defend", type: "defend" as const, cost: 1, value: 5 })),
  { name: "Bash", type: "bash" as const, cost: 2, value: 8 },
];

const CARD_POOL: CardBlueprint[] = [
  { name: "Whirlwind", type: "attack", cost: 1, value: 4 },
  { name: "Quick Strike", type: "attack", cost: 0, value: 3 },
  { name: "Fireball", type: "attack", cost: 2, value: 14 },
  { name: "Double Strike", type: "attack", cost: 2, value: 5, hits: 2 },
  { name: "Vampiric Strike", type: "attack", cost: 2, value: 8, heal: 4 },
  { name: "Iron Wall", type: "defend", cost: 2, value: 10 },
  { name: "Fortify", type: "defend", cost: 1, value: 7 },
  { name: "Power Bash", type: "bash", cost: 2, value: 12 },
];

const CONTRACT = "0x0d8a46b953e0ed5c907331ec4d474d5d47b93cd779029bbe8fecd018497e6b2d";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawHand(deck: Card[], discard: Card[], nextId: () => number) {
  let d = [...deck], dis = [...discard];
  if (d.length < 5) { d = shuffle([...d, ...dis.map(c => ({ ...c, id: nextId() }))]); dis = []; }
  const hand = d.splice(0, 5);
  return { hand, deck: d, discard: dis };
}

function getRewardCards(nextId: () => number): Card[] {
  return shuffle([...CARD_POOL]).slice(0, 3).map(c => ({ ...c, id: nextId() }));
}

function advanceFloor(prev: GameState, nextId: () => number, extraHp = 0, extraCard?: Card): GameState {
  const nextFloor = prev.floorNum + 1;
  if (nextFloor >= ENEMIES.length) return { ...prev, phase: "win", rewardCards: [] };
  const next = ENEMIES[nextFloor];
  let pool = [...prev.deck, ...prev.discard, ...prev.hand];
  if (extraCard) pool.push({ ...extraCard, id: nextId() });
  const drawn = drawHand(shuffle(pool), [], nextId);
  const healLog = extraHp > 0 ? [`💚 HP+${extraHp}回復！`] : [];
  return {
    ...prev, phase: "battle",
    heroHp: Math.min(prev.heroMaxHp, prev.heroHp + extraHp),
    enemyHp: next.hp, enemyMaxHp: next.hp, enemyBlock: 0, enemyPatternIdx: 0,
    heroShield: 0, floorNum: nextFloor,
    hand: drawn.hand, deck: drawn.deck, discard: [],
    log: [...prev.log, ...healLog, `✕ Floor ${nextFloor + 1} — ${next.name}が現れた！`],
    turn: 1, energy: prev.maxEnergy, rewardCards: [],
  };
}

function createGame(nextId: () => number): GameState {
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
  };
}

export default function App() {
  const uidRef = useRef(0);
  const uid = useCallback(() => ++uidRef.current, []);
  const [game, setGame] = useState<GameState>(() => createGame(() => ++uidRef.current));
  const [floats, setFloats] = useState<FloatingText[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [heroAttacking, setHeroAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);

  const currentEnemy = ENEMIES[Math.min(game.floorNum, ENEMIES.length - 1)];

  const addFloat = useCallback((text: string, isEnemy: boolean, color: string) => {
    const ft: FloatingText = { id: uid(), text, x: isEnemy ? 65 : 25, y: 20, color };
    setFloats(prev => [...prev, ft]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== ft.id)), 1000);
  }, [uid]);

  const connectWallet = async () => {
    try {
      const nightly = (window as any)?.nightly?.aptos;
      if (!nightly) { alert("Nightly Walletをインストールしてください"); return; }
      const res = await nightly.connect();
      const addr = res?.address?.toString() ?? res?.args?.address?.toString() ?? "";
      if (addr) setWalletAddress(addr);
    } catch (e) { console.error(e); }
  };
  const disconnectWallet = async () => {
    try { await (window as any)?.nightly?.aptos?.disconnect(); } catch (e) { }
    setWalletAddress("");
  };

  const recordResult = useCallback(async (isWin: boolean, floor: number) => {
    if (!walletAddress) return;
    try {
      const nightly = (window as any)?.nightly?.aptos;
      await nightly.signAndSubmitTransaction({
        payload: {
          function: `${CONTRACT}::game::record_result`,
          typeArguments: [], functionArguments: [isWin, floor],
        }
      });
    } catch (e) { console.error("保存失敗:", e); }
  }, [walletAddress]);

  useEffect(() => {
    if (game.phase === "win") recordResult(true, game.floorNum + 1);
    if (game.phase === "lose") recordResult(false, game.floorNum + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  // ---- ターン終了（敵行動パターン） ----
  const endTurn = useCallback(() => {
    setGame(prev => {
      if (prev.phase !== "battle") return prev;
      const enemy = ENEMIES[Math.min(prev.floorNum, ENEMIES.length - 1)];
      const action = enemy.pattern[prev.enemyPatternIdx % enemy.pattern.length];
      const nextIdx = (prev.enemyPatternIdx + 1) % enemy.pattern.length;
      let { heroHp, heroShield, enemyHp } = prev;
      let enemyBlock = 0; // 敵ブロックはターン開始にリセット
      let newLog = [...prev.log];

      if (action.type === "attack" || action.type === "heavy_attack") {
        const netDmg = Math.max(0, action.value - heroShield);
        heroHp = Math.max(0, heroHp - netDmg);
        addFloat(`-${netDmg}`, false, "#e05555");
        newLog.push(`▶ ${enemy.name}の攻撃！${netDmg}ダメージ`);
        setEnemyAttacking(true); setTimeout(() => setEnemyAttacking(false), 400);
      } else if (action.type === "block") {
        enemyBlock = action.value;
        newLog.push(`▶ ${enemy.name}がブロック！+${action.value}`);
      } else if (action.type === "heal") {
        enemyHp = Math.min(prev.enemyMaxHp, enemyHp + action.value);
        addFloat(`+${action.value}`, true, "#55bb55");
        newLog.push(`▶ ${enemy.name}がHP回復！+${action.value}`);
      }

      const drawn = drawHand(prev.deck, [...prev.discard, ...prev.hand], uid);
      return {
        ...prev, heroHp, heroShield: 0, enemyHp, enemyBlock,
        enemyPatternIdx: nextIdx,
        hand: drawn.hand, deck: drawn.deck, discard: drawn.discard,
        log: newLog, phase: heroHp <= 0 ? "lose" : "battle",
        turn: prev.turn + 1, energy: prev.maxEnergy,
      };
    });
  }, [addFloat, uid]);

  useEffect(() => {
    if (game.phase !== "battle") return;
    const canPlay = game.hand.some(c => c.cost <= game.energy);
    if (!canPlay && game.hand.length > 0) {
      const timer = setTimeout(() => endTurn(), 200);
      return () => clearTimeout(timer);
    }
  }, [game.energy, game.hand, game.phase, endTurn]);

  // ---- カードプレイ（多段・吸血・敵ブロック対応） ----
  const playCard = useCallback((card: Card) => {
    setGame(prev => {
      if (prev.phase !== "battle" || prev.energy < card.cost) return prev;
      const enemy = ENEMIES[Math.min(prev.floorNum, ENEMIES.length - 1)];
      let { energy, heroShield, enemyHp, heroHp, enemyBlock } = prev;
      energy -= card.cost;
      const newHand = prev.hand.filter(c => c.id !== card.id);
      let newLog = [...prev.log];

      if (card.type === "attack" || card.type === "bash") {
        const hits = card.hits ?? 1;
        const total = card.value * hits;
        const toBlock = Math.min(enemyBlock, total);
        const toHp = total - toBlock;
        enemyBlock = enemyBlock - toBlock;
        enemyHp = Math.max(0, enemyHp - toHp);
        const label = hits > 1 ? `${card.value}×${hits}` : `${total}`;
        addFloat(`-${total}`, true, "#e05555");
        newLog.push(`⚔ ${card.name} → ${enemy.name}に${label}ダメージ！`);
        if (card.heal && toHp > 0) {
          heroHp = Math.min(prev.heroMaxHp, heroHp + card.heal);
          addFloat(`+${card.heal}HP`, false, "#55bb55");
          newLog.push(`💚 吸血！HP+${card.heal}回復`);
        }
        setHeroAttacking(true); setTimeout(() => setHeroAttacking(false), 400);
      } else {
        heroShield += card.value;
        addFloat(`+${card.value} DEF`, false, "#5588e0");
        newLog.push(`🛡 ${card.name} → シールド+${card.value}`);
      }

      const phase = enemyHp <= 0 ? "next_enemy" : prev.phase;
      if (enemyHp <= 0) newLog.push(`✕ ${enemy.name}を倒した！`);
      return { ...prev, energy, heroShield, enemyHp, heroHp, enemyBlock, hand: newHand, discard: [...prev.discard, card], log: newLog, phase };
    });
  }, [addFloat]);

  // ---- 報酬フロー ----
  const proceedToReward = useCallback(() => {
    setGame(prev => {
      const nextFloor = prev.floorNum + 1;
      if (nextFloor >= ENEMIES.length) return { ...prev, phase: "win" };
      return { ...prev, phase: "reward", rewardCards: getRewardCards(uid) };
    });
  }, [uid]);

  const claimCard = useCallback((card: Card) => setGame(prev => advanceFloor(prev, uid, 0, card)), [uid]);
  const claimHeal = useCallback(() => setGame(prev => advanceFloor(prev, uid, 20)), [uid]);
  const skipReward = useCallback(() => setGame(prev => advanceFloor(prev, uid)), [uid]);

  // ---- SKIP FLOOR（テスト用） ----
  const goNextEnemy = useCallback(() => {
    setGame(prev => {
      const nextFloor = prev.floorNum + 1;
      if (nextFloor >= ENEMIES.length) return { ...prev, phase: "win" };
      const next = ENEMIES[nextFloor];
      const drawn = drawHand(shuffle([...prev.deck, ...prev.discard, ...prev.hand]), [], uid);
      return {
        ...prev, phase: "battle",
        enemyHp: next.hp, enemyMaxHp: next.hp, enemyBlock: 0, enemyPatternIdx: 0,
        heroShield: 0, floorNum: nextFloor,
        hand: drawn.hand, deck: drawn.deck, discard: [],
        log: [...prev.log, `✕ Floor ${nextFloor + 1} — ${next.name}が現れた！`],
        turn: 1, energy: prev.maxEnergy, rewardCards: [],
      };
    });
  }, [uid]);

  // ---- リスタート ----
  const restart = useCallback(() => {
    uidRef.current = 0;
    setGame(createGame(() => ++uidRef.current));
  }, []);

  const shortAddr = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "";

  return (
    <div className="app">
      {/* ヘッダー */}
      <div className="header">
        <div>
          <div className="header-title">✕ RogueMOVE</div>
          <div className="header-subtitle">MOVEMENT NETWORK · TESTNET</div>
        </div>
        {walletAddress ? (
          <div className="wallet-connected">
            <div className="wallet-status">● CONNECTED</div>
            <div className="wallet-addr">{shortAddr}</div>
            <button className="btn btn-wallet" onClick={disconnectWallet}>DISCONNECT</button>
          </div>
        ) : (
          <button className="btn btn-wallet" onClick={connectWallet}>◆ NIGHTLY WALLET</button>
        )}
      </div>

      <div className="banner">
        {walletAddress ? "◆ Movement Testnet 接続済み" : "◆ ウォレット未接続 — ローカルモードでプレイ中"}
      </div>

      <BattleArena
        heroHp={game.heroHp} heroMaxHp={game.heroMaxHp} heroShield={game.heroShield}
        energy={game.energy} maxEnergy={game.maxEnergy}
        enemyHp={game.enemyHp} enemyMaxHp={game.enemyMaxHp}
        enemyBlock={game.enemyBlock} enemyPatternIdx={game.enemyPatternIdx}
        enemy={currentEnemy as any}
        heroImg={HERO_IMG}
        heroAttacking={heroAttacking} enemyAttacking={enemyAttacking}
        floats={floats}
      />

      <HandArea
        hand={game.hand} energy={game.energy} phase={game.phase}
        floorNum={game.floorNum} totalFloors={ENEMIES.length} turn={game.turn}
        deckCount={game.deck.length} discardCount={game.discard.length}
        onPlayCard={playCard} onEndTurn={endTurn} onSkipFloor={goNextEnemy}
      />

      <BattleLog log={game.log} />

      {/* スタート画面 */}
      {game.phase === "start" && (
        <div className="screen-overlay">
          <div className="screen-title-gold">RogueMOVE</div>
          <div className="screen-network">MOVEMENT NETWORK · TESTNET</div>
          <button className="btn btn-enter" onClick={() => setGame(prev => ({ ...prev, phase: "battle" }))}>
            ENTER DUNGEON
          </button>
        </div>
      )}

      {/* フロアクリア */}
      {game.phase === "next_enemy" && (
        <div className="screen-overlay">
          <div className="screen-title-clear">FLOOR CLEAR!</div>
          <div className="screen-subtitle">次の敵が待っている...</div>
          <button className="btn btn-overlay" onClick={proceedToReward}>NEXT FLOOR ▶</button>
        </div>
      )}

      {/* 報酬画面 */}
      {game.phase === "reward" && (
        <RewardScreen
          rewardCards={game.rewardCards}
          heroHp={game.heroHp} heroMaxHp={game.heroMaxHp}
          onPickCard={claimCard} onHeal={claimHeal} onSkip={skipReward}
        />
      )}

      {/* 勝敗画面 */}
      {(game.phase === "win" || game.phase === "lose") && (
        <div className="screen-overlay">
          {game.phase === "win" ? (
            <>
              <div className="screen-title-gold">DUNGEON CLEAR!</div>
              <div className="screen-subtitle">全ての敵を討ち取った！</div>
              {walletAddress && <div className="screen-chain-msg">◆ 結果をブロックチェーンに保存しました！</div>}
            </>
          ) : (
            <>
              <div className="screen-title-red">GAME OVER</div>
              <div className="screen-subtitle">力尽きた...</div>
              {walletAddress && <div className="screen-chain-msg">◆ 結果をブロックチェーンに保存しました！</div>}
            </>
          )}
          <button className="btn btn-overlay" onClick={restart}>PLAY AGAIN</button>
        </div>
      )}
    </div>
  );
}
