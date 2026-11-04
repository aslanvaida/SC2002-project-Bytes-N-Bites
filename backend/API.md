# Restaurant Rush HTTP API (Stage 1)

`./serve.sh` (or `serve.bat`) starts a local JSON server on `http://localhost:8090` (`PORT` changes it). It is a second boundary next to the CLI: package `rush.web` only forwards the player's choices to `GameController` and reports the state. No game rule lives in it or in the front end.

Every response carries `Access-Control-Allow-Origin: *`, so a front end served from another port can call it. If `RUSH_WEB` points at a built front end (`dist/`), that folder is also served at `/`.

## Endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/api/status` | `{ "stage": 1, "hasGame": bool }` |
| POST | `/api/new?seed=N` | new game state (seed optional; random when absent) |
| GET | `/api/state` | current game state (404 if no game) |
| POST | `/api/action?type=T&customer=C&table=T&order=O` | `{ result, events, state }` |
| POST | `/api/next` | `{ result, events, state }`: leaves the end-of-turn summary |

`result` is `{ "success": bool, "message": string }`. A rejected action (`success: false`) explains why and does **not** use up the staff member's task: the same role is asked again. `events` are the event lines the action produced.

### Action types

| Role | `type` | Parameters |
|---|---|---|
| Waiter | `waiterSeat` | `customer`, `table` |
| Waiter | `waiterTakeOrder` | `customer` |
| Waiter | `waiterServe` | `order` |
| Waiter | `waiterWait` | none |
| Chef | `chefCook` | `order` |
| Chef | `chefWait` | none |

The roles are asked in the CLI's order: Waiter, then Chef. After the Chef's action the server ends the turn (step 4 payment and eating, step 5 waiting and abandonment) and the phase becomes `SUMMARY`; `POST /api/next` starts the next turn (arrivals) or, after turn 18, ends the game (`OVER`).

## State

```jsonc
{
  "stage": 1,
  "seed": "2002",
  "features": { "waiter": true, "chef": true, "cashier": true },
  "menu": [ { "name": "Salad", "priceCents": 900, "price": "$9.00", "prepUnits": 1 }, ... ],
  "turn": 3, "totalTurns": 18,
  "phase": "WAITER",              // WAITER | CHEF | SUMMARY | OVER
  "revenueCents": 0, "revenue": "$0.00",
  "averageSatisfaction": "N/A",   // average recorded satisfaction of paid customers, one decimal, or N/A
  "paidCount": 0, "servedCount": 0, "departureCount": 0,
  "targets": { "paid": 4, "revenueCents": 4500, "revenue": "$45.00", "averageSatisfaction": 60 },
  "queue": ["C2"],                // waiting queue, head first
  "tables": [ { "id": "T1", "occupant": "C1" }, { "id": "T2", "occupant": null } ],
  "customers": [ { "id": "C1", "type": "Regular", "satisfaction": 84, "recordedSatisfaction": -1,
                   "state": "ORDERED", "table": "T1", "orderId": "O1", "arrivalTurn": 1 } ],
  "orders": [ { "id": "O1", "customerId": "C1", "item": "Pasta", "status": "PREPARING",
                "unitsDone": 1, "prepUnits": 2, "priceCents": 1800, "price": "$18.00",
                "takenTurn": 2, "readyTurn": 0, "servableNow": false } ],
  "nextArrivalTurn": 4,           // from the arrival schedule, or null
  "cashierNext": null,            // who the Cashier would charge at the end of this turn, or null
  "turnStartEvents": [ { "turn": 3, "text": "..." } ],   // arrivals at the start of this turn
  "turnSummary": [ ... ],         // events of the turn that just ended (phase SUMMARY)
  "log": [ ... ],                 // every event so far
  "decision": {                   // null on SUMMARY / OVER
    "role": "Waiter",
    "choices": [ {
      "key": "waiterSeat", "label": "Seat a customer", "enabled": true, "reason": null,
      "hint": "C2 (Regular) is waiting outside.", "actionType": "waiterSeat",
      "steps": [ { "param": "customer", "prompt": "Who should I seat?",
                   "options": [ { "value": "C2", "label": "C2 (Regular)", "detail": "...", "enabled": true, "reason": null } ] },
                 { "param": "table", "prompt": "Which table should I seat them at?", "options": [ ... ] } ]
    } ]
  },
  "result": null                  // after turn 18: { victory, paidCount, paidMet, revenueCents, revenue,
                                  //   revenueMet, averageSatisfaction, satisfactionMet }
}
```

Customer `state`: `WAITING`, `SEATED`, `ORDERED`, `EATING`, `READY_TO_PAY`, `PAID`, `LEFT`. Order `status`: `PENDING`, `PREPARING`, `READY`, `SERVED`, `PAID`, `CANCELLED`.

A disabled choice or option carries the controller's reason, so the front end can show why it is not possible. The front end sends `actionType` plus one answer per step (`param` = `customer`, `table` or `order`).

## Feature flags

`features` lists what this stage has. Stage 1: `waiter`, `chef`, `cashier` (all true). Later stages add flags; a front end draws only features whose flag is true.
