package fixer.data;

import fixer.data.port.AuditStore;
import fixer.data.repo.*;
import fixer.data.domain.AuditLog;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@Transactional
public class JpaAuditStore implements AuditStore {
    private final AuditRepository repo;
    private final IncidentRepository incidents;
    private final JsonSupport json;

    public JpaAuditStore(AuditRepository repo, IncidentRepository incidents, JsonSupport json) {
        this.repo = repo;
        this.incidents = incidents;
        this.json = json;
    }

    public void append(long incidentId, String actor, String event, JsonNode payload) {
        if (!Set.of("SYSTEM", "AI", "HUMAN").contains(actor)) throw DataException.invalid("Invalid audit actor");
        if (!incidents.existsById(incidentId)) throw DataException.missing("Incident");
        var log = new AuditLog();
        log.incidentId = incidentId;
        log.actor = actor;
        log.event = event;
        log.payloadJson = json.write(json.safe(payload));
        repo.save(log);
    }
}
