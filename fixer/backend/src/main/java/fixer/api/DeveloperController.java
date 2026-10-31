package fixer.api;

import fixer.data.port.DeveloperDirectory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class DeveloperController {
    private final DeveloperDirectory directory;

    public DeveloperController(DeveloperDirectory directory) {
        this.directory = directory;
    }

    @GetMapping("/developers")
    public List<DeveloperDirectory.Developer> developers() {
        return directory.developers();
    }

    @GetMapping("/modules")
    public List<DeveloperDirectory.Module> modules() {
        return directory.modules();
    }
}
