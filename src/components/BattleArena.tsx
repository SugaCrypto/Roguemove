import { memo } from "react";
import { Enemy, EnemyAction, FloatingText } from "../types";

interface Props {
    heroHp: number; heroMaxHp: number; heroShield: number;
    energy: number; maxEnergy: number;
    enemyHp: number; enemyMaxHp: number;
    enemyBlock: number;
    enemyPatternIdx: number;
    enemy: Enemy;
    heroImg: string;
    heroAttacking: boolean; enemyAttacking: boolean;
    floats: FloatingText[];
}

function intentLabel(action: EnemyAction): { icon: string; text: string; color: string } {
    switch (action.type) {
        case "attack": return { icon: "⚔️", text: `ATK ${action.value}`, color: "#e05555" };
        case "heavy_attack": return { icon: "💥", text: `HEAVY ${action.value}`, color: "#ff3333" };
        case "block": return { icon: "🛡", text: `BLOCK +${action.value}`, color: "#5588e0" };
        case "heal": return { icon: "💚", text: `HEAL +${action.value}`, color: "#55bb55" };
        case "debuff": return { icon: "☠", text: "DEBUFF", color: "#aa55aa" };
    }
}

const BattleArena = ({
    heroHp, heroMaxHp, heroShield, energy, maxEnergy,
    enemyHp, enemyMaxHp, enemyBlock, enemyPatternIdx,
    enemy, heroImg, heroAttacking, enemyAttacking, floats,
}: Props) => {
    const hpPct = (heroHp / heroMaxHp) * 100;
    const ePct = (enemyHp / enemyMaxHp) * 100;
    const intent = intentLabel(enemy.pattern[enemyPatternIdx % enemy.pattern.length]);

    return (
        <div className="arena">
            {floats.map(ft => (
                <div key={ft.id} className="float-text" style={{ left: `${ft.x}%`, top: `${ft.y}%`, color: ft.color }}>
                    {ft.text}
                </div>
            ))}

            <div className="arena-fighters">
                {/* Hero */}
                <div className="fighter">
                    <div className="fighter-img-wrap">
                        <img src={heroImg} className="fighter-img" style={{
                            transform: heroAttacking ? "translateX(40px) scale(1.1)" : "translateX(0) scale(1)",
                            filter: heroAttacking ? "brightness(1.5)" : "brightness(1)",
                        }} alt="hero" />
                    </div>
                    <div className="fighter-info">
                        <div className="fighter-name">MOVEUS</div>
                        <div className="hp-bar"><div className="hp-fill" style={{ width: `${hpPct}%` }} /></div>
                        <div className="hp-text">{heroHp} / {heroMaxHp}</div>
                        <div className="energy-badge">⚡ {energy}/{maxEnergy}</div>
                        <div style={{ height: 28 }}>
                            {heroShield > 0 && <div className="shield-badge">🛡 {heroShield}</div>}
                        </div>
                    </div>
                </div>

                <div className="arena-vs">VS</div>

                {/* Enemy */}
                <div className="enemy-fighter">
                    <div className="fighter-img-wrap">
                        <img src={enemy.img} className="fighter-img" style={{
                            transform: enemyAttacking ? "translateX(-40px) scale(1.1)" : "translateX(0) scale(1)",
                            filter: enemyAttacking ? "brightness(1.5) hue-rotate(300deg)" : "brightness(1)",
                        }} alt={enemy.name} />
                    </div>
                    <div className="fighter-info">
                        <div className="fighter-name">{enemy.name}</div>
                        <div className="hp-bar"><div className="hp-fill" style={{ width: `${ePct}%` }} /></div>
                        <div className="hp-text">{enemyHp} / {enemyMaxHp}</div>
                        {/* 敵の次の行動インテントをヒーローのエナジーと同じ位置に配置 */}
                        <div className="enemy-intent" style={{ color: intent.color, marginBottom: 0, marginTop: 4 }}>
                            {intent.text}
                        </div>
                        <div style={{ height: 28, marginTop: 4 }}>
                            {enemyBlock > 0 && <div className="shield-badge">🛡 {enemyBlock}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(BattleArena);
