package fixer.data.seed;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import fixer.data.port.DeveloperDirectory;
import java.util.*;
@Component
public class SeedCatalog {
 private final JsonNode developers;
 private final List<DeveloperDirectory.Module> modules;
 private final JsonNode complaints;
 public SeedCatalog() {
  try {
   ObjectMapper yaml=new ObjectMapper(new YAMLFactory());
   try(var in=new ClassPathResource("seed/developers.yml").getInputStream()){developers=yaml.readTree(in).get("developers");}
   JsonNode catalog;
   try(var in=new ClassPathResource("seed/catalog.yml").getInputStream()){catalog=yaml.readTree(in).get("modules");}
   var result=new ArrayList<DeveloperDirectory.Module>();
   for(var m:catalog){var keys=new ArrayList<String>();m.get("keywords").forEach(k->keys.add(k.asText()));result.add(new DeveloperDirectory.Module(m.get("id").asText(),m.get("name").asText(),m.get("description").asText(),List.copyOf(keys)));}
   modules=List.copyOf(result);
   try(var in=new ClassPathResource("seed/complaints.json").getInputStream()){complaints=new ObjectMapper().readTree(in);}
  }catch(Exception e){throw new IllegalStateException("Cannot load demo seed",e);}
 }
 public JsonNode developers(){return developers.deepCopy();}
 public List<DeveloperDirectory.Module> modules(){return modules;}
 public JsonNode complaint(String scenario){var value=complaints.get(scenario);if(value==null)throw fixer.data.DataException.invalid("Unknown scenario");return value.deepCopy();}
 public String log(String scenario){
  complaint(scenario);
  try(var in=new ClassPathResource("seed/logs/"+scenario.toLowerCase(Locale.ROOT)+".log").getInputStream()){return new String(in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}
  catch(java.io.IOException e){throw new IllegalStateException("Cannot read demo log",e);}
 }
}
