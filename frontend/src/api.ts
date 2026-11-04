/**
 * Types of the backend's JSON (see API.md in the backend zip) and the HTTP calls. The front end only reads
 * this state and sends the chosen action; every rule is decided by the backend.
 */

/** Feature flags this front end knows. It draws only features whose flag is true. */
export interface Features {
  waiter: boolean;
  chef: boolean;
  cashier: boolean;
}

export type CustomerState = "WAITING" | "SEATED" | "ORDERED" | "EATING" | "READY_TO_PAY" | "PAID" | "LEFT";
export type OrderStatus = "PENDING" | "PREPARING" | "READY" | "SERVED" | "PAID" | "CANCELLED";
export type Phase = "WAITER" | "CHEF" | "SUMMARY" | "OVER";
export type Role = "Waiter" | "Chef";

export interface Customer {
  id: string;
  type: string;
  satisfaction: number;
  /** Satisfaction recorded at payment, or -1. */
  recordedSatisfaction: number;
  state: CustomerState;
  table: string | null;
  orderId: string | null;
  arrivalTurn: number;
}

export interface Order {
  id: string;
  customerId: string;
  item: string;
  status: OrderStatus;
  unitsDone: number;
  prepUnits: number;
  priceCents: number;
  price: string;
  takenTurn: number;
  readyTurn: number;
  /** READY since an earlier turn, so the Waiter may serve it now. */
  servableNow: boolean;
}

export interface StepOption {
  value: string;
  label: string;
  detail: string | null;
  enabled: boolean;
  reason: string | null;
}

export interface ChoiceStep {
  param: "customer" | "table" | "order";
  prompt: string;
  options: StepOption[];
}

export interface Choice {
  key: string;
  label: string;
  enabled: boolean;
  reason: string | null;
  hint: string | null;
  actionType: string;
  steps: ChoiceStep[];
}

export interface GameEvent {
  turn: number;
  text: string;
}

export interface GameResult {
  victory: boolean;
  paidCount: number;
  paidMet: boolean;
  revenueCents: number;
  revenue: string;
  revenueMet: boolean;
  averageSatisfaction: string;
  satisfactionMet: boolean;
}

export interface GameState {
  stage: number;
  seed: string;
  features: Features;
  menu: { name: string; priceCents: number; price: string; prepUnits: number }[];
  turn: number;
  totalTurns: number;
  phase: Phase;
  revenueCents: number;
  revenue: string;
  averageSatisfaction: string;
  paidCount: number;
  servedCount: number;
  departureCount: number;
  targets: { paid: number; revenueCents: number; revenue: string; averageSatisfaction: number };
  queue: string[];
  tables: { id: string; occupant: string | null }[];
  customers: Customer[];
  orders: Order[];
  nextArrivalTurn: number | null;
  cashierNext: string | null;
  turnStartEvents: GameEvent[];
  turnSummary: GameEvent[];
  log: GameEvent[];
  decision: { role: Role; choices: Choice[] } | null;
  result: GameResult | null;
}

export interface ActionResponse {
  result: { success: boolean; message: string };
  events: GameEvent[];
  state: GameState;
}

export interface GameAction {
  type: string;
  customer?: string;
  table?: string;
  order?: string;
}

declare global {
  interface Window {
    RUSH_CONFIG?: { apiBase?: string };
  }
}

/** API base URL: ?api=... in the page URL, else config.js, else VITE_API_BASE at build time, else localhost:8090. */
export function apiBase(): string {
  const fromQuery = new URLSearchParams(window.location.search).get("api");
  const base = fromQuery || window.RUSH_CONFIG?.apiBase || import.meta.env.VITE_API_BASE || "http://localhost:8090";
  return base.replace(/\/+$/, "");
}

export class ApiError extends Error {}

async function call<T>(path: string, method: "GET" | "POST", params: Record<string, string | undefined> = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, value);
  }
  const url = `${apiBase()}${path}${query.size > 0 ? `?${query}` : ""}`;
  let response: Response;
  try {
    response = await fetch(url, { method });
  } catch {
    throw new ApiError(`Cannot reach the backend at ${apiBase()}. Start it with ./serve.sh (see the backend README).`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.error ?? `Server error ${response.status}`);
  return body as T;
}

export const api = {
  newGame: (params: Record<string, string | undefined>) => call<GameState>("/api/new", "POST", params),
  state: () => call<GameState>("/api/state", "GET"),
  act: (a: GameAction) => call<ActionResponse>("/api/action", "POST", { type: a.type, customer: a.customer, table: a.table, order: a.order }),
  next: () => call<ActionResponse>("/api/next", "POST"),
};
