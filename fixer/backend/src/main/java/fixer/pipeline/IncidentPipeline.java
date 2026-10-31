package fixer.pipeline;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import fixer.ai.AiClient;
import fixer.audit.AuditService;
import fixer.data.LogStorage;
import fixer.data.port.DeveloperDirectory;
import fixer.data.port.IncidentStore;
import fixer.data.port.SettingsStore;
import fixer.data.port.TaskStore;
import fixer.dispatch.TaskSink;
import fixer.evidence.ConfidenceCalibrator;
import fixer.evidence.EvidenceVerifier;
import fixer.policy.DispatchPolicy;
import fixer.policy.Fingerprint;
import fixer.routing.Router;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/** Executes AI analysis, evidence verification, routing and policy for one accepted incident. */
@Service
public class IncidentPipeline {
    private static final Logger log = LoggerFactory.getLogger(IncidentPipeline.class);
    private static final Set<String> KNOWN_CATEGORIES = Set.of(
            "PAYMENT_DUPLICATE", "UNHANDLED_EXCEPTION", "UPSTREAM_TIMEOUT",
            "AUTH_FAILURE", "DATA_INCONSISTENCY", "CONFIG_ERROR", "UNKNOWN");

    private final IncidentStore incidents;
    private final TaskStore tasks;
    private final DeveloperDirectory developers;
    private final SettingsStore settings;
    private final LogStorage logs;
    private final AiClient ai;
    private final TaskSink taskSink;
    private final AuditService audit;
    private final ObjectMapper mapper;

    public IncidentPipeline(IncidentStore incidents, TaskStore tasks, DeveloperDirectory developers,
                            SettingsStore settings, LogStorage logs, AiClient ai, TaskSink taskSink,
                            AuditService audit, ObjectMapper mapper) {
        this.incidents = incidents;
        this.tasks = tasks;
        this.developers = developers;
        this.settings = settings;
        this.logs = logs;
        this.ai = ai;
        this.taskSink = taskSink;
        this.audit = audit;
        this.mapper = mapper;
    }

