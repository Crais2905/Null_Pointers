package fixer.metrics;
import fixer.data.repo.IncidentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Set;
@Service
public class MetricsService {
 private final IncidentRepository incidents;
 public MetricsService(IncidentRepository incidents){this.incidents=incidents;}
 public record Metrics(double avgPipelineSec,double autoDispatchedPercent,long dedupMerged,long total) {}
 @Transactional(readOnly=true) public Metrics snapshot(){
  var all=incidents.findAll();long total=all.size();
  double avg=all.stream().filter(i->i.pipelineMs!=null&&!Set.of("NEW","ANALYZING","DIAGNOSED").contains(i.status)).mapToLong(i->i.pipelineMs).average().orElse(0)/1000.0;
  long auto=all.stream().filter(i->i.status.equals("AUTO_DISPATCHED")&&i.taskId!=null&&i.dedupOf==null&&"SYSTEM".equals(i.dispatchActor)).count();
  long dedup=all.stream().filter(i->i.status.equals("DEDUPLICATED")).count();
  return new Metrics(avg,total==0?0:100.0*auto/total,dedup,total);
 }
}
