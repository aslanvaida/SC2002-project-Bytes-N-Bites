# Restaurant Rush: Stage 1 web front end

A React + TypeScript client for the Stage 1 backend (`stage-1-backend.zip`). It draws the restaurant from the backend's JSON state and sends the action the player picks. It contains **no game rules and no turn counting**: which choices exist, why a choice is disabled, prices, eating and payment all come from the backend.

## Run it (no Node needed)

`dist/` is prebuilt. Start the backend first (in the backend folder):

```bash
./build.sh
```

```bash
./serve.sh
```

Then either:

- **Let the backend serve it:** `RUSH_WEB=/path/to/stage-1-frontend/dist ./serve.sh` and open `http://localhost:8090`.
- **Serve `dist/` yourself**, for example:

```bash
python3 -m http.server 5173 --directory dist
```

  and open `http://localhost:5173`. (Opening `dist/index.html` straight from disk does not work: browsers block module scripts on `file://`.)

## API base URL

Default `http://localhost:8090`. To change it without rebuilding, edit `dist/config.js` (`window.RUSH_CONFIG = { apiBase: "..." }`), or open the page with `?api=http://localhost:9000`. At build time `VITE_API_BASE` also works.

## Build from source (Node.js 20+)

```bash
npm ci
```

```bash
npm run build
```

`npm run build` type-checks (`tsc -b`) and writes `dist/`. `npm run lint` runs oxlint. `npm run dev` starts a dev server on port 5173 (it calls the API at the configured base URL).

## Backend feature flags used

The state's `features` object lists what the stage has; this front end draws only features whose flag is true.

| Flag | Used for |
|---|---|
| `waiter` | Waiter figure and decisions |
| `chef` | Kitchen, Chef figure and decisions |
| `cashier` | Cashier booth and its caption |

(Stage 1 has all three; the client only knows these flags.)

## Files

| File | What |
|---|---|
| `src/api.ts` | JSON types and the HTTP calls; API base URL |
| `src/App.tsx` | Main menu and game screen |
| `src/components/World.tsx` | The restaurant scene |
| `src/components/DecisionBox.tsx` | The deciding role's options and follow-up questions |
| `src/components/Panels.tsx` | HUD, end-of-turn summary, log, result |
| `src/sprites.ts`, `src/Pixel.tsx` | Pixel art (reused from the Bytes N Bites client) |
| `public/config.js` | Run-time API base URL |
