package fixer.audit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fixer.data.port.AuditStore;
import org.springframework.stereotype.Service;

/** Сервісна межа для запису подій SYSTEM / AI / HUMAN. Сховище реалізує data-команда. */
@Service
public class AuditService {
    private final AuditStore store;
    private final ObjectMapper mapper;

    public AuditService(AuditStore store, ObjectMapper mapper) {
        this.store = store;
        this.mapper = mapper;
    }

    public void record(long incidentId, String actor, String event, JsonNode payload) {
        if (incidentId <= 0) throw new IllegalArgumentException("incidentId must be positive");
        if (!"SYSTEM".equals(actor) && !"AI".equals(actor) && !"HUMAN".equals(actor)) {
            throw new IllegalArgumentException("actor must be SYSTEM, AI, or HUMAN");
        }
        if (event == null || event.isBlank()) throw new IllegalArgumentException("event must not be blank");
        store.append(incidentId, actor, event, payload == null ? mapper.createObjectNode() : payload.deepCopy());
    }
}
