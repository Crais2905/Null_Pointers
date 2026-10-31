package fixer;

import com.fasterxml.jackson.databind.ObjectMapper;
import fixer.ai.AiClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class AiClientTest {
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) server.stop(0);
    }

    @Test
    void retriesOneServerErrorAndReturnsJsonResponse() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        startServer(exchange -> {
            int call = calls.incrementAndGet();
            byte[] response = (call == 1 ? "temporary failure" : "{\"signature\":\"ok\"}").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(call == 1 ? 503 : 200, response.length);
            try (var body = exchange.getResponseBody()) { body.write(response); }
        });

        var result = client().analyze(new ObjectMapper().createObjectNode().put("log_text", "log"));

        assertEquals(2, calls.get());
        assertEquals("ok", result.get("signature").asText());
    }

    @Test
    void doesNotRetryClientErrors() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        startServer(exchange -> {
            calls.incrementAndGet();
            byte[] response = "bad request".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(400, response.length);
            try (var body = exchange.getResponseBody()) { body.write(response); }
        });

        assertThrows(AiClient.AiClientException.class,
                () -> client().analyze(new ObjectMapper().createObjectNode().put("log_text", "log")));
        assertEquals(1, calls.get());
    }

    @Test
    void rejectsNonObjectRequestsWithoutCallingService() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        startServer(exchange -> calls.incrementAndGet());
        assertThrows(IllegalArgumentException.class, () -> client().analyze(new ObjectMapper().createArrayNode()));
        assertEquals(0, calls.get());
    }

    private AiClient client() {
        return new AiClient("http://localhost:" + server.getAddress().getPort(), 2_000, new ObjectMapper());
    }

    private void startServer(com.sun.net.httpserver.HttpHandler handler) throws Exception {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/ai/analyze-log", handler);
        server.start();
    }
}
