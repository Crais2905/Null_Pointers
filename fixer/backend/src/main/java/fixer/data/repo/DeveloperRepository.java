package fixer.data.repo;

import fixer.data.domain.DeveloperEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeveloperRepository extends JpaRepository<DeveloperEntity, String> {
    List<DeveloperEntity> findAllByOrderByIdAsc();
}
