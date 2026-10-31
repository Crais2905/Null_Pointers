package fixer.data.repo;

import fixer.data.domain.Incident;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;

import java.util.*;
import java.time.Instant;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findByLogHashAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(String hash, Instant cutoff);

    List<Incident> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Incident i where i.id=:id")
    Optional<Incident> lockById(long id);
}
