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
        this.http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofMillis(Math.max(1, timeoutMs))).build();
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
                    .timeout(Duration.ofMillis(timeoutMs))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            try {
                HttpResponse<String> response = http.send(httpRequest, HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();
                if (status >= 200 && status < 300) {
                    JsonNode result = mapper.readTree(response.body());
                    if (result == null || !result.isObject()) throw new AiClientException("AI returned an empty or non-object response");
                    return result;
                }
                AiClientException error = AiClientException.providerFailure("AI service returned HTTP " + status, safeProviderMessage(response.body()));
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

    private String safeProviderMessage(String body) {
        try {
            String detail = mapper.readTree(body).path("detail").asText("");
            return switch (detail) {
                case "Gemini temporarily overloaded; try later or select another model" -> "Gemini тимчасово перевантажений. Повторіть пізніше або змініть модель у .env.";
                case "Gemini quota or rate limit reached" -> "Вичерпано квоту Gemini або перевищено ліміт запитів.";
                case "Gemini rejected the API key or its permissions" -> "Gemini відхилив ключ або його права доступу.";
                case "Gemini model unavailable; check LLM_MODEL" -> "Обрана Gemini-модель недоступна. Перевірте LLM_MODEL у .env.";
                case "Cannot connect to Gemini" -> "Немає з’єднання з Gemini.";
                case "Gemini timeout" -> "Gemini не відповів вчасно.";
                default -> null;
            };
        } catch (Exception ignored) { return null; }
    }

    public static class AiClientException extends RuntimeException {
        private String userMessage;
        public String userMessage() { return userMessage; }
        public static AiClientException providerFailure(String message, String safeMessage) {
            var error = new AiClientException(message);
            error.userMessage = safeMessage;
            return error;
        }
        public AiClientException(String message) { super(message); }
        public AiClientException(String message, Throwable cause) { super(message, cause); }
    }
}
