import { memo, useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { Card, FloatingText, GameState, RelicId } from "./types";
import { ENEMIES } from "./data/enemies";
import {
  createGame, advanceFloor, playCard as enginePlayCard,
  endTurn as engineEndTurn, skipFloor, getRewardCards,
} from "./engine/gameEngine";
import { upgradeCard } from "./data/cards";
import { RELICS } from "./data/relics";
import PixiBattleArena from "./components/PixiBattleArena";
import HandArea from "./components/HandArea";
import BattleLog from "./components/BattleLog";
import RewardScreen from "./components/RewardScreen";
import UpgradeScreen from "./components/UpgradeScreen";
import DeckModal from "./components/DeckModal";

const HERO_IMG = "/hero.png";
const CONTRACT = "0x0d8a46b953e0ed5c907331ec4d474d5d47b93cd779029bbe8fecd018497e6b2d";

function App() {
  const uidRef = useRef(0);
  const uid = useCallback(() => ++uidRef.current, []);
  const [game, setGame] = useState<GameState>(() => createGame(() => ++uidRef.current));
  const gameRef = useRef(game);
  gameRef.current = game;
  const [floats, setFloats] = useState<FloatingText[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [heroAttacking, setHeroAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [showDeck, setShowDeck] = useState(false);

  const currentEnemy = ENEMIES[Math.min(game.floorNum, ENEMIES.length - 1)];

  const addFloat = useCallback((text: string, isEnemy: boolean, color: string) => {
    const ft: FloatingText = { id: uid(), text, x: isEnemy ? 65 : 25, y: 20, color };
    setFloats(prev => [...prev, ft]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== ft.id)), 1000);
  }, [uid]);

  // ---- ウォレット ----
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

  // ---- ターン終了 ----
  const handleEndTurn = useCallback(() => {
    const result = engineEndTurn(gameRef.current, uid);
    setGame(result.state);
    if (result.damageToHero > 0) {
      addFloat(`-${result.damageToHero}`, false, "#e05555");
      setEnemyAttacking(true); setTimeout(() => setEnemyAttacking(false), 400);
    }
    if (result.enemyHeal > 0) {
      addFloat(`+${result.enemyHeal}`, true, "#55bb55");
    }
    if (result.poisonDmgToEnemy > 0) {
      setTimeout(() => addFloat(`-${result.poisonDmgToEnemy} ☠`, true, "#55bb55"), 500);
    }
    if (result.poisonDmgToHero > 0) {
      setTimeout(() => addFloat(`-${result.poisonDmgToHero} ☠`, false, "#55bb55"), 500);
    }
  }, [addFloat, uid]);

  // 手札にプレイ可能カードがなければ自動エンドターン
  useEffect(() => {
    if (game.phase !== "battle") return;
    const canPlay = game.hand.some(c => c.cost <= game.energy);
    if (!canPlay && game.hand.length > 0) {
      const timer = setTimeout(() => handleEndTurn(), 200);
      return () => clearTimeout(timer);
    }
  }, [game.energy, game.hand, game.phase, handleEndTurn]);

  // ---- カードプレイ ----
  const handlePlayCard = useCallback((card: Card) => {
    const result = enginePlayCard(gameRef.current, card);
    setGame(result.state);
    if (result.damageDealt > 0) {
      addFloat(`-${result.damageDealt}`, true, "#e05555");
      setHeroAttacking(true); setTimeout(() => setHeroAttacking(false), 400);
    }
    if (result.healAmount > 0) {
      addFloat(`+${result.healAmount}HP`, false, "#55bb55");
    }
    if (result.shieldGained > 0) {
      addFloat(`+${result.shieldGained} DEF`, false, "#5588e0");
    }
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
  const goToUpgrade = useCallback(() => setGame(prev => ({ ...prev, phase: "upgrade_select" as const })), []);
  const goBackToReward = useCallback(() => setGame(prev => ({ ...prev, phase: "reward" as const })), []);

  const handleUpgradeCard = useCallback((card: Card) => {
    setGame(prev => {
      const upgraded = upgradeCard(card);
      const updateList = (cards: Card[]) => cards.map(c => c.id === card.id ? upgraded : c);
      return advanceFloor(
        { ...prev, deck: updateList(prev.deck), discard: updateList(prev.discard), hand: updateList(prev.hand) },
        uid,
      );
    });
  }, [uid]);

  // ---- SKIP FLOOR（開発専用） ----
  const goNextEnemy = useCallback(() => {
    setGame(prev => skipFloor(prev, uid));
  }, [uid]);

  // ---- リスタート ----
  const restart = useCallback(() => {
    uidRef.current = 0;
    setGame(createGame(() => ++uidRef.current));
  }, []);

  const shortAddr = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "";
  const isDev = process.env.NODE_ENV === "development";

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

      {game.relics.length > 0 && (
        <div style={{ display: "flex", gap: 8, padding: "4px 16px", fontSize: 11, color: "#888" }}>
          {game.relics.map(rid => {
            const r = RELICS.find(x => x.id === rid);
            return r ? <span key={rid} title={`${r.name}: ${r.description}`}>{r.icon}</span> : null;
          })}
        </div>
      )}

      <PixiBattleArena
        heroHp={game.heroHp} heroMaxHp={game.heroMaxHp} heroShield={game.heroShield}
        energy={game.energy} maxEnergy={game.maxEnergy}
        enemyHp={game.enemyHp} enemyMaxHp={game.enemyMaxHp}
        enemyBlock={game.enemyBlock} enemyPatternIdx={game.enemyPatternIdx}
        enemy={currentEnemy as any}
        heroImg={HERO_IMG}
        heroAttacking={heroAttacking} enemyAttacking={enemyAttacking}
        floats={floats}
        floorNum={game.floorNum}
        heroStatuses={game.heroStatuses}
        enemyStatuses={game.enemyStatuses}
      />

      <HandArea
        hand={game.hand} energy={game.energy} phase={game.phase}
        floorNum={game.floorNum} totalFloors={ENEMIES.length} turn={game.turn}
        deckCount={game.deck.length} discardCount={game.discard.length}
        onPlayCard={handlePlayCard} onEndTurn={handleEndTurn}
        onSkipFloor={isDev ? goNextEnemy : undefined}
        onViewDeck={() => setShowDeck(true)}
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
      {game.phase === "next_enemy" && (() => {
        const availableRelics = RELICS.filter(r => !game.relics.includes(r.id));
        const offerRelic = game.floorNum >= 3 && availableRelics.length > 0;
        const relic = offerRelic ? availableRelics[game.floorNum % availableRelics.length] : null;
        return (
          <div className="screen-overlay">
            <div className="screen-title-clear">FLOOR CLEAR!</div>
            <div className="screen-subtitle">次の敵が待っている...</div>
            {relic && (
              <div style={{ margin: "12px 0", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#c9a84c", marginBottom: 4 }}>RELIC FOUND!</div>
                <button
                  className="btn btn-overlay"
                  style={{ fontSize: 13, padding: "8px 20px" }}
                  onClick={() => {
                    setGame(prev => ({ ...prev, relics: [...prev.relics, relic.id] }));
                    proceedToReward();
                  }}
                >
                  {relic.icon} {relic.name} — {relic.description}
                </button>
              </div>
            )}
            <button className="btn btn-overlay" onClick={proceedToReward}>NEXT FLOOR ▶</button>
          </div>
        );
      })()}

      {/* 報酬画面 */}
      {game.phase === "reward" && (
        <RewardScreen
          rewardCards={game.rewardCards}
          heroHp={game.heroHp} heroMaxHp={game.heroMaxHp}
          onPickCard={claimCard} onHeal={claimHeal} onUpgrade={goToUpgrade} onSkip={skipReward}
        />
      )}

      {/* アップグレード選択画面 */}
      {game.phase === "upgrade_select" && (
        <UpgradeScreen
          allCards={[...game.deck, ...game.discard, ...game.hand]}
          onUpgrade={handleUpgradeCard}
          onBack={goBackToReward}
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
          <div className="run-stats">
            <div>⚔ {game.stats.totalDamage} DMG</div>
            <div>🃏 {game.stats.cardsPlayed} CARDS</div>
            <div>⏱ {game.stats.turnsTotal} TURNS</div>
            <div>💀 {game.stats.enemiesKilled} KILLS</div>
            {game.relics.length > 0 && (
              <div>{game.relics.map(rid => RELICS.find(r => r.id === rid)?.icon).join(" ")} RELICS</div>
            )}
          </div>
          <button className="btn btn-overlay" onClick={restart}>PLAY AGAIN</button>
        </div>
      )}

      {showDeck && (
        <DeckModal
          deck={game.deck} discard={game.discard} hand={game.hand}
          onClose={() => setShowDeck(false)}
        />
      )}
    </div>
  );
}
export default memo(App);
