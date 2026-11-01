package rush.web;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import rush.control.GameEvent;

/**
 * Checks the web adapter against the CLI: replays every scripted run listed in runs/expected.txt through
 * {@link GameSession} (answering the roles in the CLI's prompt order) and compares every event line and the
 * final result with the CLI's expected transcript in runs/expected-output/. Also checks out-of-turn and unknown
 * commands and the JSON snapshot. Usage: java ... rush.web.WebAdapterSelfTest [project-dir]
 */
public final class WebAdapterSelfTest {

    private static int passed;
    private static int failed;

    private WebAdapterSelfTest() {
    }

    public static void main(String[] args) throws IOException {
        Path root = Paths.get(args.length > 0 ? args[0] : ".");
        for (String line : Files.readAllLines(root.resolve("runs/expected.txt"), StandardCharsets.UTF_8)) {
            String[] f = line.trim().split("\\s+");
            if (line.isBlank() || line.trim().startsWith("#") || f.length < 3) {
                continue;
            }
            String name = f[0].replace(".txt", "");
            GameSession s = replay(root, name, GameSession.start(Long.parseLong(f[1])));
            check(name + ": all " + eventLines(s).size() + " event lines identical to the CLI transcript",
                    eventLines(s).equals(cliEventLines(root, name)));
            String result = "RESULT: " + (s.game().getResult().isVictory() ? "VICTORY" : "DEFEAT");
            check(name + ": " + result + " (expected " + f[2] + ")", result.equals("RESULT: " + f[2]));
        }
        outOfTurn();
        snapshot();
        System.out.println("WebAdapterSelfTest: " + passed + " passed, " + failed + " failed");
        if (failed > 0) {
            System.exit(1);
        }
    }

    private static void outOfTurn() {
        GameSession s = GameSession.start(1);
        check("first decision is the Waiter's", s.phase() == GameSession.Phase.WAITER);
        check("Chef command before the Waiter is rejected", !s.perform("chefWait", "", "", "").isSuccess());
        check("unknown command is rejected", !s.perform("dance", "", "", "").isSuccess());
        check("next() is refused mid-turn", !s.next().isSuccess());
        check("invalid seat is explained and the Waiter can still act",
                !s.perform("waiterSeat", "C9", "T1", "").isSuccess() && s.phase() == GameSession.Phase.WAITER);
        check("valid seat accepted", s.perform("waiterSeat", "C1", "T1", "").isSuccess() && s.phase() == GameSession.Phase.CHEF);
        check("Chef ends the turn", s.perform("chefWait", "", "", "").isSuccess() && s.phase() == GameSession.Phase.SUMMARY);
        check("next() starts turn 2", s.next().isSuccess() && s.game().getCurrentTurn() == 2);
    }

    private static void snapshot() {
        String json = StateJson.of(GameSession.start(1));
        check("state JSON has the features object", json.contains("\"features\":{"));
        check("state JSON asks the Waiter with a seat question",
                json.contains("\"role\":\"Waiter\"") && json.contains("Who should I seat?"));
        check("state JSON lists the menu", json.contains("\"name\":\"Pasta\""));
    }

    // ------------------------------------------------------------------ script replay

    /**
     * Feeds a CLI input script (runs/NAME.txt) to a session, answering the roles in the CLI's prompt order.
     * Invalid input is rejected and the same role is asked again, exactly as in the CLI.
     */
    static GameSession replay(Path root, String name, GameSession s) throws IOException {
        Reader in = new Reader(script(root, name));
        while (s.phase() != GameSession.Phase.OVER) {
            switch (s.phase()) {
                case WAITER -> {
                    switch (in.next("0")) {
                        case "0" -> s.perform("waiterWait", "", "", "");
                        case "1" -> {
                            String customer = in.id("C");
                            s.perform("waiterSeat", customer, in.id("T"), "");
                        }
                        case "2" -> s.perform("waiterTakeOrder", in.id("C"), "", "");
                        case "3" -> s.perform("waiterServe", "", "", in.id("O"));
                        default -> { }
                    }
                }
                case CHEF -> {
                    String c = in.next("0");
                    if (c.equals("0")) {
                        s.perform("chefWait", "", "", "");
                    } else if (c.equals("1")) {
                        s.perform("chefCook", "", "", in.id("O"));
                    }
                }
                case SUMMARY -> s.next();
                default -> { }
            }
        }
        return s;
    }

    static List<String> script(Path root, String name) throws IOException {
        List<String> input = new ArrayList<>();
        for (String line : Files.readAllLines(root.resolve("runs/" + name + ".txt"), StandardCharsets.UTF_8)) {
            if (!line.trim().startsWith("#")) {
                input.add(line.trim());
            }
        }
        return input;
    }

    /** The "  * " event lines of a CLI transcript, without staff "waits" lines (the adapter logs the same). */
    static List<String> cliEventLines(Path root, String name) throws IOException {
        List<String> expected = new ArrayList<>();
        for (String line : Files.readAllLines(root.resolve("runs/expected-output/" + name + ".log"), StandardCharsets.UTF_8)) {
            if (line.startsWith("  * ") && !line.contains(" waits this turn.")) {
                expected.add(line.substring(4));
            }
        }
        return expected;
    }

    static List<String> eventLines(GameSession s) {
        List<String> actual = new ArrayList<>();
        for (GameEvent e : s.game().getEventLog()) {
            if (!e.getText().contains(" waits this turn.")) {
                actual.add(e.getText());
            }
        }
        return actual;
    }

    static void check(String what, boolean ok) {
        if (ok) {
            passed++;
            System.out.println("PASS " + what);
        } else {
            failed++;
            System.out.println("FAIL " + what);
        }
    }

    /** Input lines with the CLI's defaults at end of input and its bare-number id shorthand. */
    static final class Reader {
        private final List<String> lines;
        private int i;

        Reader(List<String> lines) {
            this.lines = lines;
        }

        String next(String def) {
            return i < lines.size() ? lines.get(i++) : def;
        }

        String id(String prefix) {
            String t = next("");
            return t.matches("\\d+") ? prefix + t : t;
        }
    }
}
