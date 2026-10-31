package fixer.api;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.*;

/**
 * Read-only integration stubs. Replace with real controllers as pipeline lands.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class ScaffoldController {
    private final ObjectMapper json = new ObjectMapper();

    private JsonNode load(String path, ObjectMapper mapper) throws IOException {
        try (var in = new ClassPathResource(path).getInputStream()) {
            return mapper.readTree(in);
        }
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "mode", "scaffold");
    }

    @GetMapping("/incidents")
    public List<JsonNode> incidents() throws IOException {
        return json.convertValue(load("fixtures/api-incident-list.json", json), new com.fasterxml.jackson.core.type.TypeReference<List<JsonNode>>() {
        });
    }

    @GetMapping("/incidents/{id}")
    public JsonNode incident(@PathVariable long id) throws IOException {
        if (id != 12) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return load("fixtures/api-incident.json", json);
    }

    @GetMapping("/developers")
    public JsonNode developers() throws IOException {
        var list = load("seed/developers.yml", new ObjectMapper(new YAMLFactory())).get("developers");
        for (var dev : list) {
            var obj = (com.fasterxml.jackson.databind.node.ObjectNode) dev;
            obj.set("ownedModules", obj.remove("owned_modules"));
        }
        return list;
    }

    @GetMapping("/modules")
    public JsonNode modules() throws IOException {
        return load("seed/catalog.yml", new ObjectMapper(new YAMLFactory())).get("modules");
    }

    @GetMapping("/tasks")
    public List<JsonNode> tasks(@RequestParam(required = false) String assigneeId) throws IOException {
        var task = load("fixtures/api-task.json", json);
        return assigneeId == null || assigneeId.equals(task.get("assigneeId").asText()) ? List.of(task) : List.of();
    }

    @GetMapping("/metrics")
    public JsonNode metrics() throws IOException {
        return load("fixtures/api-metrics.json", json);
    }

    @GetMapping("/settings")
    public Map<String, Boolean> settings() {
        return Map.of("autoDispatch", true);
    }

    @RequestMapping(value = {"/incidents", "/incidents/simulate", "/incidents/{id}/confirm", "/incidents/{id}/dismiss", "/reset"}, method = RequestMethod.POST)
    @ResponseStatus(HttpStatus.NOT_IMPLEMENTED)
    public Map<String, String> pending() {
        return Map.of("code", "NOT_IMPLEMENTED", "message", "Scaffold: implement pipeline and persistence");
    }

    @PutMapping("/settings")
    @ResponseStatus(HttpStatus.NOT_IMPLEMENTED)
    public Map<String, String> settingsTodo() {
        return pending();
    }

    @PatchMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NOT_IMPLEMENTED)
    public Map<String, String> taskTodo() {
        return pending();
    }

    @GetMapping(value = "/tasks/{id}.md", produces = "text/markdown")
    public String markdown(@PathVariable long id) throws IOException {
        if (id != 31) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return load("fixtures/api-task.json", json).get("bodyMd").asText();
    }
}

