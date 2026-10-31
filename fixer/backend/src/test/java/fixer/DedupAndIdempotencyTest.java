package fixer;

import com.fasterxml.jackson.databind.ObjectMapper;
import fixer.data.port.IncidentStore;
import fixer.data.port.TaskStore;
import fixer.data.repo.IncidentRepository;
import fixer.data.repo.TaskRepository;
import fixer.metrics.MetricsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:dedup-tests;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000"})
class DedupAndIdempotencyTest {
    @Autowired IncidentStore incidents;
    @Autowired TaskStore tasks;
    @Autowired IncidentRepository incidentRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired MetricsService metrics;
    @Autowired ObjectMapper mapper;

    @BeforeEach
    void reset() {
        incidents.resetDemo();
    }

    @Test
    void repeatsSameLogAndMessageThroughAdmissionDedup() {
        var submission = new IncidentStore.Submission("same complaint", "same log", null, null, null, "TEST");
        var first = incidents.accept(submission);
        var second = incidents.accept(submission);

        assertFalse(first.reused());
        assertTrue(second.reused());
        assertEquals(first.id(), second.id());
        assertEquals(1, incidentRepository.count());
    }

    @Test
    void mergesOnlyOncePerIncidentAndAllowsNewGenerationAfterDone() {
        long firstIncident = analyzed("first complaint", "log one");
        long secondIncident = analyzed("second complaint", "log two");
        String fingerprint = "b".repeat(40);

        var first = tasks.dispatch(request(firstIncident, fingerprint));
        var repeatSameIncident = tasks.dispatch(request(firstIncident, fingerprint));
        var second = tasks.dispatch(request(secondIncident, fingerprint));
        var repeatSecondIncident = tasks.dispatch(request(secondIncident, fingerprint));

        assertTrue(first.created());
        assertFalse(repeatSameIncident.created());
        assertEquals(1, repeatSameIncident.occurrences());
        assertTrue(second.duplicate());
        assertEquals(first.taskId(), second.taskId());
        assertEquals(2, second.occurrences());
        assertEquals(2, repeatSecondIncident.occurrences());
        assertEquals("DEDUPLICATED", incidents.find(secondIncident).orElseThrow().path("status").asText());
        assertEquals(1, taskRepository.count());
        assertEquals(1, metrics.snapshot().dedupMerged());

        tasks.setStatus(first.taskId(), "DONE");
        long thirdIncident = analyzed("third complaint", "log three");
        var nextGeneration = tasks.dispatch(request(thirdIncident, fingerprint));
        assertTrue(nextGeneration.created());
        assertNotEquals(first.taskId(), nextGeneration.taskId());
        assertEquals(2, taskRepository.count());
    }

    private long analyzed(String message, String log) {
        long id = incidents.accept(new IncidentStore.Submission(message, log, null, null, null, "TEST")).id();
        var response = mapper.createObjectNode();
        response.putArray("findings");
        response.putObject("diagnosis").put("confidence", 0.9);
        var diagnosis = mapper.createObjectNode().put("rootCause", "Repeated request").put("severity", "P2");
        diagnosis.putArray("evidence").addObject().put("line", 1).put("quote", "masked quote").put("verified", true);
        incidents.saveAnalysis(id, response, diagnosis, 0.9, "b".repeat(40), mapper.createArrayNode(),
                mapper.createObjectNode(), 120);
        return id;
    }

    private TaskStore.DispatchRequest request(long incidentId, String fingerprint) {
        return new TaskStore.DispatchRequest(incidentId, fingerprint, "Investigate repeated request",
                "## Evidence\nMasked evidence", "P2", "dev-1", "dev-2", "AUTO_DISPATCHED", "SYSTEM");
    }
}
