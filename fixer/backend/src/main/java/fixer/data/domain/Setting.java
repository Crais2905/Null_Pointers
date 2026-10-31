package fixer.data.domain;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="settings")
public class Setting {
 @Id @Column(name="setting_key") public String key;
 @Column(name="setting_value") public String value;
}
