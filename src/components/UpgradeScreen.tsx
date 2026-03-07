import { Card } from "../types";
import { cardValueLabel, cardIcon } from "../utils";
import { upgradeCard } from "../data/cards";

interface Props {
  allCards: Card[];
  onUpgrade: (card: Card) => void;
  onBack: () => void;
}

export default function UpgradeScreen({ allCards, onUpgrade, onBack }: Props) {
  const upgradeable = allCards.filter(c => !c.upgraded);

  return (
    <div className="screen-overlay">
      <div className="screen-title-clear">UPGRADE</div>
      <div className="screen-subtitle">強化するカードを選んでください</div>

      <div className="reward-options" style={{ flexWrap: "wrap", maxWidth: 600 }}>
        {upgradeable.map(card => {
          const preview = upgradeCard(card);
          return (
            <div
              key={card.id}
              className={`card card-${card.type} card-enabled reward-card`}
              onClick={() => onUpgrade(card)}
            >
              <div className="card-cost">⚡ {preview.cost}</div>
              <div className="card-icon">{cardIcon(preview)}</div>
              <div className="card-name">{preview.name}</div>
              <div className="card-value">{cardValueLabel(preview)}</div>
              <div className="card-type-label" style={{ color: "#55bb55", marginTop: 6, fontSize: 9 }}>
                {card.name} → {preview.name}
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onBack}>
        BACK — 戻る
      </button>
    </div>
  );
}
