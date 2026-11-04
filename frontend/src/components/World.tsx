/**
 * The restaurant scene, drawn only from the backend's state: queue outside, kitchen (rail, Chef, counter),
 * dining room (two tables, Waiter, Cashier booth). It counts nothing and decides nothing.
 */
import type { Customer, GameState, Order } from "@/api";
import { COIN, DOOR, LAMP, REGISTER, STOVE, TABLE } from "@/sprites";
import { CustomerFigure, Food, PixelSprite, SatisfactionBadge, StaffFigure } from "@/Pixel";

/** Small tag above a seated customer, from their state. */
function StateTag({ customer, order }: { customer: Customer; order: Order | undefined }) {
  switch (customer.state) {
    case "SEATED":
      return <span className="tag">Wants to order</span>;
    case "ORDERED":
      return order ? (
        <span className={`tag ${order.servableNow ? "tag-ready" : ""}`}>
          <Food name={order.item} scale={2} /> {order.servableNow ? "Food's ready!" : "Waiting"}
        </span>
      ) : null;
    case "EATING":
      return <span className="tag">Eating</span>;
    case "READY_TO_PAY":
      return (
        <span className="tag tag-gold">
          <PixelSprite sprite={COIN} scale={2} /> Ready to pay
        </span>
      );
    default:
      return null;
  }
}

function Staff({ role, active }: { role: string; active: boolean }) {
  return (
    <div className={`staff ${active ? "is-active" : ""}`}>
      <StaffFigure role={role} />
      <span className="name-tag">{role}</span>
    </div>
  );
}

export function World({ game }: { game: GameState }) {
  const byId = (id: string) => game.customers.find((c) => c.id === id)!;
  const orderOf = (c: Customer) => game.orders.find((o) => o.customerId === c.id && o.status !== "CANCELLED");
  const tickets = game.orders.filter((o) => o.status === "PENDING" || o.status === "PREPARING");
  const ready = game.orders.filter((o) => o.status === "READY");
  const role = game.decision?.role;
  const summary = game.phase === "SUMMARY" || game.phase === "OVER";
  const paid = summary ? game.turnSummary.find((e) => e.text.startsWith("Cashier collects")) : undefined;

  return (
    <div className="world">
      <section className="outside" aria-label="Queue outside">
        <span className="chip-label">Queue</span>
        <div className="queue">
          {game.queue.length === 0 && <p className="dim">Nobody waiting</p>}
          {game.queue.map((id) => {
            const c = byId(id);
            return (
              <div key={id} className="queued">
                <CustomerFigure customer={c} scale={2} />
                <SatisfactionBadge customer={c} />
                <span className={`type type-${c.type}`}>{c.type}</span>
              </div>
            );
          })}
        </div>
        <p className="next-guest">{game.nextArrivalTurn ? `Next guest on turn ${game.nextArrivalTurn}` : "No more guests today"}</p>
      </section>

      <section className="kitchen" aria-label="Kitchen">
        <div className="rail">
          {tickets.length === 0 && <span className="dim">No tickets on the rail</span>}
          {tickets.map((o) => (
            <div key={o.id} className="ticket">
              <Food name={o.item} scale={2} />
              <span>
                {o.id} · {byId(o.customerId).table ?? ""}
              </span>
              <span className="pips" aria-label={`${o.unitsDone} of ${o.prepUnits} cooked`}>
                {Array.from({ length: o.prepUnits }, (_, i) => (
                  <i key={i} className={i < o.unitsDone ? "done" : ""} />
                ))}
              </span>
            </div>
          ))}
        </div>
        <div className="cookline">
          <PixelSprite sprite={STOVE} scale={3} />
          {game.features.chef && <Staff role="Chef" active={role === "Chef"} />}
        </div>
        <div className="counter">
          {ready.length === 0 ? (
            <span className="dim">Counter is clear</span>
          ) : (
            ready.map((o) => (
              <span key={o.id} className={`ready ${o.servableNow ? "servable" : ""}`}>
                <Food name={o.item} scale={3} />
                <small>
                  {o.item} ready{o.servableNow ? "" : " (next turn)"}
                </small>
              </span>
            ))
          )}
        </div>
      </section>

      <section className="floor" aria-label="Dining room">
        <div className="door">
          <PixelSprite sprite={DOOR} scale={3} title="Door" />
        </div>
        <div className="tables">
          {game.tables.map((table) => {
            const occupant = table.occupant ? byId(table.occupant) : null;
            const order = occupant ? orderOf(occupant) : undefined;
            return (
              <div key={table.id} className="table-spot">
                <PixelSprite sprite={LAMP} scale={3} />
                <div className="seat">
                  {occupant && (
                    <div className="diner">
                      <StateTag customer={occupant} order={order} />
                      <CustomerFigure customer={occupant} seated />
                    </div>
                  )}
                </div>
                <div className="table-top">
                  <PixelSprite sprite={TABLE} scale={4} />
                  {occupant?.state === "EATING" && order && (
                    <span className="plate">
                      <Food name={order.item} scale={2} />
                    </span>
                  )}
                </div>
                <span className="table-name">{occupant ? table.id : `${table.id} free`}</span>
                {occupant && <SatisfactionBadge customer={occupant} />}
              </div>
            );
          })}
        </div>
        <div className="floor-staff">
          {game.features.waiter && <Staff role="Waiter" active={role === "Waiter"} />}
        </div>
        {game.features.cashier && (
        <div className="booth">
          <div className="booth-desk">
            <StaffFigure role="Cashier" />
            <PixelSprite sprite={REGISTER} scale={3} />
          </div>
          <div className="booth-caption">
            <strong>Cashier</strong>
            <span>
              {paid
                ? paid.text.replace(/^Cashier collects (\$[\d.]+) from (C\d+).*/, "Collected $1 from $2")
                : !summary && game.cashierNext
                  ? `${game.cashierNext} pays at the end of this turn`
                  : "Nobody to charge"}
            </span>
          </div>
        </div>
        )}
      </section>
    </div>
  );
}
