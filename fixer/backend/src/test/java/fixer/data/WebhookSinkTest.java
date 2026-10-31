package fixer.data;
import fixer.data.port.*;
import fixer.dispatch.*;
import com.fasterxml.jackson.databind.*;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.net.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest
class WebhookSinkTest {
 @Autowired IncidentStore incidents;@Autowired TaskStore tasks;@Autowired InAppSink inApp;@Autowired DeliveryClaims claims;@Autowired JsonSupport json;@Autowired ObjectMapper mapper;
 @BeforeEach void reset(){incidents.resetDemo();}
 long create(){long id=incidents.accept(new IncidentStore.Submission("Customer secret@example.com","raw bearer secret",null,null,null,"API")).id();var response=mapper.createObjectNode();response.putArray("findings");response.putObject("diagnosis").put("confidence",0.9);incidents.saveAnalysis(id,response,mapper.createObjectNode(),0.9,"b".repeat(40),mapper.createArrayNode(),mapper.createObjectNode(),200);return tasks.dispatch(new TaskStore.DispatchRequest(id,"b".repeat(40),"Task secret@example.com","Raw sensitive prose","P1","dev-1",null,"AUTO_DISPATCHED","SYSTEM")).taskId();}
 @Test void sendsSlackCompatiblePayloadOnceWithoutRawData() throws Exception {
  var calls=new AtomicInteger();var payload=new StringBuilder();var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  server.createContext("/hook",exchange->{calls.incrementAndGet();payload.append(new String(exchange.getRequestBody().readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));exchange.sendResponseHeaders(200,-1);exchange.close();});server.start();
  try{long id=create();var sink=new WebhookSink(tasks,inApp,claims,json,"http://127.0.0.1:"+server.getAddress().getPort()+"/hook",1000);assertEquals("WEBHOOK_OK",sink.deliver(id));assertEquals("WEBHOOK_OK",sink.deliver(id));assertEquals(1,calls.get());assertTrue(mapper.readTree(payload.toString()).has("text"));assertFalse(payload.toString().contains("secret"));assertFalse(payload.toString().contains("sensitive"));}finally{server.stop(0);}
 }
 @Test void httpFailureKeepsInboxAndDoesNotRetry() throws Exception {
  var calls=new AtomicInteger();var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);server.createContext("/hook",exchange->{calls.incrementAndGet();exchange.sendResponseHeaders(503,-1);exchange.close();});server.start();
  try{long id=create();var sink=new WebhookSink(tasks,inApp,claims,json,"http://127.0.0.1:"+server.getAddress().getPort()+"/hook",1000);assertEquals("WEBHOOK_FAILED",sink.deliver(id));assertEquals("WEBHOOK_FAILED",sink.deliver(id));assertEquals(1,calls.get());assertTrue(tasks.find(id).isPresent());assertFalse(tasks.list("dev-1").isEmpty());}finally{server.stop(0);}
 }
}
