package fixer.data.repo;

import fixer.data.domain.Setting;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface SettingRepository extends JpaRepository<Setting, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Setting s where s.key=:key")
    Optional<Setting> lockByKey(String key);
}
