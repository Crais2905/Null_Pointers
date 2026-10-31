package fixer.data.repo;
import fixer.data.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AuditRepository extends JpaRepository<AuditLog,Long> {
 List<AuditLog> findByIncidentIdOrderByTsAscIdAsc(long incidentId);
}