    /** Starts from an already persisted NEW incident; invoked asynchronously by the API layer. */
    @Async("pipelineExecutor")
    public void analyze(long incidentId) {
        long started = System.nanoTime();
        ArrayNode stages = mapper.createArrayNode();
        boolean analysisStored = false;
        try {
            JsonNode incident = incidents.find(incidentId)
                    .orElseThrow(() -> new IllegalArgumentException("Incident not found"));
            if (!"NEW".equals(incident.path("status").asText())) return;

            incidents.updateStatus(incidentId, "ANALYZING", null);
            String rawLog = logs.read(incidentId);
            JsonNode response = ai.analyze(buildAiRequest(incidentId, incident, rawLog));
            JsonNode diagnosis = requireDiagnosis(response);
            addStage(incidentId, stages, "PARSE", "DONE", aiTiming(response, "parse"));
            addStage(incidentId, stages, "DETECT", "DONE", aiTiming(response, "detectors"));
            addStage(incidentId, stages, "DIAGNOSE", "DONE", aiTiming(response, "llm"));

            long verifyStart = System.nanoTime();
            ArrayNode verifiedEvidence = EvidenceVerifier.verify(diagnosis.path("evidence"), rawLog);
            String moduleId = knownModule(diagnosis.path("suspected_module_id").asText(null));
            double llmConfidence = diagnosis.path("confidence").isNumber()
                    ? diagnosis.path("confidence").asDouble() : 0.0;
            ConfidenceCalibrator.Result calibrated = ConfidenceCalibrator.calibrate(
                    llmConfidence, verifiedEvidence.size(), moduleId);
            ObjectNode verifiedDiagnosis = externalDiagnosis(diagnosis, verifiedEvidence, moduleId);
            addStage(incidentId, stages, "VERIFY_EVIDENCE", "DONE", elapsedMs(verifyStart));

            String category = normalizeCategory(diagnosis.path("category").asText("UNKNOWN"));
            String fingerprint = knownSignature(category, response.path("signature").asText(null))
                    ? Fingerprint.of(response.path("signature").asText()) : null;
            boolean duplicate = fingerprint != null && tasks.findOpenByFingerprint(fingerprint).isPresent();

            long routeStart = System.nanoTime();
            List<DeveloperDirectory.Developer> directory = developers.developers();
            Map<String, Integer> openTasks = new HashMap<>();
            for (DeveloperDirectory.Developer developer : directory) {
                openTasks.put(developer.id(), Math.toIntExact(Math.min(Integer.MAX_VALUE, tasks.countOpen(developer.id()))));
            }
            boolean p1 = "P1".equalsIgnoreCase(diagnosis.path("severity").asText());
            List<Router.Candidate> ranked = Router.rank(moduleId, stringList(diagnosis.path("required_skills")),
                    directory, openTasks, p1);
            ArrayNode candidates = candidateJson(ranked);
            addStage(incidentId, stages, "ROUTE", "DONE", elapsedMs(routeStart));

            DispatchPolicy.Decision decision = DispatchPolicy.decide(verifiedEvidence.size(), category,
                    calibrated.finalConfidence(), duplicate, !ranked.isEmpty(), settings.autoDispatch());
            if (fingerprint == null && (decision.outcome() == DispatchPolicy.Outcome.AUTO_DISPATCHED
                    || decision.outcome() == DispatchPolicy.Outcome.DEDUPLICATED)) {
                decision = new DispatchPolicy.Decision(DispatchPolicy.Outcome.NEEDS_TRIAGE, "R1",
                        "Для діагнозу немає надійного fingerprint; потрібна ручна перевірка");
            }
            ObjectNode decisionJson = mapper.createObjectNode();
            decisionJson.put("outcome", decision.outcome().name());
            decisionJson.put("rule", decision.rule());
            decisionJson.put("reason", decision.reason());

            incidents.saveAnalysis(incidentId, response, verifiedDiagnosis, calibrated.finalConfidence(),
                    fingerprint, candidates, decisionJson, elapsedMs(started));
            analysisStored = true;

            if (decision.outcome() == DispatchPolicy.Outcome.NEEDS_TRIAGE) {
                incidents.updateStatus(incidentId, "NEEDS_TRIAGE", null);
                addStage(incidentId, stages, "DISPATCH", "SKIPPED", 0);
            } else if (decision.outcome() == DispatchPolicy.Outcome.PENDING_CONFIRM) {
                incidents.updateStatus(incidentId, "PENDING_CONFIRM", null);
                addStage(incidentId, stages, "DISPATCH", "SKIPPED", 0);
            } else {
                dispatch(incidentId, response, diagnosis, verifiedDiagnosis, fingerprint, ranked, stages);
            }
            incidents.recordPipelineDuration(incidentId, elapsedMs(started));
        } catch (Exception error) {
            log.warn("Incident pipeline failed for incident {}", incidentId, error);
            try {
                JsonNode current = incidents.find(incidentId).orElse(null);
                boolean unassignedDiagnosis = current != null && "DIAGNOSED".equals(current.path("status").asText())
                        && current.path("task").isNull();
                if (!analysisStored || unassignedDiagnosis) {
                    incidents.updateStatus(incidentId, "FAILED", "AI analysis failed");
                    addStage(incidentId, stages, "DIAGNOSE", "FAILED", elapsedMs(started));
                }
            } catch (Exception statusError) {
                log.warn("Could not mark incident {} as failed", incidentId, statusError);
            }
        }
    }

    private JsonNode buildAiRequest(long id, JsonNode incident, String rawLog) {
        ObjectNode request = mapper.createObjectNode();
        request.put("incident_id", id);
        request.put("user_message", incident.path("userMessage").asText(""));
        putIfPresent(request, "complaint_at", incident.path("complaintAt"));
        putIfPresent(request, "order_id", incident.path("orderId"));
        putIfPresent(request, "user_id", incident.path("userId"));
        request.put("log_text", rawLog == null ? "" : rawLog);
        ArrayNode catalog = request.putArray("module_catalog");
        for (DeveloperDirectory.Module module : developers.modules()) {
            ObjectNode item = catalog.addObject();
            item.put("id", module.id());
            item.put("name", module.name());
            item.put("description", module.description());
            item.set("keywords", mapper.valueToTree(module.keywords() == null ? List.of() : module.keywords()));
        }
        return request;
    }

