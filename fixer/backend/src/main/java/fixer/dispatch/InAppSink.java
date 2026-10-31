package fixer.dispatch;
import fixer.data.DataException;
import fixer.data.port.TaskStore;
import org.springframework.stereotype.Component;
/** In-app persistence is already committed by TaskStore.dispatch. */
@Component
public class InAppSink implements TaskSink {
 private final TaskStore tasks;
 public InAppSink(TaskStore tasks){this.tasks=tasks;}
 public String deliver(Long id){return tasks.find(id).orElseThrow(()->DataException.missing("Task")).get("deliveryStatus").asText();}
}
