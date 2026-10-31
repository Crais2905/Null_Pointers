package fixer.data.port;
/** Микола implements; Славік consumes. See contracts/DECISIONS.md. */
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Optional;
public interface IncidentStore {
 record Submission(String userMessage, String log, Long orderId, Long userId, String complaintAt, String source) {}
 record Accepted(long id, String status, boolean reused) {}
 Accepted accept(Submission submission);
 Optional<JsonNode> find(long id);
 void saveAnalysis(long id, JsonNode aiResponse, JsonNode verifiedDiagnosis, double finalConfidence, String fingerprint, JsonNode candidates, JsonNode decision, long pipelineMs);
 void updateStatus(long id, String status, String error);
 void resetDemo();
}
