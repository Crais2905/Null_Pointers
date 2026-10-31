package fixer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fixer.evidence.EvidenceVerifier;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EvidenceVerifierTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void returnsOnlyQuotesVerifiedAgainstTheirNumberedRawLine() throws Exception {
        JsonNode evidence = mapper.readTree("""
                [
                  {"line":1,"quote":"masked text","why":"valid","verification_quote":"email=a@example.com"},
                  {"line":2,"quote":"wrong line","why":"wrong","verification_quote":"email=a@example.com"},
                  {"line":3,"quote":"missing","why":"missing","verification_quote":"not present"}
                ]
                """);
        JsonNode actual = EvidenceVerifier.verify(evidence, "INFO email=a@example.com\nWARN other\n");

        assertEquals(1, actual.size());
        assertEquals(1, actual.get(0).get("line").asInt());
        assertEquals("masked text", actual.get(0).get("quote").asText());
        assertTrue(actual.get(0).get("verified").asBoolean());
        assertFalse(actual.get(0).has("verification_quote"));
    }

    @Test
    void rejectsInvalidLineNumbersAndQuotesOver200Characters() throws Exception {
        String tooLong = "x".repeat(201);
        JsonNode evidence = mapper.readTree("""
                [
                  {"line":0,"quote":"q","verification_quote":"line"},
                  {"line":1,"quote":"q","verification_quote":"%s"},
                  {"line":"1","quote":"q","verification_quote":"line"}
                ]
                """.formatted(tooLong));
        assertTrue(EvidenceVerifier.verify(evidence, "line").isEmpty());
    }

    @Test
    void acceptsEmptyInputAsNoEvidence() {
        assertTrue(EvidenceVerifier.verify(null, "line").isEmpty());
        assertTrue(EvidenceVerifier.verify(mapper.createArrayNode(), "").isEmpty());
    }
}
