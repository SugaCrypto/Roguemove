import { Card } from "../types";

function cardValueLabel(card: Card): string {
    if (card.type === "defend") return `DEF ${card.value}`;
    if (card.hits) return `DMG ${card.value}×${card.hits}`;
    if (card.heal) return `DMG ${card.value} / HP+${card.heal}`;
    return `DMG ${card.value}`;
}

interface Props {
    rewardCards: Card[];
    heroHp: number;
    heroMaxHp: number;
    onPickCard: (card: Card) => void;
    onHeal: () => void;
    onSkip: () => void;
}

export default function RewardScreen({ rewardCards, heroHp, heroMaxHp, onPickCard, onHeal, onSkip }: Props) {
    const healAmt = 20;
    const canHeal = heroHp < heroMaxHp;

    return (
        <div className="screen-overlay">
            <div className="screen-title-clear">REWARD</div>
            <div className="screen-subtitle">報酬を選んでください</div>

            <div className="reward-options">
                {/* カード報酬 */}
                {rewardCards.map(card => (
                    <div
                        key={card.id}
                        className={`card card-${card.type} card-enabled reward-card`}
                        onClick={() => onPickCard(card)}
                    >
                        <div className="card-cost">⚡ {card.cost}</div>
                        <div className="card-icon">
                            {card.type === "attack" ? "⚔️" : card.type === "defend" ? "🛡" : "💥"}
                        </div>
                        <div className="card-name">{card.name}</div>
                        <div className="card-value">{cardValueLabel(card)}</div>
                        <div className="card-type-label" style={{ color: "#c9a84c", marginTop: 6 }}>デッキに追加</div>
                    </div>
                ))}

                {/* HP回復 */}
                <div
                    className={`reward-heal ${canHeal ? "card-enabled" : "card-disabled"}`}
                    onClick={canHeal ? onHeal : undefined}
                >
                    <div style={{ fontSize: 28 }}>💚</div>
                    <div className="card-name">REST</div>
                    <div className="card-value">HP +{healAmt} 回復</div>
                    {!canHeal && <div className="card-type-label" style={{ color: "#555" }}>HP 満タン</div>}
                </div>
            </div>

            <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onSkip}>
                SKIP — スキップ
            </button>
        </div>
    );
}
