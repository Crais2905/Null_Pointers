package fixer.api;

import fixer.data.port.IncidentStore;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reset")
@CrossOrigin(origins = "http://localhost:5173")
public class ResetController {
    private final IncidentStore incidents;

    public ResetController(IncidentStore incidents) {
        this.incidents = incidents;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset() {
        incidents.resetDemo();
    }
}
