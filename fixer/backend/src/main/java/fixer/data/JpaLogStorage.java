package fixer.data;
import fixer.data.repo.IncidentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @Transactional
public class JpaLogStorage implements LogStorage {
 private final IncidentRepository repo;private final DatabaseLock lock;private final fixer.data.port.IncidentStore incidents;
 public JpaLogStorage(IncidentRepository repo,DatabaseLock lock,fixer.data.port.IncidentStore incidents){this.repo=repo;this.lock=lock;this.incidents=incidents;}
 public String save(long incidentId,String rawLog){
  if(rawLog==null)throw DataException.invalid("Log is required");
  lock.acquire();var i=repo.lockById(incidentId).orElseThrow(()->DataException.missing("Incident"));
  if(!"NEW".equals(i.status)||i.taskId!=null)throw DataException.conflict("Log is immutable after analysis starts");
  if(i.rawLog!=null&&!i.rawLog.equals(rawLog))throw DataException.conflict("Submitted log is immutable");
  i.rawLog=rawLog;i.logHash=Hashes.sha256(rawLog);return i.logHash;
 }
 @Transactional(readOnly=true) public String read(long id){return repo.findById(id).orElseThrow(()->DataException.missing("Incident")).rawLog;}
 public void reset(){incidents.resetDemo();}
}
