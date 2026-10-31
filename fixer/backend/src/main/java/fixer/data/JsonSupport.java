package fixer.data;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.stereotype.Component;

@Component
public class JsonSupport {
    public final ObjectMapper mapper;

    public JsonSupport(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public JsonNode read(String text) {
        try {
            return text == null ? NullNode.instance : mapper.readTree(text);
        } catch (Exception e) {
            throw new IllegalStateException("Invalid stored JSON", e);
        }
    }

    public String write(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot encode JSON", e);
        }
    }

    public ObjectNode object() {
        return mapper.createObjectNode();
    }

    /**
     * Never expose the raw verification quote in any persisted/public payload.
     */
    public JsonNode safe(JsonNode node) {
        if (node == null) return NullNode.instance;
        var copy = node.deepCopy();
        strip(copy);
        return copy;
    }

    private void strip(JsonNode node) {
        if (node.isObject()) {
            ((ObjectNode) node).remove("verification_quote");
            node.elements().forEachRemaining(this::strip);
        } else if (node.isArray()) node.elements().forEachRemaining(this::strip);
    }
}
