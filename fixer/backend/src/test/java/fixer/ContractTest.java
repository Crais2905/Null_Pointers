package fixer;

import com.fasterxml.jackson.databind.ObjectMapper;
import fixer.api.ApiExceptionHandler;
import fixer.api.IncidentController;
import fixer.api.SettingsController;
import fixer.metrics.MetricsService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ContractTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void acceptedIncidentResponseContainsOnlyContractFields() {
        var response = mapper.valueToTree(new IncidentController.AcceptedResponse(42, "NEW"));
        assertEquals(2, response.size());
        assertEquals(42, response.path("id").asLong());
        assertEquals("NEW", response.path("status").asText());
    }

    @Test
    void settingsAndMetricsSerializeUsingPublicCamelCaseNames() {
        var settings = mapper.valueToTree(new SettingsController.SettingsResponse(true));
        assertEquals(1, settings.size());
        assertTrue(settings.path("autoDispatch").asBoolean());

        var metrics = mapper.valueToTree(new MetricsService.Metrics(1.25, 50, 2, 4));
        assertEquals(4, metrics.size());
        assertEquals(1.25, metrics.path("avgPipelineSec").asDouble());
        assertEquals(50, metrics.path("autoDispatchedPercent").asDouble());
        assertEquals(2, metrics.path("dedupMerged").asLong());
        assertEquals(4, metrics.path("total").asLong());
    }

    @Test
    void apiErrorsExposeOnlyCodeAndMessage() {
        var response = mapper.valueToTree(new ApiExceptionHandler.ErrorResponse("INVALID_INPUT", "bad request"));
        assertEquals(2, response.size());
        assertEquals("INVALID_INPUT", response.path("code").asText());
        assertEquals("bad request", response.path("message").asText());
    }
}
