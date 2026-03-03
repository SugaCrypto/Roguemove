import { Card, Phase } from "../types";

function cardValueLabel(card: Card): string {
    if (card.type === "defend") return `DEF ${card.value}`;
    if (card.hits) return `DMG ${card.value}×${card.hits}`;
    if (card.heal) return `DMG ${card.value} / HP+${card.heal}`;
    return `DMG ${card.value}`;
}

interface Props {
    hand: Card[];
    energy: number;
    phase: Phase;
    floorNum: number;
    totalFloors: number;
    turn: number;
    deckCount: number;
    discardCount: number;
    onPlayCard: (card: Card) => void;
    onEndTurn: () => void;
    onSkipFloor: () => void;
}

export default function HandArea({
    hand, energy, phase, floorNum, totalFloors, turn,
    deckCount, discardCount, onPlayCard, onEndTurn, onSkipFloor,
}: Props) {
    return (
        <div className="hand-area">
            <div className="hand-header">
                <span>HAND</span>
                <span style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#444" }}>
                        🃏 {deckCount} &nbsp; 🗑 {discardCount}
                    </span>
                    <span>FLOOR {floorNum + 1}/{totalFloors} &nbsp; TURN {turn}</span>
                </span>
            </div>

            <div className="cards-row">
                {hand.map(card => {
                    const disabled = energy < card.cost || phase !== "battle";
                    return (
                        <div
                            key={card.id}
                            className={`card card-${card.type} ${disabled ? "card-disabled" : "card-enabled"}`}
                            onClick={() => { if (!disabled) onPlayCard(card); }}
                        >
                            <div className="card-cost">⚡ {card.cost}</div>
                            <div className="card-icon">
                                {card.type === "attack" ? "⚔️" : card.type === "defend" ? "🛡" : "💥"}
                            </div>
                            <div className="card-name">{card.name}</div>
                            <div className="card-value">{cardValueLabel(card)}</div>
                            <div className="card-type-label">{card.type.toUpperCase()}</div>
                        </div>
                    );
                })}
            </div>

            <div className="hand-buttons">
                <button className="btn btn-primary" onClick={onEndTurn}>END TURN ▶</button>
                <button className="btn btn-secondary" onClick={onSkipFloor}>SKIP FLOOR ⏭</button>
            </div>
        </div>
    );
}
