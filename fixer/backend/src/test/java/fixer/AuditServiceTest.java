package fixer;

import com.fasterxml.jackson.databind.ObjectMapper;
import fixer.audit.AuditService;
import fixer.data.port.AuditStore;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuditServiceTest {
    private final AuditStore store = mock(AuditStore.class);
    private final AuditService service = new AuditService(store, new ObjectMapper());

    @Test
    void appendsValidAuditDataAndUsesEmptyPayloadWhenMissing() {
        service.record(12, "SYSTEM", "Incident accepted", null);
        var payload = new ObjectMapper().createObjectNode();
        verify(store).append(eq(12L), eq("SYSTEM"), eq("Incident accepted"), eq(payload));
    }

    @Test
    void rejectsInvalidIncidentActorAndEventBeforeWriting() {
        assertThrows(IllegalArgumentException.class, () -> service.record(0, "SYSTEM", "event", null));
        assertThrows(IllegalArgumentException.class, () -> service.record(1, "ROBOT", "event", null));
        assertThrows(IllegalArgumentException.class, () -> service.record(1, "AI", " ", null));
        verifyNoInteractions(store);
    }
}
