import { useState, useEffect } from "react";

let _uid = 0;
const uid = () => ++_uid;

const SLIME_IMG = "/slime.png";
const GOBLIN_IMG = "/goblin.png";
const ORC_IMG = "/orc.png";
const VAMPIRE_IMG = "/vampire.png";
const DRAGON_IMG = "/dragon.png";
const HERO_IMG = "/Hero_Moveus.png";

type CardType = "attack" | "defend" | "bash";
interface Card { id: number; name: string; type: CardType; cost: number; value: number; }
interface Enemy { name: string; img: string; hp: number; atk: number; }
interface FloatingText { id: number; text: string; x: number; y: number; color: string; }

const ENEMIES: Enemy[] = [
  { name: "SLIME",   img: SLIME_IMG,   hp: 50,  atk: 8  },
  { name: "GOBLIN",  img: GOBLIN_IMG,  hp: 70,  atk: 10 },
  { name: "ORC",     img: ORC_IMG,     hp: 90,  atk: 12 },
  { name: "VAMPIRE", img: VAMPIRE_IMG, hp: 80,  atk: 15 },
  { name: "DRAGON",  img: DRAGON_IMG,  hp: 120, atk: 18 },
];

const FULL_DECK: Omit<Card,"id">[] = [
  ...Array(5).fill(null).map(() => ({ name:"Strike", type:"attack" as CardType, cost:1, value:6 })),
  ...Array(4).fill(null).map(() => ({ name:"Defend", type:"defend" as CardType, cost:1, value:5 })),
  { name:"Bash", type:"bash" as CardType, cost:2, value:8 },
];

const makeCard = (c: Omit<Card,"id">): Card => ({ ...c, id: uid() });

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawHand(deck: Card[], discard: Card[]) {
  let d = [...deck];
  let dis = [...discard];
  if (d.length < 5) {
    d = shuffle([...d, ...dis.map(c => ({ ...c, id: uid() }))]);
    dis = [];
  }
  const hand = d.splice(0, 5);
  return { hand, deck: d, discard: dis };
}

interface GameState {
  phase: "start" | "battle" | "next_enemy" | "win" | "lose";
  heroHp: number; heroMaxHp: number; heroShield: number;
  energy: number; maxEnergy: number;
  enemyHp: number; enemyMaxHp: number;
  floorNum: number;
  hand: Card[]; deck: Card[]; discard: Card[];
  log: string[];
  turn: number;
}

function initGame(): GameState {
  const enemy = ENEMIES[0];
  const allCards = shuffle(FULL_DECK.map(makeCard));
  const { hand, deck, discard } = drawHand(allCards, []);
  return {
    phase: "start",
    heroHp: 80, heroMaxHp: 80, heroShield: 0,
    energy: 3, maxEnergy: 3,
    enemyHp: enemy.hp, enemyMaxHp: enemy.hp,
    floorNum: 0,
    hand, deck, discard,
    log: ["✕ Floor 1 — SLIMEが現れた！"],
    turn: 1,
  };
}

const CONTRACT = "0x0d8a46b953e0ed5c907331ec4d474d5d47b93cd779029bbe8fecd018497e6b2d";

