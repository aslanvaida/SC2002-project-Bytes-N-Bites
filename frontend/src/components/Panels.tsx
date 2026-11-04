/** HUD, end-of-turn summary, event log and game-over dialog (display only). */
import type { GameEvent, GameState } from "@/api";
import { StaffFigure } from "@/Pixel";

function tone(text: string): string {
  if (/leaves unhappy/.test(text)) return "ev-bad";
  if (/collects/.test(text)) return "ev-good";
  if (/arrives/.test(text)) return "ev-info";
  if (/waits/.test(text)) return "ev-dim";
  return "";
}

export function EventList({ events }: { events: GameEvent[] }) {
  return (
    <ul className="events">
      {events.map((e, i) => (
        <li key={i} className={tone(e.text)}>
          {e.text}
        </li>
      ))}
    </ul>
  );
}

export function Hud({ game, onMenu, onLog }: { game: GameState; onMenu: () => void; onLog: () => void }) {
  const avg = game.averageSatisfaction;
  const met = {
    paid: game.paidCount >= game.targets.paid,
    revenue: game.revenueCents >= game.targets.revenueCents,
    avg: avg !== "N/A" && parseFloat(avg) >= game.targets.averageSatisfaction,
  };
  return (
    <header className="hud">
      <button className="btn btn-small" onClick={onMenu}>
        Menu
      </button>
      <span className="stat">
        Turn <strong>{game.turn}</strong> of {game.totalTurns}
      </span>
      <span className={`stat ${met.paid ? "met" : ""}`}>
        Paid <strong>{game.paidCount}</strong>/{game.targets.paid}
      </span>
      <span className={`stat ${met.revenue ? "met" : ""}`}>
        Revenue <strong>{game.revenue}</strong>/{game.targets.revenue}
      </span>
      <span className={`stat ${met.avg ? "met" : ""}`}>
        Avg <strong>{avg}</strong>/{game.targets.averageSatisfaction}
      </span>
      <span className="hud-spacer" />
      <span className="mode-label">Stage {game.stage} · seed {game.seed}</span>
      <button className="btn btn-small" onClick={onLog}>
        Log
      </button>
    </header>
  );
}

export function TurnSummary({ game, busy, onNext }: { game: GameState; busy: boolean; onNext: () => void }) {
  const last = game.turn >= game.totalTurns;
  return (
    <div className="dialog">
      <div className="portrait">
        <StaffFigure role="Manager" scale={6} />
        <span className="portrait-name">Manager</span>
      </div>
      <div className="dialog-main">
        <p className="ask">End of turn {game.turn}</p>
        <EventList events={game.turnSummary} />
        <p className="situation">
          Served {game.servedCount} · Left unhappy {game.departureCount} · Paid {game.paidCount} · Revenue {game.revenue} · Avg{" "}
          {game.averageSatisfaction} · Turns used {game.turn}/{game.totalTurns}
        </p>
        <button className="btn btn-primary" disabled={busy} onClick={onNext} autoFocus>
          {last ? "See the result" : `Start turn ${game.turn + 1}`}
        </button>
      </div>
    </div>
  );
}

export function LogDrawer({ game, onClose }: { game: GameState; onClose: () => void }) {
  const turns = [...new Set(game.log.map((e) => e.turn))].sort((a, b) => b - a);
  return (
    <div className="overlay" onClick={onClose}>
      <aside className="modal log" role="dialog" aria-label="Event log" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Log</h2>
          <button className="btn btn-small" onClick={onClose}>
            Close
          </button>
        </div>
        {turns.map((turn) => (
          <section key={turn}>
            <h3>Turn {turn}</h3>
            <EventList events={game.log.filter((e) => e.turn === turn)} />
          </section>
        ))}
      </aside>
    </div>
  );
}

export function GameOver({ game, onMenu, onAgain }: { game: GameState; onMenu: () => void; onAgain: () => void }) {
  const r = game.result!;
  const rows = [
    { label: "Paid customers", value: String(r.paidCount), goal: `${game.targets.paid}`, met: r.paidMet },
    { label: "Revenue", value: r.revenue, goal: game.targets.revenue, met: r.revenueMet },
    { label: "Average satisfaction", value: r.averageSatisfaction, goal: `${game.targets.averageSatisfaction}`, met: r.satisfactionMet },
  ];
  return (
    <div className="overlay">
      <div className="modal result" role="dialog" aria-label="Game over">
        <h2 className={r.victory ? "victory" : "defeat"}>{r.victory ? "Victory" : "Defeat"}</h2>
        <table className="criteria">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>
                  <strong>{row.value}</strong> <span className="dim">(need ≥ {row.goal})</span>
                </td>
                <td className={row.met ? "met" : "not-met"}>{row.met ? "MET" : "NOT MET"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="result-line">RESULT: {r.victory ? "VICTORY" : "DEFEAT"}</p>
        <div className="modal-actions">
          <button className="btn" onClick={onMenu}>
            Main menu
          </button>
          <button className="btn btn-primary" onClick={onAgain}>
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
