package fixer.data.domain;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="incidents")
public class Incident {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 public Instant createdAt = Instant.now();
 public String source;
 @Lob public String userMessage;
 public Long orderId;
 public Long userId;
 public Instant complaintAt;
 @Lob public String rawLog;
 @Column(length=64) public String logHash;
 public String status = "NEW";
 @Lob public String stagesJson = "[]";
 @Lob public String findingsJson = "[]";
 @Lob public String diagnosisJson;
 public Double llmConfidence;
 public Double finalConfidence;
 public String fingerprint;
 @Lob public String candidatesJson = "[]";
 @Lob public String decisionJson;
 public Long taskId;
 public Long dedupOf;
 public Long pipelineMs;
 public String dispatchActor;
 @Lob public String error;
}
