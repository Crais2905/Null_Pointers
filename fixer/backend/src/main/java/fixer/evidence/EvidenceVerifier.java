package fixer.evidence;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/** Кожна цитата має міститися в рядку N сирого логу; хибні цитати відкидаються. */
public final class EvidenceVerifier {
    private static final ObjectMapper JSON = new ObjectMapper();

    private EvidenceVerifier() {}

    /** Повертає лише підтверджені цитати у зовнішньому форматі API. Нумерація рядків починається з 1. */
    public static ArrayNode verify(JsonNode evidence, String rawLog) {
        ArrayNode verified = JSON.createArrayNode();
        if (evidence == null || !evidence.isArray() || rawLog == null || rawLog.isEmpty()) return verified;

        String[] lines = rawLog.split("\\R", -1);
        for (JsonNode item : evidence) {
            if (item == null || !item.isObject()) continue;
            JsonNode lineNode = item.get("line");
            JsonNode quoteNode = item.get("verification_quote");
            if (lineNode == null || !lineNode.isIntegralNumber() || quoteNode == null || !quoteNode.isTextual()) continue;
            int line = lineNode.asInt();
            String verificationQuote = quoteNode.asText();
            if (line < 1 || line > lines.length || verificationQuote.isBlank() || verificationQuote.length() > 200) continue;
            if (!lines[line - 1].contains(verificationQuote)) continue;

            ObjectNode output = JSON.createObjectNode();
            output.put("line", line);
            output.put("quote", text(item, "quote"));
            output.put("why", text(item, "why"));
            output.put("verified", true);
            verified.add(output);
        }
        return verified;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && value.isTextual() ? value.asText() : "";
    }
}
