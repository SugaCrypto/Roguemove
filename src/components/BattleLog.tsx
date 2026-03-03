interface Props {
    log: string[];
}

export default function BattleLog({ log }: Props) {
    return (
        <div className="log-area">
            <div className="log-title">BATTLE LOG</div>
            {[...log].reverse().slice(0, 8).map((entry, i) => (
                <div key={i} className="log-entry">{entry}</div>
            ))}
        </div>
    );
}
