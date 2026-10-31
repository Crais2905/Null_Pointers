package fixer.data;
import fixer.data.domain.DevTask;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
@Component
public class StoredViews {
 private final JsonSupport json;
 public StoredViews(JsonSupport json){this.json=json;}
 public JsonNode task(DevTask t){var n=json.object();n.put("id",t.id);n.put("title",t.title);n.put("priority",t.priority);n.put("assigneeId",t.assigneeId);n.put("backupId",t.backupId);n.put("occurrences",t.occurrences);n.put("bodyMd",t.bodyMd+"\n\n---\nIncident: [#"+t.incidentId+"](/?incidentId="+t.incidentId+")\nBackup: "+(t.backupId==null?"—":t.backupId)+"\nOccurrences: "+t.occurrences+"\n");n.put("incidentId",t.incidentId);n.put("deliveryStatus",t.deliveryStatus);n.put("status",t.status);n.put("createdAt",t.createdAt.toString());n.put("dispatchedAt",t.dispatchedAt==null?null:t.dispatchedAt.toString());return n;}
}
