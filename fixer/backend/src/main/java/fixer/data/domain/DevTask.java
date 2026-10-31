package fixer.data.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "dev_tasks")
public class DevTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false, length = 40)
    public String fingerprint;
    @Column(unique = true, length = 40)
    public String activeFingerprint;
    @Column(nullable = false, unique = true, length = 128)
    public String idempotencyKey;
    @Column(nullable = false)
    public Long incidentId;
    @Column(nullable = false, length = 80)
    public String title;
    @Lob
    public String bodyMd;
    public String priority;
    public String assigneeId;
    public String backupId;
    public String status = "OPEN";
    public int occurrences = 1;
    public String deliveryStatus = "IN_APP";
    public Instant createdAt = Instant.now();
    public Instant dispatchedAt;
    /**
     * Claimed before network IO: an ambiguous network failure must never resend.
     */
    public boolean webhookAttempted;
    @Lob
    public String deliveryError;
}
