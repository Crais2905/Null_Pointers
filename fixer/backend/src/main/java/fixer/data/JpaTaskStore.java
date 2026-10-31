package fixer.data;

import fixer.data.port.*;
import fixer.data.domain.*;
import fixer.data.repo.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@Transactional
public class JpaTaskStore implements TaskStore {
    private final TaskRepository tasks;
    private final IncidentRepository incidents;
    private final DeveloperRepository developers;
    private final DatabaseLock lock;
    private final AuditStore audit;
    private final StoredViews views;

    public JpaTaskStore(TaskRepository tasks, IncidentRepository incidents, DeveloperRepository developers, DatabaseLock lock, AuditStore audit, StoredViews views) {
        this.tasks = tasks;
        this.incidents = incidents;
        this.developers = developers;
        this.lock = lock;
        this.audit = audit;
        this.views = views;
    }

    public DispatchResult dispatch(DispatchRequest request) {
        if (request == null) throw DataException.invalid("Dispatch request is required");
        lock.acquire();
        var incident = incidents.lockById(request.incidentId()).orElseThrow(() -> DataException.missing("Incident"));
        if (incident.taskId != null) {
            var old = tasks.findById(incident.taskId).orElseThrow();
            return new DispatchResult(old.id, false, incident.dedupOf != null, old.occurrences);
        }
        validate(request, incident);
        var existing = tasks.findByActiveFingerprint(request.fingerprint());
        if (existing.isPresent()) {
            var t = existing.get();
            t.occurrences++;
            incident.taskId = t.id;
            incident.dedupOf = t.incidentId;
            incident.fingerprint = t.fingerprint;
            incident.status = "DEDUPLICATED";
            audit.append(incident.id, request.actor(), "Merged into task " + t.id, null);
            return new DispatchResult(t.id, false, true, t.occurrences);
        }
        requireAvailable(request.assigneeId());
        if (request.backupId() != null) {
            requireAvailable(request.backupId());
            if (request.backupId().equals(request.assigneeId()))
                throw DataException.invalid("Backup must differ from assignee");
        }
        var t = new DevTask();
        t.fingerprint = request.fingerprint();
        t.activeFingerprint = request.fingerprint();
        String base = "TASK:" + request.fingerprint();
        t.idempotencyKey = tasks.existsByIdempotencyKey(base) ? base + ":" + incident.id : base;
        t.incidentId = incident.id;
        t.title = request.title();
        t.bodyMd = request.bodyMd();
        t.priority = request.priority();
        t.assigneeId = request.assigneeId();
        t.backupId = request.backupId();
        t.dispatchedAt = Instant.now();
        tasks.saveAndFlush(t);
        incident.taskId = t.id;
        incident.fingerprint = t.fingerprint;
        incident.status = request.outcome();
        incident.dispatchActor = request.actor();
        audit.append(incident.id, request.actor(), "Task " + t.id + " created in developer inbox", null);
        return new DispatchResult(t.id, true, false, 1);
    }

    private void validate(DispatchRequest r, Incident i) {
        if (!Set.of("SYSTEM", "HUMAN").contains(r.actor() == null ? "" : r.actor()))
            throw DataException.invalid("Dispatch actor must be SYSTEM or HUMAN");
        if (!Set.of("DIAGNOSED", "PENDING_CONFIRM", "NEEDS_TRIAGE").contains(i.status))
            throw DataException.conflict("Incident is not ready for dispatch");
        if (!i.status.equals("DIAGNOSED") && !"HUMAN".equals(r.actor()))
            throw DataException.conflict("Human confirmation required");
        if (!"AUTO_DISPATCHED".equals(r.outcome()))
            throw DataException.invalid("Incident outcome must be AUTO_DISPATCHED");
        if (r.fingerprint() == null || !r.fingerprint().matches("[a-f0-9]{40}"))
            throw DataException.invalid("Fingerprint must be SHA-1 hex");
        if (r.title() == null || r.title().isBlank() || r.title().length() > 80)
            throw DataException.invalid("Title must be 1..80 characters");
        if (r.bodyMd() == null || r.bodyMd().isBlank()) throw DataException.invalid("Task body required");
        if (!Set.of("P1", "P2", "P3").contains(r.priority() == null ? "" : r.priority()))
            throw DataException.invalid("Invalid priority");
    }

    private void requireAvailable(String id) {
        if (id == null) throw DataException.invalid("Assignee is required");
        var d = developers.findById(id).orElseThrow(() -> DataException.missing("Developer"));
        if (!d.available) throw DataException.conflict("Developer is unavailable");
    }

    @Transactional(readOnly = true)
    public Optional<JsonNode> findOpenByFingerprint(String fingerprint) {
        return tasks.findByActiveFingerprint(fingerprint).map(views::task);
    }

    @Transactional(readOnly = true)
    public Optional<JsonNode> find(long id) {
        return tasks.findById(id).map(views::task);
    }

    @Transactional(readOnly = true)
    public long countOpen(String developerId) {
        return tasks.countByAssigneeIdAndStatusIn(developerId, List.of("OPEN", "ACK"));
    }

    public void updateDelivery(long id, String status, String error) {
        if (!Set.of("IN_APP", "WEBHOOK_OK", "WEBHOOK_FAILED").contains(status))
            throw DataException.invalid("Invalid delivery status");
        lock.acquire();
        var t = tasks.lockById(id).orElseThrow(() -> DataException.missing("Task"));
        t.deliveryStatus = status;
        t.deliveryError = error;
        audit.append(t.incidentId, "SYSTEM", "Delivery status: " + status, null);
    }

    public JsonNode setStatus(long id, String status) {
        if (!Set.of("ACK", "DONE").contains(status == null ? "" : status))
            throw DataException.invalid("Task status must be ACK or DONE");
        lock.acquire();
        var t = tasks.lockById(id).orElseThrow(() -> DataException.missing("Task"));
        if (t.status.equals(status)) return views.task(t);
        if (t.status.equals("DONE")) throw DataException.conflict("DONE is terminal");
        t.status = status;
        if (status.equals("DONE")) t.activeFingerprint = null;
        audit.append(t.incidentId, "HUMAN", "Task status: " + status, null);
        tasks.flush();
        return views.task(t);
    }

    @Transactional(readOnly = true)
    public List<JsonNode> list(String assigneeId) {
        return (assigneeId == null ? tasks.findAllByOrderByCreatedAtDesc() : tasks.findByAssigneeIdOrderByCreatedAtDesc(assigneeId)).stream().map(views::task).toList();
    }
}
