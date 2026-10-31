package fixer.api;

import fixer.data.port.IncidentStore;
import fixer.data.seed.SeedCatalog;
import fixer.pipeline.IncidentPipeline;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(IncidentController.class)
class IncidentControllerTest {
    @Autowired MockMvc mvc;
    @MockBean IncidentStore incidents;
    @MockBean IncidentPipeline pipeline;
    @MockBean SeedCatalog seed;

    @Test
    void acceptsNewIncidentAndSchedulesItsPipeline() throws Exception {
        when(incidents.accept(any())).thenReturn(new IncidentStore.Accepted(17, "NEW", false));

        mvc.perform(post("/api/incidents").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userMessage":"double charge","log":"line one","orderId":318,"userId":77}
                                """))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(17))
                .andExpect(jsonPath("$.status").value("NEW"));

        verify(incidents).accept(argThat(s -> "double charge".equals(s.userMessage())
                && "line one".equals(s.log()) && "API".equals(s.source())));
        verify(pipeline).analyze(17);
    }

    @Test
    void returnsAdmissionDuplicateWithoutStartingAnotherAnalysis() throws Exception {
        when(incidents.accept(any())).thenReturn(new IncidentStore.Accepted(9, "ANALYZING", true));

        mvc.perform(post("/api/incidents").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userMessage\":\"same\",\"log\":\"same log\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(9))
                .andExpect(jsonPath("$.status").value("ANALYZING"));

        verifyNoInteractions(pipeline);
    }

    @Test
    void returnsIncidentNotFoundUsingApiErrorShape() throws Exception {
        when(incidents.find(404)).thenReturn(java.util.Optional.empty());

        mvc.perform(get("/api/incidents/404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").isString());
    }
}
