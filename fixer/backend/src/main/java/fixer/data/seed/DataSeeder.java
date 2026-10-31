package fixer.data.seed;
import fixer.data.domain.*;
import fixer.data.repo.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component
public class DataSeeder implements ApplicationRunner {
 private final DeveloperRepository developers;private final SettingRepository settings;private final SeedCatalog catalog;
 public DataSeeder(DeveloperRepository developers,SettingRepository settings,SeedCatalog catalog){this.developers=developers;this.settings=settings;this.catalog=catalog;}
 @Override @Transactional public void run(ApplicationArguments args){seedMissing();}
 public void seedMissing(){
  for(var d:catalog.developers()){
   if(developers.existsById(d.get("id").asText()))continue;
   var entity=new DeveloperEntity();entity.id=d.get("id").asText();entity.name=d.get("name").asText();entity.role=d.get("role").asText();entity.available=d.path("available").asBoolean();entity.handle=d.path("handle").asText();entity.skillsJson=d.get("skills").toString();entity.ownedModulesJson=d.get("owned_modules").toString();developers.save(entity);
  }
  ensureSetting("dispatch-lock","lock");ensureSetting("autoDispatch","true");
 }
 private void ensureSetting(String key,String value){if(!settings.existsById(key)){var s=new Setting();s.key=key;s.value=value;settings.save(s);}}
}
