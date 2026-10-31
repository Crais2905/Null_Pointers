package fixer.data;
import fixer.data.port.*;
import fixer.data.repo.*;
import fixer.data.domain.*;
import fixer.data.seed.DataSeeder;
import com.fasterxml.jackson.databind.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
@Service @Transactional
public class JpaIncidentStore implements IncidentStore {
 private final IncidentRepository repo;private final TaskRepository tasks;private final DeveloperRepository developers;private final AuditRepository audits;private final SettingRepository settings;private final DataSeeder seeder;private final DatabaseLock lock;private final JsonSupport json;private final StoredViews views;private final AuditStore audit;
 private static final Set<String> STATUSES=Set.of("NEW","ANALYZING","DIAGNOSED","AUTO_DISPATCHED","PENDING_CONFIRM","NEEDS_TRIAGE","DEDUPLICATED","DISMISSED","FAILED");
 public JpaIncidentStore(IncidentRepository repo,TaskRepository tasks,DeveloperRepository developers,AuditRepository audits,SettingRepository settings,DataSeeder seeder,DatabaseLock lock,JsonSupport json,StoredViews views,AuditStore audit){this.repo=repo;this.tasks=tasks;this.developers=developers;this.audits=audits;this.settings=settings;this.seeder=seeder;this.lock=lock;this.json=json;this.views=views;this.audit=audit;}
 public Accepted accept(Submission s){
  if(s==null||s.log()==null||s.log().isBlank())throw DataException.invalid("Log is required");
  if(s.log().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>10*1024*1024)throw new DataException(413,"LOG_TOO_LARGE","Maximum upload is 10 MiB");
  Instant complaint=null;try{if(s.complaintAt()!=null&&!s.complaintAt().isBlank())complaint=Instant.parse(s.complaintAt());}catch(Exception e){throw DataException.invalid("complaintAt must be ISO-8601 UTC");}
  String message=s.userMessage()==null?"":s.userMessage();String hash=Hashes.sha256(s.log());
  lock.acquire();
  for(var existing:repo.findByLogHashAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(hash,Instant.now().minusSeconds(600)))
   if(Objects.equals(existing.userMessage,message))return new Accepted(existing.id,existing.status,true);
  var i=new Incident();i.userMessage=message;i.rawLog=s.log();i.logHash=hash;i.orderId=s.orderId();i.userId=s.userId();i.source=s.source()==null?"API":s.source();i.complaintAt=complaint;repo.saveAndFlush(i);
  audit.append(i.id,"SYSTEM","Incident accepted",null);return new Accepted(i.id,i.status,false);
 }
 @Transactional(readOnly=true) public Optional<JsonNode> find(long id){return repo.findById(id).map(this::view);}
 private JsonNode view(Incident i){
  var n=json.object();n.put("id",i.id);n.put("status",i.status);n.put("createdAt",i.createdAt.toString());n.put("source",i.source);n.put("userMessage",i.userMessage);n.put("orderId",i.orderId);n.put("userId",i.userId);n.put("complaintAt",i.complaintAt==null?null:i.complaintAt.toString());n.put("rawLog",i.rawLog);n.put("logLines",i.rawLog==null?0:i.rawLog.lines().count());
  n.set("stages",json.read(i.stagesJson));n.set("findings",json.read(i.findingsJson));n.set("diagnosis",json.read(i.diagnosisJson));n.put("llmConfidence",i.llmConfidence);n.put("finalConfidence",i.finalConfidence);n.set("candidates",json.read(i.candidatesJson));n.set("decision",json.read(i.decisionJson));n.set("task",i.taskId==null?json.read(null):tasks.findById(i.taskId).map(views::task).orElse(json.read(null)));n.put("dedupOf",i.dedupOf);if(i.pipelineMs==null)n.putNull("pipelineSeconds");else n.put("pipelineSeconds",i.pipelineMs/1000.0);n.put("error",i.error);
  var logs=n.putArray("auditLog");for(var a:audits.findByIncidentIdOrderByTsAscIdAsc(i.id)){var item=logs.addObject();item.put("ts",a.ts.toString());item.put("actor",a.actor);item.put("event",a.event);item.set("payload",json.read(a.payloadJson));}return n;
 }
 public void saveAnalysis(long id,JsonNode response,JsonNode diagnosis,double confidence,String fingerprint,JsonNode candidates,JsonNode decision,long ms){
  if(!Double.isFinite(confidence)||confidence<0||confidence>1||ms<0)throw DataException.invalid("Invalid confidence or timing");
  lock.acquire();var i=repo.lockById(id).orElseThrow(()->DataException.missing("Incident"));
  if(!Set.of("NEW","ANALYZING","DIAGNOSED").contains(i.status))throw DataException.conflict("Incident analysis is already final");
  i.findingsJson=json.write(json.safe(response.path("findings")));i.diagnosisJson=json.write(json.safe(diagnosis));i.llmConfidence=response.path("diagnosis").path("confidence").isNumber()?response.path("diagnosis").path("confidence").asDouble():null;i.finalConfidence=confidence;i.fingerprint=fingerprint;i.candidatesJson=json.write(json.safe(candidates));i.decisionJson=json.write(json.safe(decision));i.pipelineMs=ms;i.status="DIAGNOSED";i.error=null;
  audit.append(id,"AI","Analysis stored",json.object().put("finalConfidence",confidence));
 }
 public void updateStatus(long id,String status,String error){
  if(!STATUSES.contains(status))throw DataException.invalid("Unknown incident status");
  lock.acquire();var i=repo.lockById(id).orElseThrow(()->DataException.missing("Incident"));
  if(i.status.equals(status))return;
  if(i.taskId!=null)throw DataException.conflict("Dispatched incident is final");
  boolean allowed=switch(i.status){case "NEW"->Set.of("ANALYZING","FAILED","DISMISSED").contains(status);case "ANALYZING"->Set.of("DIAGNOSED","FAILED","DISMISSED").contains(status);case "DIAGNOSED"->Set.of("PENDING_CONFIRM","NEEDS_TRIAGE","FAILED","DISMISSED").contains(status);case "PENDING_CONFIRM","NEEDS_TRIAGE"->status.equals("DISMISSED");default->false;};
  if(!allowed)throw DataException.conflict("Invalid incident transition "+i.status+" -> "+status);
  i.status=status;i.error=error;audit.append(id,"SYSTEM","Incident status: "+status,null);
 }
 public void resetDemo(){lock.acquire();audits.deleteAllInBatch();tasks.deleteAllInBatch();repo.deleteAllInBatch();developers.deleteAllInBatch();var auto=settings.findById("autoDispatch").orElseThrow();auto.value="true";settings.save(auto);seeder.seedMissing();}
 public void recordPipelineDuration(long id,long pipelineMs){
  if(pipelineMs<0)throw DataException.invalid("Pipeline duration cannot be negative");
  lock.acquire();var i=repo.lockById(id).orElseThrow(()->DataException.missing("Incident"));i.pipelineMs=pipelineMs;
 }
 /** Additive hook for pipeline stage progress, never expose raw AI response. */
 public void saveStages(long id,JsonNode stages){lock.acquire();var i=repo.lockById(id).orElseThrow(()->DataException.missing("Incident"));i.stagesJson=json.write(json.safe(stages));}
 @Transactional(readOnly=true) public List<JsonNode> list(){return repo.findAllByOrderByCreatedAtDesc().stream().map(i->{var n=json.object();n.put("id",i.id);n.put("status",i.status);n.put("createdAt",i.createdAt.toString());var diagnosis=json.read(i.diagnosisJson);n.put("title",diagnosis.path("rootCause").isMissingNode()?null:diagnosis.path("rootCause").asText());n.set("severity",diagnosis.path("severity").isMissingNode()?json.read(null):diagnosis.path("severity"));n.putNull("assignee");if(i.taskId!=null)tasks.findById(i.taskId).ifPresent(t->{n.put("title",t.title);n.put("severity",t.priority);developers.findById(t.assigneeId).ifPresent(d->{var a=n.putObject("assignee");a.put("id",d.id);a.put("name",d.name);});});return (JsonNode)n;}).toList();}
}