    private JsonNode requireDiagnosis(JsonNode response) {
        JsonNode diagnosis = response == null ? null : response.get("diagnosis");
        if (diagnosis == null || !diagnosis.isObject()) throw new IllegalArgumentException("AI response has no diagnosis");
        return diagnosis;
    }

    private ObjectNode externalDiagnosis(JsonNode source, ArrayNode evidence, String moduleId) {
        ObjectNode result = mapper.createObjectNode();
        String category = normalizeCategory(source.path("category").asText("UNKNOWN"));
        String severity = source.path("severity").asText("P2");
        if (!Set.of("P1", "P2", "P3").contains(severity)) severity = "P2";
        result.put("category", category);
        result.put("severity", severity);
        copyText(source, result, "root_cause", "rootCause");
        if (moduleId == null) result.putNull("suspectedModuleId"); else result.put("suspectedModuleId", moduleId);
        copyText(source, result, "user_impact", "userImpact");
        result.set("requiredSkills", mapper.valueToTree(stringList(source.path("required_skills"))));
        result.set("evidence", evidence);
        result.set("reproSteps", mapper.valueToTree(stringList(source.path("repro_steps"))));
        copyText(source, result, "suggested_fix", "suggestedFix");
        result.set("unknowns", mapper.valueToTree(stringList(source.path("unknowns"))));
        return result;
    }

    private String knownModule(String moduleId) {
        if (moduleId == null || moduleId.isBlank()) return null;
        return developers.modules().stream().map(DeveloperDirectory.Module::id)
                .filter(moduleId::equals).findFirst().orElse(null);
    }

    private String normalizeCategory(String category) {
        String normalized = category == null ? "UNKNOWN" : category.trim().toUpperCase(java.util.Locale.ROOT);
        return KNOWN_CATEGORIES.contains(normalized) ? normalized : "UNKNOWN";
    }

    private boolean knownSignature(String category, String signature) {
        return !"UNKNOWN".equals(category) && signature != null && !signature.isBlank()
                && !"unknown".equalsIgnoreCase(signature.trim());
    }

    private ArrayNode candidateJson(List<Router.Candidate> ranked) {
        ArrayNode result = mapper.createArrayNode();
        for (Router.Candidate candidate : ranked) {
            ObjectNode item = result.addObject();
            item.put("developerId", candidate.developerId());
            item.put("name", candidate.name());
            item.put("score", candidate.score());
            item.set("reasons", mapper.valueToTree(candidate.reasons()));
        }
        return result;
    }

    private void dispatch(long incidentId, JsonNode response, JsonNode diagnosis, JsonNode verifiedDiagnosis, String fingerprint,
                          List<Router.Candidate> ranked, ArrayNode stages) {
        long dispatchStart = System.nanoTime();
        Router.Candidate primary = ranked.isEmpty() ? null : ranked.get(0);
        String backupId = ranked.size() < 2 ? null : ranked.get(1).developerId();
        String title = taskTitle(response, diagnosis);
        String body = taskBody(response, diagnosis, verifiedDiagnosis);
        String priority = diagnosis.path("severity").asText("P2");
        if (!Set.of("P1", "P2", "P3").contains(priority)) priority = "P2";
        String actor = "SYSTEM";

        TaskStore.DispatchResult result = tasks.dispatch(new TaskStore.DispatchRequest(
                incidentId, fingerprint, title, body, priority,
                primary == null ? null : primary.developerId(), backupId,
                "AUTO_DISPATCHED", actor));
        if (result.created()) taskSink.deliver(result.taskId());
        ObjectNode dispatchPayload = mapper.createObjectNode();
        dispatchPayload.put("taskId", result.taskId());
        dispatchPayload.put("created", result.created());
        dispatchPayload.put("duplicate", result.duplicate());
        audit.record(incidentId, "SYSTEM", "Dispatch completed", dispatchPayload);
        addStage(incidentId, stages, "DISPATCH", "DONE", elapsedMs(dispatchStart));
    }

