import { Card } from "../types";
import { cardValueLabel, cardIcon } from "../utils";

interface Props {
  rewardCards: Card[];
  heroHp: number;
  heroMaxHp: number;
  onPickCard: (card: Card) => void;
  onHeal: () => void;
  onUpgrade: () => void;
  onSkip: () => void;
}

export default function RewardScreen({ rewardCards, heroHp, heroMaxHp, onPickCard, onHeal, onUpgrade, onSkip }: Props) {
  const healAmt = 20;
  const canHeal = heroHp < heroMaxHp;

  return (
    <div className="screen-overlay">
      <div className="screen-title-clear">REWARD</div>
      <div className="screen-subtitle">報酬を選んでください</div>

      <div className="reward-options">
        {rewardCards.map(card => (
          <div
            key={card.id}
            className={`card card-${card.type} card-enabled reward-card`}
            onClick={() => onPickCard(card)}
          >
            <div className="card-cost">⚡ {card.cost}</div>
            <div className="card-icon">{cardIcon(card)}</div>
            <div className="card-name">{card.name}</div>
            <div className="card-value">{cardValueLabel(card)}</div>
            <div className="card-type-label" style={{ color: "#c9a84c", marginTop: 6 }}>デッキに追加</div>
          </div>
        ))}

        <div
          className={`reward-heal ${canHeal ? "card-enabled" : "card-disabled"}`}
          onClick={canHeal ? onHeal : undefined}
        >
          <div style={{ fontSize: 28 }}>💚</div>
          <div className="card-name">REST</div>
          <div className="card-value">HP +{healAmt} 回復</div>
          {!canHeal && <div className="card-type-label" style={{ color: "#555" }}>HP 満タン</div>}
        </div>

        <div className="reward-heal card-enabled" onClick={onUpgrade}>
          <div style={{ fontSize: 28 }}>⬆</div>
          <div className="card-name">UPGRADE</div>
          <div className="card-value">カードを強化</div>
        </div>
      </div>

      <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onSkip}>
        SKIP — スキップ
      </button>
    </div>
  );
}
