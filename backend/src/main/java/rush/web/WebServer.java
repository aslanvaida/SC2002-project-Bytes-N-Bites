package rush.web;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import rush.control.GameEvent;
import rush.entity.ActionResult;

/**
 * Local HTTP/JSON server for the web front end (JDK only: com.sun.net.httpserver; listens on 127.0.0.1).
 * Endpoints are described in API.md. Every response allows any origin (CORS), so the front end can be served
 * from another port. If the environment variable RUSH_WEB points at a built front end (its dist/ folder), that
 * folder is also served at "/".
 */
public final class WebServer {

    private final Path webRoot;
    private GameSession session;

    private WebServer(Path webRoot) {
        this.webRoot = webRoot == null ? null : webRoot.toAbsolutePath().normalize();
    }

    /**
     * Starts the server. Environment: PORT (default 8090), RUSH_WEB (optional front-end dist/ folder).
     *
     * @param args unused
     * @throws IOException if the port cannot be opened
     */
    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8090"));
        String web = System.getenv("RUSH_WEB");
        WebServer app = new WebServer(web == null || web.isBlank() ? null : Paths.get(web));
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/", app::handleApi);
        server.createContext("/", app::handleStatic);
        server.start();
        System.out.println("Restaurant Rush API on http://localhost:" + port + "/api/"
                + (app.webRoot != null ? " (front end: http://localhost:" + port + "/)" : ""));
    }

    // ------------------------------------------------------------------ API

    private synchronized void handleApi(HttpExchange ex) throws IOException {
        if ("OPTIONS".equals(ex.getRequestMethod())) {
            send(ex, 204, "text/plain", new byte[0]);
            return;
        }
        try {
            String path = ex.getRequestURI().getPath();
            Map<String, String> q = query(ex);
            boolean post = "POST".equals(ex.getRequestMethod());
            switch (path) {
                case "/api/status" -> send(ex, 200, new Json.Obj().put("stage", 1)
                        .put("hasGame", session != null && !session.isOver()).toString());
                case "/api/new" -> {
                    requirePost(post);
                    session = newSession(seedOf(q), q);
                    send(ex, 200, StateJson.of(session));
                }
                case "/api/state" -> {
                    if (requireGame(ex)) {
                        send(ex, 200, StateJson.of(session));
                    }
                }
                case "/api/action", "/api/next" -> {
                    requirePost(post);
                    if (!requireGame(ex)) {
                        return;
                    }
                    int before = session.game().getEventLog().size();
                    ActionResult result = path.equals("/api/next")
                            ? session.next()
                            : session.perform(q.getOrDefault("type", ""), q.getOrDefault("customer", ""),
                                    q.getOrDefault("table", ""), q.getOrDefault("order", ""));
                    List<GameEvent> log = session.game().getEventLog();
                    send(ex, 200, new Json.Obj()
                            .raw("result", new Json.Obj().put("success", result.isSuccess())
                                    .put("message", result.getMessage()).toString())
                            .raw("events", StateJson.events(log.subList(before, log.size())))
                            .raw("state", StateJson.of(session))
                            .toString());
                }
                default -> send(ex, 404, error("Unknown endpoint " + path));
            }
        } catch (NumberFormatException e) {
            send(ex, 400, error("Seed must be a whole number."));
        } catch (IllegalArgumentException | IllegalStateException e) {
            send(ex, 400, error(e.getMessage()));
        }
    }

    /** Creates the game for POST /api/new. */
    private static GameSession newSession(long seed, Map<String, String> q) {
        return GameSession.start(seed);
    }

    private static long seedOf(Map<String, String> q) {
        String seed = q.get("seed");
        return seed != null && !seed.isBlank() ? Long.parseLong(seed.trim()) : new Random().nextInt(1_000_000);
    }

    private boolean requireGame(HttpExchange ex) throws IOException {
        if (session == null) {
            send(ex, 404, error("No game in progress. POST /api/new first."));
            return false;
        }
        return true;
    }

    private static void requirePost(boolean post) {
        if (!post) {
            throw new IllegalArgumentException("Use POST for this endpoint.");
        }
    }

    private static String error(String message) {
        return new Json.Obj().put("error", message).toString();
    }

    private static Map<String, String> query(HttpExchange ex) {
        Map<String, String> params = new HashMap<>();
        String raw = ex.getRequestURI().getRawQuery();
        if (raw != null) {
            for (String pair : raw.split("&")) {
                int eq = pair.indexOf('=');
                if (eq > 0) {
                    params.put(URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8),
                            URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8));
                }
            }
        }
        return params;
    }

    // ------------------------------------------------------------------ optional static front end

    private void handleStatic(HttpExchange ex) throws IOException {
        if (webRoot == null) {
            send(ex, 200, "text/plain; charset=utf-8",
                    "Restaurant Rush API server. See API.md; the front end is served separately (or set RUSH_WEB).");
            return;
        }
        String path = ex.getRequestURI().getPath();
        Path file = webRoot.resolve(path.substring(1)).normalize();
        if (!file.startsWith(webRoot) || Files.isDirectory(file) || !Files.exists(file)) {
            file = webRoot.resolve("index.html");
        }
        if (!Files.exists(file)) {
            send(ex, 404, "text/plain", "No index.html in RUSH_WEB=" + webRoot);
            return;
        }
        send(ex, 200, contentType(file), Files.readAllBytes(file));
    }

    private static String contentType(Path file) {
        String name = file.getFileName().toString();
        if (name.endsWith(".html")) {
            return "text/html; charset=utf-8";
        }
        if (name.endsWith(".js")) {
            return "text/javascript; charset=utf-8";
        }
        if (name.endsWith(".css")) {
            return "text/css; charset=utf-8";
        }
        if (name.endsWith(".svg")) {
            return "image/svg+xml";
        }
        return "application/octet-stream";
    }

    private static void send(HttpExchange ex, int status, String json) throws IOException {
        send(ex, status, "application/json; charset=utf-8", json);
    }

    private static void send(HttpExchange ex, int status, String type, String body) throws IOException {
        send(ex, status, type, body.getBytes(StandardCharsets.UTF_8));
    }

    private static void send(HttpExchange ex, int status, String type, byte[] body) throws IOException {
        ex.getResponseHeaders().set("Content-Type", type);
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
        if (status == 204) {
            ex.sendResponseHeaders(status, -1);
            ex.close();
            return;
        }
        ex.sendResponseHeaders(status, body.length);
        try (OutputStream out = ex.getResponseBody()) {
            out.write(body);
        }
    }
}
