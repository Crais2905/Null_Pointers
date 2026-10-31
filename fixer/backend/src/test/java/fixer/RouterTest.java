package fixer;

import fixer.data.port.DeveloperDirectory.Developer;
import fixer.data.port.DeveloperDirectory.Ownership;
import fixer.routing.Router;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class RouterTest {
    @Test
    void scoresModuleOwnershipPrimarySkillsAndNonP1Load() {
        Developer primary = developer("primary", true, List.of("java", "payments", "idempotency"), List.of(new Ownership("payments", "primary")));
        Developer secondary = developer("secondary", true, List.of("java", "payments", "idempotency"), List.of(new Ownership("payments", "secondary")));

        List<Router.Candidate> ranked = Router.rank("payments", List.of("java", "payments", "idempotency", "sql"),
                List.of(primary, secondary), Map.of("primary", 3, "secondary", 0), false);

        assertEquals(List.of("secondary", "primary"), ranked.stream().map(Router.Candidate::developerId).toList());
        assertEquals(80, ranked.get(0).score());
        assertEquals(75, ranked.get(1).score());
        assertTrue(ranked.get(0).reasons().stream().anyMatch(reason -> reason.contains("secondary")));
    }

    @Test
    void doesNotPenalizeP1AndFiltersUnavailableOrIncompetentDevelopers() {
        Developer loaded = developer("loaded", true, List.of("java"), List.of(new Ownership("payments", "secondary")));
        Developer unavailable = developer("away", false, List.of("java"), List.of(new Ownership("payments", "primary")));
        Developer unrelated = developer("unrelated", true, List.of(), List.of());

        List<Router.Candidate> p1 = Router.rank("payments", List.of(), List.of(loaded, unavailable, unrelated), Map.of("loaded", 10), true);
        List<Router.Candidate> normal = Router.rank("payments", List.of(), List.of(loaded), Map.of("loaded", 10), false);

        assertEquals(50, p1.get(0).score());
        assertTrue(p1.get(0).reasons().stream().anyMatch(reason -> reason.contains("не враховано для P1")));
        assertTrue(normal.isEmpty());
        assertEquals(1, p1.size());
    }

    @Test
    void returnsAtMostThreeCandidatesInDeterministicScoreOrder() {
        List<Developer> devs = List.of(
                developer("d3", true, List.of(), List.of(new Ownership("payments", "primary"))),
                developer("d1", true, List.of(), List.of(new Ownership("payments", "primary"))),
                developer("d2", true, List.of(), List.of(new Ownership("payments", "primary"))),
                developer("d4", true, List.of(), List.of(new Ownership("payments", "primary"))));
        List<Router.Candidate> ranked = Router.rank("payments", List.of(), devs, Map.of(), true);
        assertEquals(List.of("d1", "d2", "d3"), ranked.stream().map(Router.Candidate::developerId).toList());
    }

    private static Developer developer(String id, boolean available, List<String> skills, List<Ownership> modules) {
        return new Developer(id, id, "BACKEND", available, "", skills, modules);
    }
}
