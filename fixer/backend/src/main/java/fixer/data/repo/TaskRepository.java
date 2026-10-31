package fixer.data.repo;

import fixer.data.domain.DevTask;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;

import java.util.*;

public interface TaskRepository extends JpaRepository<DevTask, Long> {
    Optional<DevTask> findByActiveFingerprint(String fingerprint);

    boolean existsByIdempotencyKey(String key);

    long countByAssigneeIdAndStatusIn(String developerId, Collection<String> statuses);

    List<DevTask> findByAssigneeIdOrderByCreatedAtDesc(String developerId);

    List<DevTask> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from DevTask t where t.id=:id")
    Optional<DevTask> lockById(long id);
}
