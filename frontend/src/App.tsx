/** Two screens: the main menu and the game. All game state comes from the backend; this file only calls it. */
import { useState } from "react";

import { ApiError, api, apiBase, type GameAction, type GameState } from "@/api";
import { DecisionBox } from "@/components/DecisionBox";
import { GameOver, Hud, LogDrawer, TurnSummary } from "@/components/Panels";
import { World } from "@/components/World";
import { StaffFigure } from "@/Pixel";

export function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [seed, setSeed] = useState("");

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      setRejected(null);
      setGame(await api.newGame({ seed: seed.trim() || undefined }));
    });

  const apply = (call: Promise<{ result: { success: boolean; message: string }; state: GameState }>) =>
    run(async () => {
      const r = await call;
      setGame(r.state);
      setRejected(r.result.success ? null : r.result.message);
    });

  const choose = (a: GameAction) => apply(api.act(a));

  if (!game) {
    return (
      <main className="frame menu">
        <div className="menu-cast" aria-hidden>
          <StaffFigure role="Chef" />
          <StaffFigure role="Waiter" />
          <StaffFigure role="Cashier" />
        </div>
        <h1 className="title">
          <span>Restaurant</span> Rush
        </h1>
        <p className="tagline">Stage 1 · eighteen turns, two tables, one very busy manager.</p>
        <label className="field">
          Seed (optional, for a reproducible game)
          <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="e.g. 2002" inputMode="numeric" />
        </label>
        <button className="btn btn-primary" disabled={busy} onClick={() => void start()}>
          Start new game
        </button>
        {error && <p className="warning">{error}</p>}
        <p className="dim small">Backend: {apiBase()}</p>
      </main>
    );
  }

  return (
    <main className="frame game">
      <Hud game={game} onMenu={() => setGame(null)} onLog={() => setShowLog(true)} />
      <World game={game} />
      <div className="dialog-area">
        {rejected && <p className="warning">Not allowed: {rejected}</p>}
        {error && <p className="warning">{error}</p>}
        {game.decision && <DecisionBox game={game} busy={busy} onChoose={(a) => void choose(a)} />}
        {game.phase === "SUMMARY" && <TurnSummary game={game} busy={busy} onNext={() => void apply(api.next())} />}
      </div>
      {showLog && <LogDrawer game={game} onClose={() => setShowLog(false)} />}
      {game.phase === "OVER" && game.result && <GameOver game={game} onMenu={() => setGame(null)} onAgain={() => void start()} />}
    </main>
  );
}
