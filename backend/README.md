# Restaurant Rush (SC2002)

Restaurant Rush is a turn-based command-line restaurant game in Java. You play the manager. Each turn you decide what the Waiter and the Chef do, while customers arrive, lose patience, order (they choose their own food), eat and pay. Staff time is limited, so the order you serve people in decides whether you meet the targets after 18 turns.

## Requirements

- JDK 17 or newer (the code is compiled with `--release 17`).
- No external libraries, no build tool, no network access.

## Build, run, test

Linux / macOS:

```bash
./build.sh
```

```bash
./run.sh
```

```bash
./run.sh --seed 2002
```

```bash
./test.sh
```

Windows:

```bat
build.bat
run.bat --seed 2002
test.bat
```

`--seed <long>` sets the seed of the customers' food choices (default 2002). The same seed and the same input always give the same game.

`./test.sh` (or `test.bat`) builds the game, runs the rule self-tests (`src/test/java/rush/RulesSelfTest.java`), replays every scripted run in `runs/expected.txt`, saves the transcripts to `runs/logs/`, checks each final `RESULT:` line, compares every transcript byte for byte with `runs/expected-output/`, and finally runs the web adapter self-test (`src/test/java/rush/web/WebAdapterSelfTest.java`), which replays the same scripts through the HTTP adapter and checks that every event line matches. It prints `ALL CHECKS PASSED` on success.

## Replaying the scripted runs

```bash
./run.sh --seed 2002 < runs/stage1-victory.txt
```

```bash
./run.sh --seed 2002 < runs/stage1-defeat.txt
```

When input is piped, the game echoes each input line so the transcript reads like an interactive session. Lines starting with `#` are comments. If the input ends early, every remaining prompt defaults to Wait. See [docs/TEST_NOTES.md](docs/TEST_NOTES.md) for turn-by-turn walkthroughs and [docs/RULES_AND_ASSUMPTIONS.md](docs/RULES_AND_ASSUMPTIONS.md) for the exact rules.

## Reproducible runs

| Script | Seed | Command | Expected result | Expected output |
|---|---|---|---|---|
| `runs/stage1-victory.txt` | 2002 | `./run.sh --seed 2002 < runs/stage1-victory.txt` | VICTORY (4 paid, $51.00, avg 78.0) | `runs/expected-output/stage1-victory.log` |
| `runs/stage1-defeat.txt` | 2002 | `./run.sh --seed 2002 < runs/stage1-defeat.txt` | DEFEAT (1 paid, $9.00) | `runs/expected-output/stage1-defeat.log` |

## Web API (for the web front end)

```bash
./build.sh
```

```bash
./serve.sh
```

This starts a JSON server on `http://localhost:8090` (Windows: `build.bat` then `serve.bat`; `PORT=9000 ./serve.sh` for another port). The Stage 1 front end (`stage-1-frontend.zip`) talks to it. To serve a built front end from the same port, run `RUSH_WEB=/path/to/stage-1-frontend/dist ./serve.sh` and open `http://localhost:8090`. Endpoints and the JSON state are described in [API.md](API.md).

## Layout

| Package | Role |
|---|---|
| `rush.entity` | Customers, staff (Waiter, Chef, Cashier), Table, Order, Menu, Restaurant, Money |
| `rush.control` | `GameController` (turn engine), `GameConfig`, `ArrivalSchedule`, `BillCalculator`, `GameResult` |
| `rush.boundary` | `ConsoleUI` and `InputReader` (the CLI) |
| `rush.web` | HTTP/JSON adapter for the web front end: `WebServer`, `GameSession`, `StateJson`, `Json` (a second boundary; no rules) |