export default function App() {
  const [game, setGame] = useState<GameState>(initGame);
  const [floats, setFloats] = useState<FloatingText[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [heroAttacking, setHeroAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);

  const enemy = ENEMIES[Math.min(game.floorNum, ENEMIES.length - 1)];

  const addFloat = (text: string, isEnemy: boolean, color: string) => {
    const ft: FloatingText = { id: uid(), text, x: isEnemy ? 65 : 25, y: 20, color };
    setFloats(prev => [...prev, ft]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== ft.id)), 1000);
  };

  const connectWallet = async () => {
    try {
      const nightly = (window as any)?.nightly?.aptos;
      if (!nightly) { alert("Nightly Walletをインストールしてください"); return; }
      const res = await nightly.connect();
      const addr = res?.address?.toString() ?? res?.args?.address?.toString() ?? "";
      if (addr) setWalletAddress(addr);
    } catch(e) { console.error(e); }
  };

  const disconnectWallet = async () => {
    try { await (window as any)?.nightly?.aptos?.disconnect(); } catch(e) {}
    setWalletAddress("");
  };

  const recordResult = async (isWin: boolean, floorReached: number) => {
    if (!walletAddress) return;
    try {
      const nightly = (window as any)?.nightly?.aptos;
      const payload = {
        function: `${CONTRACT}::game::record_result`,
        typeArguments: [],
        functionArguments: [isWin, floorReached],
      };
      const res = await nightly.signAndSubmitTransaction({ payload });
      console.log("保存完了:", res);
    } catch(e) { console.error("保存失敗:", e); }
  };

  useEffect(() => {
    if (game.phase === "win") recordResult(true, game.floorNum + 1);
    if (game.phase === "lose") recordResult(false, game.floorNum + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  // エネルギー切れで自動ターン終了
  useEffect(() => {
    if (game.phase !== "battle") return;
    const canPlay = game.hand.some(c => c.cost <= game.energy);
    if (!canPlay && game.hand.length > 0) {
      const timer = setTimeout(() => endTurn(), 200);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.energy, game.hand, game.phase]);

  const playCard = (card: Card) => {
    if (game.phase !== "battle" || game.energy < card.cost) return;
    setGame(prev => {
      let { energy, heroShield, enemyHp, heroHp, hand, discard, log } = prev;
      energy -= card.cost;
      const newHand = hand.filter(c => c.id !== card.id);
      const newDiscard = [...discard, card];
      let newLog = [...log];
      if (card.type === "attack" || card.type === "bash") {
        enemyHp = Math.max(0, enemyHp - card.value);
        addFloat(`-${card.value}`, true, "#e05555");
        newLog.push(`⚔ ${card.name} → ${enemy.name}に${card.value}ダメージ！`);
        setHeroAttacking(true); setTimeout(() => setHeroAttacking(false), 400);
      } else {
        heroShield += card.value;
        addFloat(`+${card.value} DEF`, false, "#5588e0");
        newLog.push(`🛡 ${card.name} → シールド+${card.value}`);
      }
      const phase = enemyHp <= 0 ? "next_enemy" : prev.phase;
      if (enemyHp <= 0) newLog.push(`✕ ${enemy.name}を倒した！`);
      return { ...prev, energy, heroShield, enemyHp, heroHp, hand: newHand, discard: newDiscard, log: newLog, phase };
    });
  };

  const endTurn = () => {
    if (game.phase !== "battle") return;
    setGame(prev => {
      const atk = enemy.atk;
      let { heroHp, heroShield, hand, discard, deck, log } = prev;
      const netDmg = Math.max(0, atk - heroShield);
      heroHp = Math.max(0, heroHp - netDmg);
      addFloat(`-${netDmg}`, false, "#e05555");
      const newLog = [...log, `▶ ${enemy.name}の攻撃！${netDmg}ダメージ`];
      setEnemyAttacking(true); setTimeout(() => setEnemyAttacking(false), 400);
      const newDiscard = [...discard, ...hand];
      const drawn = drawHand(deck, newDiscard);
      const phase = heroHp <= 0 ? "lose" : "battle";
      return { ...prev, heroHp, heroShield: 0, hand: drawn.hand, deck: drawn.deck, discard: drawn.discard, log: newLog, phase, turn: prev.turn + 1, energy: prev.maxEnergy };
    });
  };

  const goNextEnemy = () => {
    setGame(prev => {
      const nextFloor = prev.floorNum + 1;
      if (nextFloor >= ENEMIES.length) return { ...prev, phase: "win" };
      const nextEnemy = ENEMIES[nextFloor];
      // 手札を捨て札に移してからドロー
      const newDiscard = [...prev.discard, ...prev.hand];
      const drawn = drawHand(prev.deck, newDiscard);
      return {
        ...prev, phase: "battle",
        enemyHp: nextEnemy.hp, enemyMaxHp: nextEnemy.hp,
        heroShield: 0, floorNum: nextFloor,
        hand: drawn.hand, deck: drawn.deck, discard: drawn.discard,
        log: [...prev.log, `✕ Floor ${nextFloor + 1} — ${nextEnemy.name}が現れた！`],
        turn: 1, energy: prev.maxEnergy,
      };
    });
  };

  const restart = () => { _uid = 0; setGame(initGame()); };

  const shortAddr = walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : "";
  const hpPct = (game.heroHp / game.heroMaxHp) * 100;
  const ePct  = (game.enemyHp / game.enemyMaxHp) * 100;

  return (
    <div style={{ minHeight:"100vh", background:"#050508", color:"#c9a84c", fontFamily:"'Cinzel',serif", padding:"0 20px 40px" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #2a2a2a", padding:"16px 0", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:30, fontWeight:700, letterSpacing:10, textShadow:"0 0 20px #8b6914, 0 0 40px #8b6914" }}>✕ RogueMOVE</div>
          <div style={{ fontSize:11, letterSpacing:4, color:"#555", marginTop:2 }}>MOVEMENT NETWORK · TESTNET</div>
        </div>
        {walletAddress ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
            <div style={{ fontSize:11, color:"#2d8a2d", letterSpacing:2 }}>● CONNECTED</div>
            <div style={{ fontSize:10, color:"#888" }}>{shortAddr}</div>
            <button onClick={disconnectWallet} style={{ background:"#1a1a1a", border:"1px solid #d4a843", color:"#d4a843", padding:"10px 20px", cursor:"pointer", letterSpacing:2, fontSize:11 }}>DISCONNECT</button>
          </div>
        ) : (
          <button onClick={connectWallet} style={{ background:"#1a1a1a", border:"1px solid #d4a843", color:"#d4a843", padding:"10px 20px", cursor:"pointer", letterSpacing:2, fontSize:11 }}>◆ NIGHTLY WALLET</button>
        )}
      </div>

      {/* Banner */}
      <div style={{ background:"#0a0a0e", border:"1px solid #2a1a0a", borderRadius:4, padding:"10px 16px", marginBottom:16, fontSize:12, color:"#7a6030", letterSpacing:2 }}>
        {walletAddress ? "◆ Movement Testnet 接続済み" : "◆ ウォレット未接続 — ローカルモードでプレイ中"}
      </div>

      {/* Arena */}
      <div style={{ background:"linear-gradient(180deg,#080810 0%,#120a04 50%,#0a0808 100%)", border:"1px solid #3a2a1a", boxShadow:"inset 0 0 60px rgba(0,0,0,0.8), 0 0 20px rgba(139,60,20,0.1)", borderRadius:4, padding:"24px 32px", marginBottom:16, position:"relative", height:320 }}>
        {floats.map(ft => (
          <div key={ft.id} style={{ position:"absolute", left:`${ft.x}%`, top:`${ft.y}%`, color:ft.color, fontSize:24, fontWeight:700, pointerEvents:"none", animation:"floatUp 1s forwards", zIndex:10, textShadow:"0 0 10px currentColor, 1px 1px 3px #000", whiteSpace:"nowrap" }}>{ft.text}</div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-around", alignItems:"flex-start", position:"absolute", top:16, left:32, right:32 }}>
          {/* Hero */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:200 }}>
            <div style={{ height:160, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
              <img src={HERO_IMG} style={{ width:130, height:130, objectFit:"cover", mixBlendMode:"screen", transform: heroAttacking ? "translateX(40px) scale(1.1)" : "translateX(0) scale(1)", transition:"transform 0.15s ease-out", filter: heroAttacking ? "brightness(1.5)" : "brightness(1)" }} alt="hero"/>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, marginTop:8, minHeight:100 }}>
              <div style={{ fontSize:13, letterSpacing:4 }}>MOVEUS</div>
              <div style={{ width:160, height:8, background:"#222", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${hpPct}%`, background:"linear-gradient(90deg,#6b0f0f,#c41a1a)", borderRadius:4, transition:"width 0.3s", boxShadow:"0 0 6px #c41a1a" }}/>
              </div>
              <div style={{ fontSize:11, color:"#888" }}>{game.heroHp} / {game.heroMaxHp}</div>
              <div style={{ background:"#1a1a1a", border:"1px solid #333", borderRadius:3, padding:"3px 10px", fontSize:11, letterSpacing:1 }}>⚡ {game.energy}/{game.maxEnergy}</div>
              <div style={{ height:28 }}>
                {game.heroShield > 0 && <div style={{ background:"#1a1a1a", border:"1px solid #5588e0", borderRadius:3, padding:"3px 10px", fontSize:11, color:"#5588e0" }}>🛡 {game.heroShield}</div>}
              </div>
            </div>
          </div>

          <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", fontSize:18, letterSpacing:4, color:"#444" }}>VS</div>

          {/* Enemy */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, width:200, height:260, justifyContent:"flex-end" }}>
            <img src={enemy.img} style={{ width:130, height:130, objectFit:"cover", mixBlendMode:"screen", transform: enemyAttacking ? "translateX(-40px) scale(1.1)" : "translateX(0) scale(1)", transition:"transform 0.15s ease-out", filter: enemyAttacking ? "brightness(1.5) hue-rotate(300deg)" : "brightness(1)" }} alt={enemy.name}/>
            <div style={{ fontSize:13, letterSpacing:4 }}>{enemy.name}</div>
            <div style={{ width:160, height:8, background:"#222", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${ePct}%`, background:"linear-gradient(90deg,#6b0f0f,#c41a1a)", borderRadius:4, transition:"width 0.3s", boxShadow:"0 0 6px #c41a1a" }}/>
            </div>
            <div style={{ fontSize:11, color:"#888" }}>{game.enemyHp} / {game.enemyMaxHp}</div>
            <div style={{ background:"#1a1a1a", border:"1px solid #8a2222", borderRadius:3, padding:"3px 10px", fontSize:11, color:"#e05555", letterSpacing:1 }}>▶ ATK {enemy.atk}</div>
          </div>
        </div>
      </div>

      {/* Hand */}
      <div style={{ background:"#08080c", border:"1px solid #2a1a0a", borderRadius:4, padding:16, marginBottom:16, boxShadow:"0 0 20px rgba(0,0,0,0.5)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, letterSpacing:4, color:"#555", marginBottom:12 }}>
          <span>HAND</span>
          <span>FLOOR {game.floorNum + 1}/{ENEMIES.length} &nbsp; TURN {game.turn}</span>
        </div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {game.hand.map(card => {
            const disabled = game.energy < card.cost || game.phase !== "battle";
            const bg = card.type==="attack"?"#1a0a0a":card.type==="defend"?"#0a0f1a":"#120a1a";
            const bc = card.type==="attack"?"#5a1a1a":card.type==="defend"?"#1a2a4a":"#3a1a4a";
            return (
              <div key={card.id} onClick={() => playCard(card)}
                style={{ width:120, padding:"12px 10px", border:`1px solid ${bc}`, background:bg, borderRadius:4,
                  cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1, textAlign:"center", transition:"transform 0.1s" }}>
                <div style={{ fontSize:11, color:"#d4a843", marginBottom:6 }}>⚡ {card.cost}</div>
                <div style={{ fontSize:20, marginBottom:4 }}>{card.type==="attack"?"⚔️":card.type==="defend"?"🛡":"💥"}</div>
                <div style={{ fontSize:13, fontWeight:700, letterSpacing:1, marginBottom:4 }}>{card.name}</div>
                <div style={{ fontSize:10, color:"#888", letterSpacing:1 }}>{card.type==="defend"?`DEF ${card.value}`:`DMG ${card.value}`}</div>
                <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginTop:2 }}>{card.type.toUpperCase()}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:12, marginTop:12 }}>
          <button onClick={endTurn} style={{ background:"linear-gradient(180deg,#1a0a0a,#0d0505)", border:"1px solid #6b2a0a", color:"#c9a84c", padding:"12px 28px", cursor:"pointer", letterSpacing:3, fontSize:12, boxShadow:"0 0 10px rgba(139,60,20,0.3)", textShadow:"0 0 8px #8b6914" }}>END TURN ▶</button>
          <button onClick={goNextEnemy} style={{ background:"transparent", border:"1px solid #333", color:"#555", padding:"12px 16px", cursor:"pointer", letterSpacing:1, fontSize:10 }}>SKIP FLOOR ⏭</button>
        </div>
      </div>

      {/* Log */}
      <div style={{ background:"#060608", border:"1px solid #1a1008", borderRadius:4, padding:"12px 16px", maxHeight:100, overflowY:"auto", boxShadow:"inset 0 0 20px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize:10, letterSpacing:4, color:"#444", marginBottom:8 }}>BATTLE LOG</div>
        {[...game.log].reverse().slice(0,8).map((l,i) => (
          <div key={i} style={{ fontSize:11, color:"#666", marginBottom:3, lineHeight:1.4 }}>{l}</div>
        ))}
      </div>

      {/* Start Screen */}
      {game.phase === "start" && (
        <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse at center, #0d0508 0%, #020204 70%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, zIndex:100 }}>
          <div style={{ fontSize:52, letterSpacing:14, color:"#c9a84c", textShadow:"0 0 20px #8b6914, 0 0 60px #8b6914, 0 0 100px rgba(139,105,20,0.3)" }}>RogueMOVE</div>
          <div style={{ fontSize:13, color:"#555", letterSpacing:4 }}>MOVEMENT NETWORK · TESTNET</div>
          <button onClick={() => setGame(prev => ({ ...prev, phase: "battle" }))}
            style={{ background:"linear-gradient(180deg,#5a0f0f,#2d0808)", border:"1px solid #8b2020", color:"#c9a84c", padding:"18px 56px", cursor:"pointer", letterSpacing:5, fontSize:14, marginTop:16, boxShadow:"0 0 20px rgba(139,20,20,0.4), inset 0 0 20px rgba(0,0,0,0.3)", textShadow:"0 0 10px #8b6914" }}>
            ENTER DUNGEON
          </button>
        </div>
      )}

      {/* Overlay */}
      {(game.phase === "next_enemy" || game.phase === "win" || game.phase === "lose") && (
        <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse at center, #0d0508 0%, #010102 70%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, zIndex:100 }}>
          {game.phase === "next_enemy" ? (
            <>
              <div style={{ fontSize:36, letterSpacing:8, color:"#d4a843" }}>FLOOR CLEAR!</div>
              <div style={{ fontSize:14, color:"#888", letterSpacing:2 }}>次の敵が待っている...</div>
              <button onClick={goNextEnemy} style={{ background:"linear-gradient(180deg,#5a0f0f,#2d0808)", border:"1px solid #8b2020", color:"#c9a84c", padding:"16px 48px", cursor:"pointer", letterSpacing:4, fontSize:14, marginTop:8, boxShadow:"0 0 20px rgba(139,20,20,0.4)", textShadow:"0 0 10px #8b6914" }}>NEXT FLOOR ▶</button>
            </>
          ) : game.phase === "win" ? (
            <>
              <div style={{ fontSize:52, letterSpacing:14, color:"#c9a84c", textShadow:"0 0 20px #8b6914, 0 0 60px #8b6914, 0 0 100px rgba(139,105,20,0.3)" }}>DUNGEON CLEAR!</div>
              <div style={{ fontSize:14, color:"#888", letterSpacing:2 }}>全ての敵を討ち取った！</div>
              {walletAddress && <div style={{ fontSize:12, color:"#555" }}>◆ 結果をブロックチェーンに保存しました！</div>}
              <button onClick={restart} style={{ background:"linear-gradient(180deg,#5a0f0f,#2d0808)", border:"1px solid #8b2020", color:"#c9a84c", padding:"16px 48px", cursor:"pointer", letterSpacing:4, fontSize:14, marginTop:8, boxShadow:"0 0 20px rgba(139,20,20,0.4)", textShadow:"0 0 10px #8b6914" }}>PLAY AGAIN</button>
            </>
          ) : (
            <>
              <div style={{ fontSize:48, letterSpacing:12, color:"#8a2222", textShadow:"0 0 40px #8a2222" }}>GAME OVER</div>
              <div style={{ fontSize:14, color:"#888", letterSpacing:2 }}>力尽きた...</div>
              {walletAddress && <div style={{ fontSize:12, color:"#555" }}>◆ 結果をブロックチェーンに保存しました！</div>}
              <button onClick={restart} style={{ background:"linear-gradient(180deg,#5a0f0f,#2d0808)", border:"1px solid #8b2020", color:"#c9a84c", padding:"16px 48px", cursor:"pointer", letterSpacing:4, fontSize:14, marginTop:8, boxShadow:"0 0 20px rgba(139,20,20,0.4)", textShadow:"0 0 10px #8b6914" }}>PLAY AGAIN</button>
            </>
          )}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050508; }
        button:hover { filter: brightness(1.3); transition: filter 0.2s; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #3a1a0a; border-radius: 2px; }
        @keyframes floatUp {
          0%   { opacity:1; transform: translateY(0); }
          100% { opacity:0; transform: translateY(-60px); }
        }
      `}</style>
    </div>
  );
}
