package rush.web;

import java.util.List;
import rush.control.ArrivalSchedule;
import rush.control.GameConfig;
import rush.control.GameController;
import rush.control.GameEvent;
import rush.entity.ActionResult;

/**
 * Web boundary for one game, the HTTP counterpart of the CLI's {@code ConsoleUI}. It asks the roles in the
 * same order as the CLI (Waiter, then Chef), forwards each chosen command to the {@link GameController}, and
 * closes the turn after the Chef. It never applies a game rule itself: legality, prices, eating and payment are
 * all decided by the controller and the entities.
 */
final class GameSession {

    /** The decision the front end should ask for next. */
    enum Phase { WAITER, CHEF, SUMMARY, OVER }

    private final long seed;
    private final ArrivalSchedule schedule;
    private final GameController game;
    private boolean over;
    private List<GameEvent> turnStartEvents = List.of();
    private List<GameEvent> lastTurnEvents = List.of();

    private GameSession(long seed, ArrivalSchedule schedule, GameController game) {
        this.seed = seed;
        this.schedule = schedule;
        this.game = game;
    }

    /**
     * Starts a base-setting game on turn 1 (same wiring as the CLI's {@code Main}).
     *
     * @param seed game seed (drives the customers' food choices)
     * @return the session
     */
    static GameSession start(long seed) {
        return start(seed, GameConfig.base(seed), ArrivalSchedule.base(seed));
    }

    /** Starts a game with an explicit configuration and schedule (used by tests). */
    static GameSession start(long seed, GameConfig config, ArrivalSchedule schedule) {
        GameSession session = new GameSession(seed, schedule, new GameController(config, schedule));
        session.turnStartEvents = session.game.beginTurn();
        return session;
    }

    /** @return the decision to ask for now */
    Phase phase() {
        if (over) {
            return Phase.OVER;
        }
        if (game.hasChefActed()) {
            // The Chef acted, so endTurn() has run: show the summary until next() is called.
            return Phase.SUMMARY;
        }
        if (!game.hasWaiterActed()) {
            return Phase.WAITER;
        }
        return Phase.CHEF;
    }

    /**
     * Forwards one decision to the back end. The command must belong to the role being asked now.
     *
     * @param type     command, e.g. "waiterSeat"
     * @param customer customer id, if the command needs one
     * @param table    table id, if needed
     * @param order    order id, if needed
     * @return the back end's result (or why the command is out of turn)
     */
    ActionResult perform(String type, String customer, String table, String order) {
        Phase expected = phaseOf(type);
        if (expected == null) {
            return ActionResult.fail("Unknown action '" + type + "'.");
        }
        if (expected != phase()) {
            return ActionResult.fail("It is not the " + roleName(expected) + "'s turn to decide (now: "
                    + roleName(phase()) + ").");
        }
        ActionResult result = dispatch(type, customer, table, order);
        if (result.isSuccess() && expected == Phase.CHEF) {
            // The Chef is the last role: run payment, eating, waiting and abandonment.
            lastTurnEvents = game.endTurn();
        }
        return result;
    }

    /** Maps a command to the controller call. */
    private ActionResult dispatch(String type, String customer, String table, String order) {
        return switch (type) {
            case "waiterSeat" -> game.waiterSeat(customer, table);
            case "waiterTakeOrder" -> game.waiterTakeOrder(customer);
            case "waiterServe" -> game.waiterServe(order);
            case "waiterWait" -> game.waiterWait();
            case "chefCook" -> game.chefAdvance(order);
            case "chefWait" -> game.chefWait();
            default -> ActionResult.fail("Unknown action '" + type + "'.");
        };
    }

    /** Leaves the end-of-turn summary: starts the next turn, or finishes the game after the last one. */
    ActionResult next() {
        if (phase() != Phase.SUMMARY) {
            return ActionResult.fail("The turn is not finished yet.");
        }
        if (game.isGameOver()) {
            over = true;
            return ActionResult.ok("Game over.");
        }
        turnStartEvents = game.beginTurn();
        lastTurnEvents = List.of();
        return ActionResult.ok("Turn " + game.getCurrentTurn() + " begins.");
    }

    /** @return the role a command belongs to, or null if unknown */
    static Phase phaseOf(String type) {
        if (type.startsWith("waiter")) {
            return Phase.WAITER;
        }
        if (type.startsWith("chef")) {
            return Phase.CHEF;
        }
        return null;
    }

    static String roleName(Phase phase) {
        return switch (phase) {
            case WAITER -> "Waiter";
            case CHEF -> "Chef";
            case SUMMARY -> "end-of-turn summary";
            case OVER -> "game-over screen";
        };
    }

    GameController game() {
        return game;
    }

    ArrivalSchedule schedule() {
        return schedule;
    }

    long seed() {
        return seed;
    }

    boolean isOver() {
        return over;
    }

    /** Events of the turn that just ended (shown on the summary). */
    List<GameEvent> lastTurnEvents() {
        return lastTurnEvents;
    }

    /** Events at the start of the current turn (arrivals). */
    List<GameEvent> turnStartEvents() {
        return turnStartEvents;
    }
}
