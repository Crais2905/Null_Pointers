package fixer.api;

import com.fasterxml.jackson.databind.JsonNode;
import fixer.data.DataException;
import fixer.data.port.IncidentStore;
import fixer.data.seed.SeedCatalog;
import fixer.pipeline.IncidentPipeline;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/incidents")
@CrossOrigin(origins = "http://localhost:5173")
public class IncidentController {
    private final IncidentStore incidents;
    private final IncidentPipeline pipeline;
    private final SeedCatalog seed;
    private final IncidentCommandService commands;

    public IncidentController(IncidentStore incidents, IncidentPipeline pipeline, SeedCatalog seed, IncidentCommandService commands) {
        this.incidents = incidents;
        this.pipeline = pipeline;
        this.seed = seed;
        this.commands = commands;
    }

    public record CreateIncidentRequest(String userMessage, String log, Long orderId, Long userId, String complaintAt) {}
    public record SimulateRequest(String scenario) {}
    public record ConfirmRequest(String assigneeId) {}
    public record AcceptedResponse(long id, String status) {}

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AcceptedResponse> create(@RequestBody CreateIncidentRequest request) {
        if (request == null) throw DataException.invalid("Request body is required");
        return accept(new IncidentStore.Submission(request.userMessage(), request.log(), request.orderId(),
                request.userId(), request.complaintAt(), "API"));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AcceptedResponse> upload(@RequestParam(required = false) String userMessage,
                                                   @RequestParam(required = false) Long orderId,
                                                   @RequestParam(required = false) Long userId,
                                                   @RequestParam(required = false) String complaintAt,
                                                   @RequestPart("file") MultipartFile file) {
        if (file == null || file.isEmpty()) throw DataException.invalid("Log file is required");
        String filename = file.getOriginalFilename();
        String extension = filename == null || filename.lastIndexOf('.') < 0
                ? "" : filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (!List.of("log", "txt", "json").contains(extension)) throw DataException.invalid("File must be .log, .txt, or .json");
        try {
            String rawLog = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(file.getBytes())).toString();
            return accept(new IncidentStore.Submission(userMessage, rawLog, orderId, userId, complaintAt, "API"));
        } catch (CharacterCodingException e) {
            throw DataException.invalid("Log file must be UTF-8");
        } catch (IOException e) {
            throw DataException.invalid("Could not read uploaded log file");
        }
    }

    @PostMapping(path = "/simulate", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AcceptedResponse> simulate(@RequestBody SimulateRequest request) {
        if (request == null || request.scenario() == null || request.scenario().isBlank())
            throw DataException.invalid("scenario is required");
        JsonNode complaint = seed.complaint(request.scenario());
        return accept(new IncidentStore.Submission(complaint.path("userMessage").asText(), seed.log(request.scenario()),
                longOrNull(complaint.path("orderId")), longOrNull(complaint.path("userId")), null, request.scenario()));
    }

    @GetMapping
    public List<JsonNode> list() {
        return incidents.list();
    }

    @GetMapping("/{id}")
    public JsonNode get(@PathVariable long id) {
        return incidents.find(id).orElseThrow(() -> DataException.missing("Incident"));
    }

    @PostMapping("/{id}/confirm")
    public JsonNode confirm(@PathVariable long id, @RequestBody(required = false) ConfirmRequest request) {
        return commands.confirm(id, request == null ? null : request.assigneeId());
    }

    @PostMapping("/{id}/dismiss")
    public JsonNode dismiss(@PathVariable long id) {
        return commands.dismiss(id);
    }

    private ResponseEntity<AcceptedResponse> accept(IncidentStore.Submission submission) {
        IncidentStore.Accepted accepted = incidents.accept(submission);
        if (!accepted.reused()) pipeline.analyze(accepted.id());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new AcceptedResponse(accepted.id(), accepted.status()));
    }

    private Long longOrNull(JsonNode value) {
        return value == null || value.isNull() || !value.canConvertToLong() ? null : value.asLong();
    }
}
