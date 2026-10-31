package fixer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fixer.ai.AiClient;
import fixer.audit.AuditService;
import fixer.data.LogStorage;
import fixer.data.port.DeveloperDirectory;
import fixer.data.port.IncidentStore;
import fixer.data.port.SettingsStore;
import fixer.data.port.TaskStore;
import fixer.dispatch.TaskSink;
import fixer.pipeline.IncidentPipeline;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PipelineTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private IncidentStore incidents;
    private TaskStore tasks;
    private DeveloperDirectory developers;
    private SettingsStore settings;
    private LogStorage logs;
    private AiClient ai;
    private TaskSink taskSink;
    private AuditService audit;
    private IncidentPipeline pipeline;

    @BeforeEach
    void setUp() throws Exception {
        incidents = mock(IncidentStore.class);
        tasks = mock(TaskStore.class);
        developers = mock(DeveloperDirectory.class);
        settings = mock(SettingsStore.class);
        logs = mock(LogStorage.class);
        ai = mock(AiClient.class);
        taskSink = mock(TaskSink.class);
        audit = mock(AuditService.class);
        pipeline = new IncidentPipeline(incidents, tasks, developers, settings, logs, ai, taskSink, audit, mapper);
        when(incidents.find(12)).thenReturn(Optional.of(mapper.readTree("""
                {"id":12,"status":"NEW","userMessage":"double charge","orderId":318,"userId":77,
                 "complaintAt":"2026-10-31T12:30:00Z"}
                """)));
        when(logs.read(12)).thenReturn("line one email=private@example.com\nline two second charge\n");
        when(developers.modules()).thenReturn(List.of(new DeveloperDirectory.Module("payments", "Payments", "", List.of())));
        when(developers.developers()).thenReturn(List.of(new DeveloperDirectory.Developer("dev-1", "A Dev", "BACKEND", true,
                "", List.of("java", "payments"), List.of(new DeveloperDirectory.Ownership("payments", "primary")))));
        when(tasks.countOpen(anyString())).thenReturn(0L);
        when(tasks.findOpenByFingerprint(anyString())).thenReturn(Optional.empty());
        when(settings.autoDispatch()).thenReturn(true);
        when(taskSink.deliver(anyLong())).thenReturn("IN_APP");
    }

    @Test
    void verifiesEvidenceAndDispatchesNewTaskAfterPolicyAllowsIt() throws Exception {
        when(ai.analyze(any())).thenReturn(aiResponse(true, true));
        when(tasks.dispatch(any())).thenReturn(new TaskStore.DispatchResult(31, true, false, 1));

        pipeline.analyze(12);

        ArgumentCaptor<TaskStore.DispatchRequest> request = ArgumentCaptor.forClass(TaskStore.DispatchRequest.class);
        verify(tasks).dispatch(request.capture());
        assertEquals("dev-1", request.getValue().assigneeId());
        assertTrue(request.getValue().bodyMd().contains("masked-address@example.test"));
        assertFalse(request.getValue().bodyMd().contains("private@example.com"));
        verify(taskSink).deliver(31L);
        verify(incidents).saveAnalysis(eq(12L), any(), any(), eq(0.9), anyString(), any(), any(), anyLong());
    }

    @Test
    void sendsNoTaskWhenThereAreNoVerifiedEvidenceLines() throws Exception {
        when(ai.analyze(any())).thenReturn(aiResponse(false, true));

        pipeline.analyze(12);

        verify(incidents).updateStatus(12, "NEEDS_TRIAGE", null);
        verify(tasks, never()).dispatch(any());
        verify(taskSink, never()).deliver(anyLong());
    }

    @Test
    void sendsNoTaskWhenSignatureCannotBeFingerprinted() throws Exception {
        when(ai.analyze(any())).thenReturn(aiResponse(true, false));

        pipeline.analyze(12);

        verify(incidents).updateStatus(12, "NEEDS_TRIAGE", null);
        verify(tasks, never()).dispatch(any());
        verify(taskSink, never()).deliver(anyLong());
    }

    @Test
    void marksIncidentFailedWhenAiCallFails() {
        when(ai.analyze(any())).thenThrow(new AiClient.AiClientException("AI unavailable"));

        pipeline.analyze(12);

        verify(incidents).updateStatus(12, "ANALYZING", null);
        verify(incidents).updateStatus(12, "FAILED", "AI analysis failed");
        verify(tasks, never()).dispatch(any());
    }

    private JsonNode aiResponse(boolean validEvidence, boolean signatureKnown) throws Exception {
        String firstEvidence = validEvidence
                ? "{\"line\":1,\"quote\":\"masked-address@example.test\",\"why\":\"first payment\",\"verification_quote\":\"email=private@example.com\"}"
                : "{\"line\":1,\"quote\":\"invented\",\"why\":\"invalid\",\"verification_quote\":\"not in log\"}";
        String secondEvidence = validEvidence
                ? "{\"line\":2,\"quote\":\"second charge\",\"why\":\"second payment\",\"verification_quote\":\"second charge\"}"
                : "{\"line\":99,\"quote\":\"invented\",\"why\":\"invalid\",\"verification_quote\":\"not in log\"}";
        return mapper.readTree("""
                {
                  "findings":[],
                  "signature": %s,
                  "diagnosis": {
                    "category":"PAYMENT_DUPLICATE", "severity":"P1", "confidence":0.9,
                    "root_cause":"Duplicate payment", "suspected_module_id":"payments",
                    "required_skills":["java","payments"], "user_impact":"Customer charged twice",
                    "evidence":[%s,%s], "repro_steps":[], "suggested_fix":"Add idempotency", "unknowns":[]
                  },
                  "task_draft":{"title":"Prevent duplicate payment","acceptance_criteria":["one payment"]},
                  "timings_ms":{"parse":1,"detectors":2,"llm":3}
                }
                """.formatted(signatureKnown ? "\"duplicate payment POST\"" : "\"\"", firstEvidence, secondEvidence));
    }
}
