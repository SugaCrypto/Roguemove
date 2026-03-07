import { memo } from "react";
import { Card, Phase } from "../types";
import { cardValueLabel, cardIcon } from "../utils";

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
  onSkipFloor?: () => void;
  onViewDeck?: () => void;
}

const HandArea = ({
  hand, energy, phase, floorNum, totalFloors, turn,
  deckCount, discardCount, onPlayCard, onEndTurn, onSkipFloor, onViewDeck,
}: Props) => {
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
              <div className="card-icon">{cardIcon(card)}</div>
              <div className="card-name">{card.name}</div>
              <div className="card-value">{cardValueLabel(card)}</div>
              <div className="card-type-label">{card.type.toUpperCase()}</div>
            </div>
          );
        })}
      </div>

      <div className="hand-buttons">
        <button className="btn btn-primary" onClick={onEndTurn}>END TURN ▶</button>
        {onViewDeck && <button className="btn btn-secondary" onClick={onViewDeck}>VIEW DECK</button>}
        {onSkipFloor && (
          <button className="btn btn-secondary" onClick={onSkipFloor}>SKIP FLOOR ⏭</button>
        )}
      </div>
    </div>
  );
};

export default memo(HandArea);
