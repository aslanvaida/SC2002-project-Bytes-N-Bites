/** Pixel sprite renderer and the small pixel widgets built on it (display only). */
import type { CSSProperties, ReactElement } from "react";

import type { Customer } from "./api";
import { ANGER, CUSTOMER_LOOKS, FOOD, STAFF_LOOKS, moodFor, personSprite, seatedSprite, type Sprite } from "./sprites";

/** Draws a sprite as crisp SVG rectangles, one per run of same-coloured pixels. */
export function PixelSprite({ sprite, scale = 3, className, title, style }: { sprite: Sprite; scale?: number; className?: string; title?: string; style?: CSSProperties }) {
  const width = Math.max(...sprite.rows.map((r) => r.length));
  const height = sprite.rows.length;
  const rects: ReactElement[] = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === key) run++;
      const fill = sprite.palette[key];
      if (key !== "." && fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={fill} />);
      x += run;
    }
  });
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      className={`pixel ${className ?? ""}`}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      shapeRendering="crispEdges"
    >
      {title && <title>{title}</title>}
      {rects}
    </svg>
  );
}

/** Food icon for a dish name. */
export function Food({ name, scale = 3 }: { name: string; scale?: number }) {
  return <PixelSprite sprite={FOOD[name] ?? FOOD.Salad} scale={scale} title={name} />;
}

/** Satisfaction badge: id, bar and number. */
export function SatisfactionBadge({ customer }: { customer: Customer }) {
  const value = customer.state === "PAID" ? customer.recordedSatisfaction : customer.satisfaction;
  return (
    <span className={`badge mood-${moodFor(value)}`} aria-label={`${customer.id} satisfaction ${value}`}>
      <strong>{customer.id}</strong>
      <span className="bar">
        <span style={{ width: `${value}%` }} />
      </span>
      <span>{value}</span>
    </span>
  );
}

/** A customer sprite, tinted red as satisfaction drops, with anger marks below 60. */
export function CustomerFigure({ customer, scale = 3, seated = false }: { customer: Customer; scale?: number; seated?: boolean }) {
  const mood = moodFor(customer.satisfaction);
  const look = CUSTOMER_LOOKS[customer.type] ?? CUSTOMER_LOOKS.Regular;
  const standing = personSprite(look, mood, customer.id);
  return (
    <span className={`figure mood-${mood}`} data-type={customer.type}>
      {mood === "upset" && (
        <span className="anger" aria-hidden>
          <PixelSprite sprite={ANGER} scale={3} />
        </span>
      )}
      <PixelSprite sprite={seated ? seatedSprite(standing) : standing} scale={scale} title={`${customer.id} (${customer.type})`} />
    </span>
  );
}

export function StaffFigure({ role, scale = 3 }: { role: string; scale?: number }) {
  return <PixelSprite sprite={personSprite(STAFF_LOOKS[role])} scale={scale} title={role} />;
}
