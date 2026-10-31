package fixer.api;

import fixer.data.DataException;
import fixer.data.port.SettingsStore;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "http://localhost:5173")
public class SettingsController {
    private final SettingsStore settings;

    public SettingsController(SettingsStore settings) {
        this.settings = settings;
    }

    public record SettingsResponse(boolean autoDispatch) {}
    public record UpdateSettingsRequest(Boolean autoDispatch) {}

    @GetMapping
    public SettingsResponse get() {
        return new SettingsResponse(settings.autoDispatch());
    }

    @PutMapping
    public SettingsResponse update(@RequestBody UpdateSettingsRequest request) {
        if (request == null || request.autoDispatch() == null) throw DataException.invalid("autoDispatch is required");
        settings.setAutoDispatch(request.autoDispatch());
        return get();
    }
}
