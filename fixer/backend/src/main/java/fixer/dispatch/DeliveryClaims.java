package fixer.dispatch;

import fixer.data.*;
import fixer.data.repo.TaskRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.*;

@Component
public class DeliveryClaims {
    private final TaskRepository tasks;
    private final DatabaseLock lock;

    public DeliveryClaims(TaskRepository tasks, DatabaseLock lock) {
        this.tasks = tasks;
        this.lock = lock;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claim(long id) {
        lock.acquire();
        var t = tasks.lockById(id).orElseThrow(() -> DataException.missing("Task"));
        if (t.webhookAttempted) return false;
        t.webhookAttempted = true;
        return true;
    }
}
