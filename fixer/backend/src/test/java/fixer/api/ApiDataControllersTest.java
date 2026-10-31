package fixer.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import fixer.data.port.DeveloperDirectory;
import fixer.data.port.IncidentStore;
import fixer.data.port.SettingsStore;
import fixer.data.port.TaskStore;
import fixer.dispatch.MarkdownExporter;
import fixer.metrics.MetricsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {DeveloperController.class, TaskController.class, SettingsController.class,
        MetricsController.class, ResetController.class})
class ApiDataControllersTest {
    @Autowired MockMvc mvc;
    @MockBean DeveloperDirectory developers;
    @MockBean TaskStore tasks;
    @MockBean MarkdownExporter markdown;
    @MockBean SettingsStore settings;
    @MockBean MetricsService metrics;
    @MockBean IncidentStore incidents;

    @Test
    void servesRealDeveloperAndModuleDirectoryData() throws Exception {
        when(developers.developers()).thenReturn(List.of(new DeveloperDirectory.Developer("dev-1", "A Dev", "BACKEND",
                true, "@adev", List.of("java"), List.of(new DeveloperDirectory.Ownership("payments", "primary")))));
        when(developers.modules()).thenReturn(List.of(new DeveloperDirectory.Module("payments", "Payments", "desc", List.of("pay"))));

        mvc.perform(get("/api/developers")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ownedModules[0].id").value("payments"));
        mvc.perform(get("/api/modules")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("payments"));
    }

    @Test
    void listsTasksUpdatesStatusAndExportsMarkdown() throws Exception {
        var task = new ObjectMapper().readTree("{\"id\":7,\"status\":\"OPEN\"}");
        when(tasks.list("dev-1")).thenReturn(List.of(task));
        when(tasks.setStatus(7, "ACK")).thenReturn(new ObjectMapper().readTree("{\"id\":7,\"status\":\"ACK\"}"));
        when(markdown.export(7)).thenReturn("# Task\n");

        mvc.perform(get("/api/tasks").param("assigneeId", "dev-1")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(7));
        mvc.perform(patch("/api/tasks/7").contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ACK\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACK"));
        mvc.perform(get("/api/tasks/7.md")).andExpect(status().isOk()).andExpect(content().contentType("text/markdown;charset=UTF-8"));
    }

    @Test
    void replacesAutoDispatchSettingAndResetsWithNoContent() throws Exception {
        when(settings.autoDispatch()).thenReturn(false);
        mvc.perform(put("/api/settings").contentType(MediaType.APPLICATION_JSON).content("{\"autoDispatch\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.autoDispatch").value(false));
        verify(settings).setAutoDispatch(false);

        mvc.perform(post("/api/reset")).andExpect(status().isNoContent());
        verify(incidents).resetDemo();
    }

    @Test
    void returnsLiveMetrics() throws Exception {
        when(metrics.snapshot()).thenReturn(new MetricsService.Metrics(1.25, 50, 2, 4));
        mvc.perform(get("/api/metrics")).andExpect(status().isOk())
                .andExpect(jsonPath("$.avgPipelineSec").value(1.25))
                .andExpect(jsonPath("$.total").value(4));
    }
}
