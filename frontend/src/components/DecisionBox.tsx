/**
 * The decision box: the deciding role's portrait, what happened as the turn started, and option cards built
 * from the backend's choices. Disabled cards show the backend's reason. Options that need a target ask
 * follow-up questions one at a time ("Which table?"); "Who should I seat?" is skipped when only one person is
 * waiting. Keyboard: A-D pick an option, 1-9 answer a question, Esc goes back.
 */
import { useEffect, useState } from "react";

import type { Choice, GameAction, GameState } from "@/api";
import { StaffFigure } from "@/Pixel";

interface Pending {
  at: string;
  key: string;
  step: number;
  answers: Record<string, string>;
}

export function DecisionBox({ game, busy, onChoose }: { game: GameState; busy: boolean; onChoose: (a: GameAction) => void }) {
  const decision = game.decision!;
  const here = `${game.turn}-${decision.role}`;
  const [pending, setPending] = useState<Pending | null>(null);
  const active = pending?.at === here ? pending : null;
  const choice = active ? decision.choices.find((c) => c.key === active.key) ?? null : null;
  const step = choice && active ? choice.steps[active.step] : null;

  const send = (c: Choice, answers: Record<string, string>) => {
    setPending(null);
    onChoose({ type: c.actionType, ...answers });
  };

  /** Moves to the next unanswered question, or sends the command when all are answered. */
  const goTo = (c: Choice, from: number, answers: Record<string, string>) => {
    let next = from;
    let filled = answers;
    while (next < c.steps.length - 1 && c.steps[next].param === "customer") {
      const enabled = c.steps[next].options.filter((o) => o.enabled);
      if (enabled.length !== 1) break;
      filled = { ...filled, customer: enabled[0].value };
      next++;
    }
    if (next >= c.steps.length) send(c, filled);
    else setPending({ at: here, key: c.key, step: next, answers: filled });
  };

  const pickChoice = (c: Choice) => {
    if (!c.enabled || busy) return;
    if (c.steps.length === 0) send(c, {});
    else goTo(c, 0, {});
  };

  const answer = (index: number) => {
    if (!choice || !step || !active || busy) return;
    const option = step.options[index];
    if (!option?.enabled) return;
    const answers = { ...active.answers, [step.param]: option.value };
    if (active.step + 1 >= choice.steps.length) send(choice, answers);
    else goTo(choice, active.step + 1, answers);
  };

  // Keyboard shortcuts (an external input source, so an effect is appropriate here).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (step) {
        if (key === "escape") setPending(null);
        const n = Number(key);
        if (n >= 1 && n <= 9) answer(n - 1);
      } else if (key.length === 1 && key >= "a" && key <= "d") {
        const c = decision.choices[key.charCodeAt(0) - 97];
        if (c) pickChoice(c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="dialog" role="group" aria-label={`${decision.role}'s decision`}>
      <div className="portrait">
        <StaffFigure role={decision.role} scale={6} />
        <span className="portrait-name">{decision.role}</span>
      </div>
      <div className="dialog-main">
        {game.turnStartEvents.map((e, i) => (
          <p key={i} className="news">
            <span className="news-tag">News</span> {e.text}
          </p>
        ))}
        <p className="ask">{step ? step.prompt : "What should I do?"}</p>
        <div className="cards">
          {step && choice && active
            ? [
                ...step.options.map((option, i) => (
                  <button key={option.label} className="card-option" disabled={!option.enabled || busy} onClick={() => answer(i)}>
                    <span className="key">{i + 1}</span>
                    <span className="card-text">
                      <strong>{option.label}</strong>
                      <small>{option.enabled ? option.detail : option.reason}</small>
                    </span>
                  </button>
                )),
                <button key="back" className="card-option card-back" onClick={() => setPending(null)}>
                  <span className="key">Esc</span>
                  <span className="card-text">
                    <strong>Back</strong>
                    <small>Choose a different job.</small>
                  </span>
                </button>,
              ]
            : decision.choices.map((c, i) => (
                <button key={c.key} className="card-option" disabled={!c.enabled || busy} onClick={() => pickChoice(c)}>
                  <span className="key">{String.fromCharCode(65 + i)}</span>
                  <span className="card-text">
                    <strong>{c.label}</strong>
                    <small>{c.enabled ? c.hint : c.reason}</small>
                  </span>
                </button>
              ))}
        </div>
      </div>
    </div>
  );
}
