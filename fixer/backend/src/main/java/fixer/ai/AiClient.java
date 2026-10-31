package fixer.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** Java-клієнт сервісу Python AI. Повторює лише помилки мережі та HTTP 5xx, один раз. */
@Component
public class AiClient {
    private final String endpoint;
    private final HttpClient http;
    private final ObjectMapper mapper;

    public AiClient(@Value("${fixer.ai.base-url:http://localhost:8000}") String baseUrl,
                    @Value("${fixer.ai.timeout-ms:30000}") int timeoutMs,
                    ObjectMapper mapper) {
        this.endpoint = baseUrl.replaceAll("/+$", "") + "/ai/analyze-log";
        this.http = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofMillis(Math.max(1, timeoutMs)))
                .build();
        this.mapper = mapper;
        this.timeoutMs = Math.max(1, timeoutMs);
    }

    private final int timeoutMs;

    public JsonNode analyze(JsonNode request) {
        if (request == null || !request.isObject()) throw new IllegalArgumentException("AI request must be a JSON object");
        final String body;
        try { body = mapper.writeValueAsString(request); }
        catch (IOException e) { throw new AiClientException("Could not encode AI request", e); }

        for (int attempt = 0; attempt < 2; attempt++) {
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(endpoint))
                    .version(HttpClient.Version.HTTP_1_1)
                    .timeout(Duration.ofMillis(timeoutMs))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            try {
                HttpResponse<String> response = http.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                int status = response.statusCode();
                if (status >= 200 && status < 300) {
                    JsonNode result = mapper.readTree(response.body());
                    if (result == null || !result.isObject()) throw new AiClientException("AI returned an empty or non-object response");
                    return result;
                }
                AiClientException error = new AiClientException("AI service returned HTTP " + status + ": " + response.body());
                if (status < 500 || attempt == 1) throw error;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AiClientException("AI request was interrupted", e);
            } catch (IOException e) {
                if (attempt == 1) throw new AiClientException("AI request failed after one retry", e);
            }
        }
        throw new AiClientException("AI request failed after one retry");
    }

    public static class AiClientException extends RuntimeException {
        public AiClientException(String message) { super(message); }
        public AiClientException(String message, Throwable cause) { super(message, cause); }
    }
}
