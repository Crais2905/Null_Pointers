package fixer.data.domain;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="developers")
public class DeveloperEntity {
 @Id public String id;
 public String name;
 public String role;
 @Lob public String skillsJson;
 @Lob public String ownedModulesJson;
 public boolean available;
 public String handle;
}
