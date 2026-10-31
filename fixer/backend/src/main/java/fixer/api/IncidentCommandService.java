package fixer.api;

import com.fasterxml.jackson.databind.JsonNode;
import fixer.audit.AuditService;
import fixer.data.DataException;
import fixer.data.port.DeveloperDirectory;
import fixer.data.port.IncidentStore;
import fixer.data.port.TaskStore;
import fixer.dispatch.TaskSink;
import fixer.policy.Fingerprint;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class IncidentCommandService {
    private static final Set<String> FINAL_STATUSES = Set.of("AUTO_DISPATCHED", "DEDUPLICATED");

    private final IncidentStore incidents;
    private final TaskStore tasks;
    private final DeveloperDirectory developers;
    private final TaskSink taskSink;
    private final AuditService audit;

    public IncidentCommandService(IncidentStore incidents, TaskStore tasks, DeveloperDirectory developers,
                                  TaskSink taskSink, AuditService audit) {
        this.incidents = incidents;
        this.tasks = tasks;
        this.developers = developers;
        this.taskSink = taskSink;
        this.audit = audit;
    }

    public JsonNode confirm(long incidentId, String requestedAssigneeId) {
        JsonNode incident = requireIncident(incidentId);
        String status = incident.path("status").asText();
        if (FINAL_STATUSES.contains(status) || !incident.path("task").isNull()) return incident;
        if (!"PENDING_CONFIRM".equals(status) && !"NEEDS_TRIAGE".equals(status))
            throw DataException.conflict("Incident is not awaiting confirmation");
        if ("NEEDS_TRIAGE".equals(status) && (requestedAssigneeId == null || requestedAssigneeId.isBlank()))
            throw DataException.invalid("assigneeId is required for triage confirmation");

        String selectedAssigneeId = requestedAssigneeId;
        if (selectedAssigneeId == null || selectedAssigneeId.isBlank()) selectedAssigneeId = firstCandidate(incident);
        if (selectedAssigneeId == null) throw DataException.invalid("assigneeId is required when no candidate is available");
        final String assigneeId = selectedAssigneeId;
        DeveloperDirectory.Developer assignee = developers.developers().stream()
                .filter(d -> assigneeId.equals(d.id())).findFirst()
                .orElseThrow(() -> DataException.missing("Developer"));
        if (!assignee.available()) throw DataException.conflict("Developer is unavailable");

        String backupId = backupCandidate(incident, assigneeId);
        String fingerprint = incidents.fingerprint(incidentId)
                .orElseGet(() -> Fingerprint.of("manual_incident:" + incidentId));
        JsonNode diagnosis = incident.path("diagnosis");
        boolean unconfirmed = "UNKNOWN".equalsIgnoreCase(diagnosis.path("category").asText())
                || !hasVerifiedEvidence(diagnosis.path("evidence"));
        String title = taskTitle(diagnosis, unconfirmed);
        String body = taskBody(diagnosis, unconfirmed);
        String priority = switch (diagnosis.path("severity").asText()) {
            case "P1", "P2", "P3" -> diagnosis.path("severity").asText();
            default -> "P2";
        };

        TaskStore.DispatchResult result = tasks.dispatch(new TaskStore.DispatchRequest(
                incidentId, fingerprint, title, body, priority, assigneeId, backupId,
                "AUTO_DISPATCHED", "HUMAN"));
        if (result.created()) taskSink.deliver(result.taskId());
        return requireIncident(incidentId);
    }

    public JsonNode dismiss(long incidentId) {
        JsonNode incident = requireIncident(incidentId);
        if (FINAL_STATUSES.contains(incident.path("status").asText()) || !incident.path("task").isNull())
            throw DataException.conflict("Dispatched or deduplicated incident cannot be dismissed");
        incidents.updateStatus(incidentId, "DISMISSED", null);
        audit.record(incidentId, "HUMAN", "Incident dismissed", null);
        return requireIncident(incidentId);
    }

    private JsonNode requireIncident(long incidentId) {
        return incidents.find(incidentId).orElseThrow(() -> DataException.missing("Incident"));
    }

    private String firstCandidate(JsonNode incident) {
        JsonNode candidates = incident.path("candidates");
        if (!candidates.isArray()) return null;
        for (JsonNode candidate : candidates) {
            String id = candidate.path("developerId").asText(null);
            if (id != null && developers.developers().stream().anyMatch(d -> id.equals(d.id()) && d.available())) return id;
        }
        return null;
    }

    private String backupCandidate(JsonNode incident, String assigneeId) {
        JsonNode candidates = incident.path("candidates");
        if (!candidates.isArray()) return null;
        for (JsonNode candidate : candidates) {
            String id = candidate.path("developerId").asText(null);
            if (id != null && !id.equals(assigneeId)
                    && developers.developers().stream().anyMatch(d -> id.equals(d.id()) && d.available())) return id;
        }
        return null;
    }

    private boolean hasVerifiedEvidence(JsonNode evidence) {
        if (evidence == null || !evidence.isArray()) return false;
        for (JsonNode item : evidence) if (item.path("verified").asBoolean()) return true;
        return false;
    }

    private String taskTitle(JsonNode diagnosis, boolean unconfirmed) {
        String root = diagnosis.path("rootCause").asText("").trim();
        String module = diagnosis.path("suspectedModuleId").asText("").trim();
        String title = (module.isBlank() ? "" : "[" + module + "] ")
                + (root.isBlank() ? "Розібрати інцидент" : root);
        if (unconfirmed && !title.startsWith("[Ручний розбір] ")) title = "[Ручний розбір] " + title;
        return title.length() <= 80 ? title : title.substring(0, 80).trim();
    }

    private String taskBody(JsonNode diagnosis, boolean unconfirmed) {
        StringBuilder body = new StringBuilder();
        if (unconfirmed) body.append("> Ручне завдання: діагноз не підтверджено автоматично. Перевірте першопричину перед виправленням.\n\n");
        append(body, "Що сталося", diagnosis.path("rootCause").asText("Потрібно дослідити інцидент."));
        append(body, "Вплив", diagnosis.path("userImpact").asText("Не визначено."));
        append(body, "Пропоноване виправлення", diagnosis.path("suggestedFix").asText("Дослідити першопричину."));
        appendList(body, "Кроки відтворення", diagnosis.path("reproSteps"));
        appendList(body, "Невідоме", diagnosis.path("unknowns"));
        JsonNode evidence = diagnosis.path("evidence");
        if (evidence.isArray() && !evidence.isEmpty()) {
            body.append("## Підтверджені докази\n");
            for (JsonNode item : evidence) if (item.path("verified").asBoolean()) {
                body.append("- Рядок ").append(item.path("line").asInt()).append(": ")
                        .append(item.path("quote").asText()).append(" — ")
                        .append(item.path("why").asText()).append('\n');
            }
        }
        return body.toString().trim();
    }

    private void append(StringBuilder body, String heading, String value) {
        body.append("## ").append(heading).append('\n').append(value.trim()).append("\n\n");
    }

    private void appendList(StringBuilder body, String heading, JsonNode values) {
        if (values == null || !values.isArray() || values.isEmpty()) return;
        body.append("## ").append(heading).append('\n');
        for (JsonNode item : values) if (item.isTextual()) body.append("- ").append(item.asText()).append('\n');
        body.append('\n');
    }
}
