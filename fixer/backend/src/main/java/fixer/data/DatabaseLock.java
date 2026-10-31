package fixer.data;

import fixer.data.repo.SettingRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.*;

@Component
public class DatabaseLock {
    private final SettingRepository repo;

    public DatabaseLock(SettingRepository repo) {
        this.repo = repo;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void acquire() {
        repo.lockByKey("dispatch-lock").orElseThrow(() -> new IllegalStateException("Seed lock missing"));
    }
}
