package fixer.data.port;
/** Микола implements; Славік consumes. See contracts/DECISIONS.md. */
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Optional;
public interface TaskStore {
 record DispatchRequest(long incidentId, String fingerprint, String title, String bodyMd, String priority, String assigneeId, String backupId, String outcome, String actor) {}
 record DispatchResult(long taskId, boolean created, boolean duplicate, int occurrences) {}
 DispatchResult dispatch(DispatchRequest request);
 Optional<JsonNode> findOpenByFingerprint(String fingerprint);
 Optional<JsonNode> find(long taskId);
 long countOpen(String developerId);
 java.util.List<JsonNode> list(String assigneeId);
 JsonNode setStatus(long taskId, String status);
 void updateDelivery(long taskId, String status, String error);
}
