package fixer.data.port;
/** Микола implements; Славік consumes. See contracts/DECISIONS.md. */
import com.fasterxml.jackson.databind.JsonNode;
public interface AuditStore {
 void append(long incidentId, String actor, String event, JsonNode payload);
}
