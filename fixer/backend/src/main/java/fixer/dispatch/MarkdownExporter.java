package fixer.dispatch;
import fixer.data.DataException;
import fixer.data.port.TaskStore;
import org.springframework.stereotype.Component;
@Component
public class MarkdownExporter {
 private final TaskStore tasks;
 public MarkdownExporter(TaskStore tasks){this.tasks=tasks;}
 public String export(long id){var t=tasks.find(id).orElseThrow(()->DataException.missing("Task"));return "# "+t.path("title").asText()+"\n\n"+t.path("bodyMd").asText()+"\nPriority: "+t.path("priority").asText()+"\nAssignee: "+t.path("assigneeId").asText()+"\n";}
}