    private String taskTitle(JsonNode response, JsonNode diagnosis) {
        String title = response.path("task_draft").path("title").asText("").trim();
        if (title.isBlank()) title = "[" + diagnosis.path("suspected_module_id").asText("fixer") + "] Знайти причину інциденту";
        return title.length() <= 80 ? title : title.substring(0, 80).trim();
    }

    private String taskBody(JsonNode response, JsonNode diagnosis, JsonNode verifiedDiagnosis) {
        StringBuilder body = new StringBuilder();
        appendSection(body, "Що сталося", diagnosis.path("root_cause").asText("Причину потрібно уточнити."));
        appendSection(body, "Вплив", diagnosis.path("user_impact").asText("Не визначено."));
        appendSection(body, "Пропоноване виправлення", diagnosis.path("suggested_fix").asText("Дослідити першопричину."));
        appendList(body, "Кроки відтворення", diagnosis.path("repro_steps"));
        appendList(body, "Критерії приймання", response.path("task_draft").path("acceptance_criteria"));
        appendList(body, "Невідоме", diagnosis.path("unknowns"));
        body.append("\n## Перевірені докази\n");
        // Only Java-verified, masked quotes are included. verification_quote never leaves the verifier.
        JsonNode safeEvidence = verifiedDiagnosis.path("evidence");
        if (safeEvidence.isArray()) for (JsonNode evidence : safeEvidence) {
            if (evidence.path("verified").asBoolean() && evidence.path("line").isIntegralNumber()
                    && evidence.path("quote").isTextual()) {
                body.append("- Рядок ").append(evidence.path("line").asInt()).append(": ")
                        .append(evidence.path("quote").asText()).append(" — ")
                        .append(evidence.path("why").asText()).append('\n');
            }
        }
        return body.toString().trim();
    }

    private void appendSection(StringBuilder body, String heading, String content) {
        body.append("## ").append(heading).append('\n').append(content.trim()).append("\n\n");
    }

    private void appendList(StringBuilder body, String heading, JsonNode values) {
        if (values == null || !values.isArray() || values.isEmpty()) return;
        body.append("## ").append(heading).append('\n');
        for (JsonNode value : values) if (value.isTextual()) body.append("- ").append(value.asText()).append('\n');
        body.append('\n');
    }

    private void addStage(long incidentId, ArrayNode stages, String name, String status, long ms) {
        ObjectNode stage = stages.addObject();
        stage.put("name", name);
        stage.put("status", status);
        stage.put("ms", Math.max(0, ms));
        incidents.saveStages(incidentId, stages);
        ObjectNode payload = mapper.createObjectNode().put("stage", name).put("status", status).put("ms", Math.max(0, ms));
        audit.record(incidentId, "SYSTEM", "Pipeline stage " + name + " " + status.toLowerCase(java.util.Locale.ROOT), payload);
    }

    private List<String> stringList(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node != null && node.isArray()) for (JsonNode value : node) if (value.isTextual()) values.add(value.asText());
        return values;
    }

    private long aiTiming(JsonNode response, String name) {
        JsonNode timing = response.path("timings_ms").path(name);
        return timing.isNumber() ? Math.max(0, timing.asLong()) : 0;
    }

    private long elapsedMs(long startedNanos) {
        return TimeUnit.NANOSECONDS.toMillis(Math.max(0, System.nanoTime() - startedNanos));
    }

    private void putIfPresent(ObjectNode target, String field, JsonNode value) {
        if (value != null && !value.isNull()) target.set(field, value.deepCopy());
    }

    private void copyText(JsonNode source, ObjectNode target, String from, String to) {
        JsonNode value = source.get(from);
        if (value != null && value.isTextual()) target.put(to, value.asText());
        else target.putNull(to);
    }
}
