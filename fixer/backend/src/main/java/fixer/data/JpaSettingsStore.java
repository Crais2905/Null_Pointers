package fixer.data;

import fixer.data.port.SettingsStore;
import fixer.data.repo.SettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class JpaSettingsStore implements SettingsStore {
    private final SettingRepository repo;
    private final DatabaseLock lock;

    public JpaSettingsStore(SettingRepository repo, DatabaseLock lock) {
        this.repo = repo;
        this.lock = lock;
    }

    @Transactional(readOnly = true)
    public boolean autoDispatch() {
        return Boolean.parseBoolean(repo.findById("autoDispatch").orElseThrow().value);
    }

    public void setAutoDispatch(boolean enabled) {
        lock.acquire();
        var s = repo.findById("autoDispatch").orElseThrow();
        s.value = Boolean.toString(enabled);
        repo.save(s);
    }
}
