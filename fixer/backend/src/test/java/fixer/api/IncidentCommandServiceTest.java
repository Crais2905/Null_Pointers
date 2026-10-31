package fixer.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fixer.audit.AuditService;
import fixer.data.DataException;
import fixer.data.port.DeveloperDirectory;
import fixer.data.port.IncidentStore;
import fixer.data.port.TaskStore;
import fixer.dispatch.TaskSink;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class IncidentCommandServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private IncidentStore incidents;
    private TaskStore tasks;
    private DeveloperDirectory developers;
    private TaskSink sink;
    private AuditService audit;
    private IncidentCommandService service;

    @BeforeEach
    void setUp() {
        incidents = mock(IncidentStore.class);
        tasks = mock(TaskStore.class);
        developers = mock(DeveloperDirectory.class);
        sink = mock(TaskSink.class);
        audit = mock(AuditService.class);
        service = new IncidentCommandService(incidents, tasks, developers, sink, audit);
        when(developers.developers()).thenReturn(List.of(
                new DeveloperDirectory.Developer("dev-1", "A Dev", "BACKEND", true, "", List.of(), List.of()),
                new DeveloperDirectory.Developer("dev-2", "B Dev", "BACKEND", true, "", List.of(), List.of())));
        when(incidents.fingerprint(12)).thenReturn(Optional.of("a".repeat(40)));
        when(tasks.dispatch(any())).thenReturn(new TaskStore.DispatchResult(31, true, false, 1));
        when(sink.deliver(31L)).thenReturn("IN_APP");
    }

    @Test
    void confirmDispatchesAsHumanAndDeliversOnlyNewTask() throws Exception {
        JsonNode pending = incident("PENDING_CONFIRM", "payments", true);
        when(incidents.find(12)).thenReturn(Optional.of(pending));

        service.confirm(12, null);

        var captor = org.mockito.ArgumentCaptor.forClass(TaskStore.DispatchRequest.class);
        verify(tasks).dispatch(captor.capture());
        assertEquals("a".repeat(40), captor.getValue().fingerprint());
        assertEquals("HUMAN", captor.getValue().actor());
        assertEquals("dev-1", captor.getValue().assigneeId());
        verify(sink).deliver(31L);
    }

    @Test
    void triageConfirmationRequiresExplicitAssigneeAndUnknownDeveloperIs404() throws Exception {
        when(incidents.find(12)).thenReturn(Optional.of(incident("NEEDS_TRIAGE", "payments", false)));
        assertEquals(400, assertThrows(DataException.class, () -> service.confirm(12, null)).status());
        assertEquals(404, assertThrows(DataException.class, () -> service.confirm(12, "missing")).status());
        verify(tasks, never()).dispatch(any());
    }

    @Test
    void manualUnknownDiagnosisUsesPerIncidentFingerprintAndExplicitWarning() throws Exception {
        when(incidents.find(12)).thenReturn(Optional.of(incident("NEEDS_TRIAGE", null, false)));
        when(incidents.fingerprint(12)).thenReturn(Optional.empty());

        service.confirm(12, "dev-2");

        var captor = org.mockito.ArgumentCaptor.forClass(TaskStore.DispatchRequest.class);
        verify(tasks).dispatch(captor.capture());
        assertEquals(fixer.policy.Fingerprint.of("manual_incident:12"), captor.getValue().fingerprint());
        assertTrue(captor.getValue().title().startsWith("[Ручний розбір]"));
        assertTrue(captor.getValue().bodyMd().contains("діагноз не підтверджено"));
    }

    @Test
    void repeatedConfirmReturnsCurrentIncidentWithoutSecondDelivery() throws Exception {
        JsonNode dispatched = incident("AUTO_DISPATCHED", "payments", true);
        when(incidents.find(12)).thenReturn(Optional.of(dispatched));

        assertSame(dispatched, service.confirm(12, "dev-2"));
        verifyNoInteractions(tasks);
        verifyNoInteractions(sink);
    }

    @Test
    void dismissDelegatesStateTransitionAndReturnsUpdatedView() throws Exception {
        JsonNode view = incident("PENDING_CONFIRM", "payments", true);
        when(incidents.find(12)).thenReturn(Optional.of(view));

        service.dismiss(12);

        verify(incidents).updateStatus(12, "DISMISSED", null);
        verify(audit).record(12, "HUMAN", "Incident dismissed", null);
    }

    private JsonNode incident(String status, String module, boolean verifiedEvidence) throws Exception {
        String moduleJson = module == null ? "null" : "\"" + module + "\"";
        String evidence = verifiedEvidence
                ? "[{\"line\":1,\"quote\":\"masked quote\",\"why\":\"reason\",\"verified\":true}]" : "[]";
        return mapper.readTree("""
                {"id":12,"status":"%s","task":null,
                 "diagnosis":{"category":"%s","severity":"P2","rootCause":"Root cause",
                   "suspectedModuleId":%s,"userImpact":"Impact","evidence":%s,
                   "reproSteps":[],"suggestedFix":"Fix","unknowns":[]},
                 "candidates":[{"developerId":"dev-1"},{"developerId":"dev-2"}]}
                """.formatted(status, module == null ? "UNKNOWN" : "PAYMENT_DUPLICATE", moduleJson, evidence));
    }
}
