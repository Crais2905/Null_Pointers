package fixer.api;

import com.fasterxml.jackson.databind.JsonNode;
import fixer.data.DataException;
import fixer.data.port.TaskStore;
import fixer.dispatch.MarkdownExporter;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:5173")
public class TaskController {
    private final TaskStore tasks;
    private final MarkdownExporter markdown;

    public TaskController(TaskStore tasks, MarkdownExporter markdown) {
        this.tasks = tasks;
        this.markdown = markdown;
    }

    public record UpdateStatusRequest(String status) {}

    @GetMapping
    public List<JsonNode> list(@RequestParam(required = false) String assigneeId) {
        return tasks.list(assigneeId);
    }

    @GetMapping("/{id}")
    public JsonNode get(@PathVariable long id) {
        return tasks.find(id).orElseThrow(() -> DataException.missing("Task"));
    }

    @PatchMapping("/{id}")
    public JsonNode updateStatus(@PathVariable long id, @RequestBody UpdateStatusRequest request) {
        if (request == null || request.status() == null) throw DataException.invalid("status is required");
        return tasks.setStatus(id, request.status());
    }

    @GetMapping(value = "/{id}.md", produces = MediaType.TEXT_MARKDOWN_VALUE)
    public String markdown(@PathVariable long id) {
        return markdown.export(id);
    }
}
