package fixer.data.domain;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="audit_logs")
public class AuditLog {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(nullable=false) public Long incidentId;
 public Instant ts=Instant.now();
 public String actor;
 @Lob public String event;
 @Lob public String payloadJson;
}
