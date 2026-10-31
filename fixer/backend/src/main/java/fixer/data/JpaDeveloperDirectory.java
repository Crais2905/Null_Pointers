package fixer.data;
import fixer.data.port.DeveloperDirectory;
import fixer.data.repo.DeveloperRepository;
import fixer.data.seed.SeedCatalog;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service @Transactional(readOnly=true)
public class JpaDeveloperDirectory implements DeveloperDirectory {
 private final DeveloperRepository repo;private final SeedCatalog catalog;private final JsonSupport json;
 public JpaDeveloperDirectory(DeveloperRepository repo,SeedCatalog catalog,JsonSupport json){this.repo=repo;this.catalog=catalog;this.json=json;}
 public List<Developer> developers(){return repo.findAllByOrderByIdAsc().stream().map(d->{
  var skills=new ArrayList<String>();json.read(d.skillsJson).forEach(s->skills.add(s.asText()));
  var owned=new ArrayList<Ownership>();json.read(d.ownedModulesJson).forEach(m->owned.add(new Ownership(m.get("id").asText(),m.get("level").asText())));
  return new Developer(d.id,d.name,d.role,d.available,d.handle,List.copyOf(skills),List.copyOf(owned));
 }).toList();}
 public List<DeveloperDirectory.Module> modules(){return catalog.modules();}
}
