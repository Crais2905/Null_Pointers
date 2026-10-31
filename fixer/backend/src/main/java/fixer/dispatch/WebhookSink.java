package fixer.dispatch;
import fixer.data.port.TaskStore;
import fixer.data.JsonSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
@Component @Primary
public class WebhookSink implements TaskSink {
 private final TaskStore tasks;private final InAppSink inApp;private final DeliveryClaims claims;private final JsonSupport json;private final String url;private final Duration timeout;
 private final HttpClient client;
 public WebhookSink(TaskStore tasks,InAppSink inApp,DeliveryClaims claims,JsonSupport json,@Value("${fixer.dispatch.webhook-url:}") String url,@Value("${fixer.dispatch.timeout-ms:5000}") long timeoutMs){
  this.tasks=tasks;this.inApp=inApp;this.claims=claims;this.json=json;this.url=url;this.timeout=Duration.ofMillis(Math.max(1,timeoutMs));this.client=HttpClient.newBuilder().connectTimeout(timeout).followRedirects(HttpClient.Redirect.NEVER).build();
 }
 public String deliver(Long id){
  if(TransactionSynchronizationManager.isActualTransactionActive())throw new IllegalStateException("Call TaskSink only after dispatch transaction commits");
  String current=inApp.deliver(id);if(url==null||url.isBlank())return current;
  if(!claims.claim(id))return inApp.deliver(id);
  try {
   var t=tasks.find(id).orElseThrow();
   // External payload deliberately excludes raw logs and arbitrary model prose/PII.
   var payload=json.object();payload.put("text","Fixer task #"+id+" · "+t.path("priority").asText()+" · assignee "+t.path("assigneeId").asText()+" · /api/tasks/"+id+".md");
   var request=HttpRequest.newBuilder(URI.create(url)).timeout(timeout).header("Content-Type","application/json; charset=utf-8").POST(HttpRequest.BodyPublishers.ofString(json.write(payload))).build();
   var response=client.send(request,HttpResponse.BodyHandlers.discarding());
   if(response.statusCode()<200||response.statusCode()>=300)throw new java.io.IOException("Webhook HTTP "+response.statusCode());
   tasks.updateDelivery(id,"WEBHOOK_OK",null);return "WEBHOOK_OK";
  }catch(Exception e){if(e instanceof InterruptedException)Thread.currentThread().interrupt();tasks.updateDelivery(id,"WEBHOOK_FAILED",e instanceof java.io.IOException?"Webhook IO failure":"Webhook delivery failed");return "WEBHOOK_FAILED";}
 }
}
