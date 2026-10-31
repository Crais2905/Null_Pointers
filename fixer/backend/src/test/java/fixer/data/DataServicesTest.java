package fixer.data;
import fixer.data.port.*;
import fixer.data.repo.*;
import fixer.data.seed.SeedCatalog;
import fixer.dispatch.*;
import fixer.metrics.MetricsService;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.util.*;
import java.util.concurrent.*;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:data-tests;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000"})
class DataServicesTest {
 @Autowired IncidentStore incidents;
 @Autowired TaskStore tasks;
 @Autowired DeveloperDirectory directory;
 @Autowired SettingsStore settings;
 @Autowired LogStorage logs;
 @Autowired AuditStore audit;
 @Autowired TaskRepository taskRepo;
 @Autowired IncidentRepository incidentRepo;
 @Autowired DeveloperRepository devRepo;
 @Autowired AuditRepository auditRepo;
 @Autowired ObjectMapper mapper;
 @Autowired SeedCatalog catalog;
 @Autowired MarkdownExporter markdown;
 @Autowired InAppSink inApp;
 @Autowired WebhookSink sink;
 @Autowired MetricsService metrics;
 @BeforeEach void reset(){incidents.resetDemo();}
 long accept(String label){return incidents.accept(new IncidentStore.Submission(label,"line 1\r\nline 2\r\n",null,null,null,"TEST")).id();}
 long analyzed(String label){long id=accept(label);var ai=mapper.createObjectNode();ai.putObject("diagnosis").put("confidence",0.9);ai.putArray("findings");var diagnosis=mapper.createObjectNode().put("rootCause","Cause").put("severity","P1");diagnosis.putArray("evidence").addObject().put("line",1).put("quote","line 1").put("verification_quote","secret");incidents.saveAnalysis(id,ai,diagnosis,0.9,"a".repeat(40),mapper.createArrayNode(),mapper.createObjectNode().put("rule","R5"),1500);return id;}
 TaskStore.DispatchRequest request(long id){return new TaskStore.DispatchRequest(id,"a".repeat(40),"[payments] Duplicate charge","## Evidence\nLine 1","P1","dev-1","dev-2","AUTO_DISPATCHED","SYSTEM");}
 @Test void seedsDevelopersModulesAndAllLogs(){assertEquals(4,directory.developers().size());assertEquals(5,directory.modules().size());assertTrue(settings.autoDispatch());for(String s:List.of("DUP_CHARGE","DUP_CHARGE_AGAIN","PROMO_NPE","COURIER_TIMEOUT","AMBIGUOUS")){assertTrue(catalog.log(s).lines().count()>=50);assertNotNull(catalog.complaint(s));}assertThrows(DataException.class,()->catalog.log("../unknown"));}
 @Test void admissionDedupUsesHashMessageAndTenMinuteWindow(){
  long id=accept("same");assertEquals(id,accept("same"));assertEquals(1,incidentRepo.count());assertNotEquals(id,accept("different"));
  var old=incidentRepo.findById(id).orElseThrow();old.createdAt=Instant.now().minusSeconds(601);incidentRepo.saveAndFlush(old);assertNotEquals(id,accept("same"));
 }
 @Test void admissionIsAtomicUnderConcurrency() throws Exception {
  var pool=Executors.newFixedThreadPool(4);try{var futures=new ArrayList<Future<Long>>();for(int n=0;n<8;n++)futures.add(pool.submit(()->accept("same")));var ids=new HashSet<Long>();for(var f:futures)ids.add(f.get(15,TimeUnit.SECONDS));assertEquals(1,ids.size());assertEquals(1,incidentRepo.count());}finally{pool.shutdownNow();}
 }
 @Test void rawLogAndHashAreExactAndImmutable(){long id=accept("log");assertEquals("line 1\r\nline 2\r\n",logs.read(id));assertEquals(Hashes.sha256(logs.read(id)),logs.save(id,logs.read(id)));assertThrows(DataException.class,()->logs.save(id,"changed"));incidents.updateStatus(id,"ANALYZING",null);assertThrows(DataException.class,()->logs.save(id,logs.read(id)));}
 @Test void storesOnlyPublicEvidenceAndConfidence(){long id=analyzed("evidence");var value=incidents.find(id).orElseThrow();assertFalse(value.toString().contains("verification_quote"));assertFalse(value.toString().contains("secret"));assertEquals(0.9,value.get("llmConfidence").asDouble());assertEquals(2,value.get("logLines").asInt());assertEquals("DIAGNOSED",value.get("status").asText());assertEquals(2,value.get("auditLog").size());}
 @Test void dispatchCreatesTaskAndRepeatDoesNotIncreaseOccurrences(){long id=analyzed("dispatch");var first=tasks.dispatch(request(id));assertTrue(first.created());assertEquals("IN_APP",inApp.deliver(first.taskId()));assertEquals("AUTO_DISPATCHED",incidents.find(id).orElseThrow().get("status").asText());var repeated=tasks.dispatch(request(id));assertFalse(repeated.created());assertEquals(1,repeated.occurrences());assertEquals(1,taskRepo.count());assertEquals(1,tasks.countOpen("dev-1"));}
 @Test void newIncidentWithSameBugMergesOnce(){var first=tasks.dispatch(request(analyzed("one")));long secondId=analyzed("two");var second=tasks.dispatch(request(secondId));assertTrue(second.duplicate());assertEquals(first.taskId(),second.taskId());assertEquals(2,second.occurrences());assertEquals(2,tasks.dispatch(request(secondId)).occurrences());assertEquals("DEDUPLICATED",incidents.find(secondId).orElseThrow().path("status").asText());assertEquals(1,taskRepo.count());}
 @Test void dispatchSerializesCompetingIncidents() throws Exception {
  long a=analyzed("one"),b=analyzed("two");var pool=Executors.newFixedThreadPool(2);try{var f1=pool.submit(()->tasks.dispatch(request(a)));var f2=pool.submit(()->tasks.dispatch(request(b)));var x=f1.get(15,TimeUnit.SECONDS);var y=f2.get(15,TimeUnit.SECONDS);assertEquals(x.taskId(),y.taskId());assertEquals(1,taskRepo.count());assertEquals(2,tasks.find(x.taskId()).orElseThrow().path("occurrences").asInt());}finally{pool.shutdownNow();}
 }
 @Test void doneReleasesActiveFingerprintAndCreatesNewGeneration(){var first=tasks.dispatch(request(analyzed("one")));tasks.setStatus(first.taskId(),"ACK");assertEquals(1,tasks.countOpen("dev-1"));tasks.setStatus(first.taskId(),"DONE");tasks.setStatus(first.taskId(),"DONE");assertEquals(0,tasks.countOpen("dev-1"));assertThrows(DataException.class,()->tasks.setStatus(first.taskId(),"ACK"));assertTrue(tasks.findOpenByFingerprint("a".repeat(40)).isEmpty());var second=tasks.dispatch(request(analyzed("two")));assertTrue(second.created());assertNotEquals(first.taskId(),second.taskId());assertEquals(2,taskRepo.count());assertEquals(2,taskRepo.findAll().stream().map(t->t.idempotencyKey).distinct().count());}
 @Test void invalidAssigneeRollsBackEverything(){long id=analyzed("bad");var req=new TaskStore.DispatchRequest(id,"a".repeat(40),"Task","Body","P1","missing",null,"AUTO_DISPATCHED","SYSTEM");assertThrows(DataException.class,()->tasks.dispatch(req));assertEquals(0,taskRepo.count());assertTrue(incidents.find(id).orElseThrow().path("task").isNull());assertEquals("DIAGNOSED",incidents.find(id).orElseThrow().path("status").asText());assertEquals(2,auditRepo.count());}
 @Test void unavailableAssigneeIsRejected(){var d=devRepo.findById("dev-1").orElseThrow();d.available=false;devRepo.save(d);long id=analyzed("unavailable");assertThrows(DataException.class,()->tasks.dispatch(request(id)));assertEquals(0,taskRepo.count());}
 @Test void pendingRequiresHumanAndManualDispatchDoesNotCountAsAuto(){long id=analyzed("manual");incidents.updateStatus(id,"PENDING_CONFIRM",null);assertThrows(DataException.class,()->tasks.dispatch(request(id)));var r=request(id);tasks.dispatch(new TaskStore.DispatchRequest(id,r.fingerprint(),r.title(),r.bodyMd(),r.priority(),r.assigneeId(),r.backupId(),r.outcome(),"HUMAN"));assertEquals(0,metrics.snapshot().autoDispatchedPercent());}
 @Test void markdownAndInboxUseActualTask(){var result=tasks.dispatch(request(analyzed("markdown")));String text=markdown.export(result.taskId());assertTrue(text.contains("# [payments]"));assertTrue(text.contains("## Evidence"));assertTrue(text.contains("Occurrences: 1"));assertEquals(1,tasks.list("dev-1").size());assertEquals(0,tasks.list("dev-3").size());assertThrows(DataException.class,()->markdown.export(999999));}
 @Test void disabledWebhookReturnsCommittedInbox(){var result=tasks.dispatch(request(analyzed("delivery")));assertEquals("IN_APP",sink.deliver(result.taskId()));assertFalse(taskRepo.findById(result.taskId()).orElseThrow().webhookAttempted);}
 @Test void metricsUseMeasuredTimingsAndMergedIncidents(){assertEquals(0,metrics.snapshot().total());tasks.dispatch(request(analyzed("one")));tasks.dispatch(request(analyzed("two")));accept("new");var m=metrics.snapshot();assertEquals(3,m.total());assertEquals(1,m.dedupMerged());assertEquals(1.5,m.avgPipelineSec());assertEquals(100.0/3,m.autoDispatchedPercent(),0.001);}
 @Test void resetRemovesStateAndRestoresSeed(){tasks.dispatch(request(analyzed("reset")));settings.setAutoDispatch(false);var d=devRepo.findById("dev-1").orElseThrow();d.available=false;devRepo.save(d);logs.reset();assertEquals(0,incidentRepo.count());assertEquals(0,taskRepo.count());assertEquals(0,auditRepo.count());assertTrue(settings.autoDispatch());assertTrue(directory.developers().stream().allMatch(DeveloperDirectory.Developer::available));assertEquals(0,metrics.snapshot().total());accept("after reset");}
 @Test void validatesInputAndTransitions(){assertThrows(DataException.class,()->incidents.accept(new IncidentStore.Submission("","",null,null,null,"API")));long id=accept("state");assertThrows(DataException.class,()->incidents.updateStatus(id,"AUTO_DISPATCHED",null));incidents.updateStatus(id,"DISMISSED",null);assertThrows(DataException.class,()->tasks.dispatch(request(id)));}
 @Test void pipelineProgressAndFinalDurationArePersisted(){
  long id=analyzed("progress");var stages=mapper.createArrayNode();stages.addObject().put("name","DISPATCH").put("status","DONE");incidents.saveStages(id,stages);tasks.dispatch(request(id));incidents.recordPipelineDuration(id,2750);assertEquals(2.75,metrics.snapshot().avgPipelineSec());assertEquals("DISPATCH",incidents.find(id).orElseThrow().path("stages").get(0).path("name").asText());assertThrows(DataException.class,()->incidents.recordPipelineDuration(id,-1));
 }

}
