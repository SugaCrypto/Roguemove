import { memo } from "react";
import { Card } from "../types";
import { cardValueLabel, cardIcon } from "../utils";

interface Props {
  deck: Card[];
  discard: Card[];
  hand: Card[];
  onClose: () => void;
}

const DeckModal = ({ deck, discard, hand, onClose }: Props) => {
  const allCards = [...hand, ...deck, ...discard].sort((a, b) => {
    const typeOrder = { attack: 0, bash: 1, defend: 2, skill: 3 };
    return (typeOrder[a.type] ?? 4) - (typeOrder[b.type] ?? 4) || a.cost - b.cost;
  });

  return (
    <div className="screen-overlay" style={{ zIndex: 200 }} onClick={onClose}>
      <div style={{ maxWidth: 600, width: "100%", padding: "0 16px" }} onClick={e => e.stopPropagation()}>
        <div className="screen-title-clear" style={{ fontSize: 28, marginBottom: 8 }}>DECK</div>
        <div style={{ fontSize: 11, color: "#888", letterSpacing: 2, marginBottom: 16, textAlign: "center" }}>
          {allCards.length}枚 — TAP TO CLOSE
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxHeight: "60vh", overflowY: "auto" }}>
          {allCards.map(card => (
            <div key={card.id} className={`card card-${card.type}`} style={{ width: 100, padding: "8px 6px", opacity: 1 }}>
              <div className="card-cost" style={{ fontSize: 10 }}>⚡ {card.cost}</div>
              <div className="card-icon" style={{ fontSize: 16 }}>{cardIcon(card)}</div>
              <div className="card-name" style={{ fontSize: 11 }}>{card.name}</div>
              <div className="card-value" style={{ fontSize: 9 }}>{cardValueLabel(card)}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
};

export default memo(DeckModal);
