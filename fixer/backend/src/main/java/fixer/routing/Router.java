package fixer.routing;

import fixer.data.port.DeveloperDirectory.Developer;
import fixer.data.port.DeveloperDirectory.Ownership;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * В'ячеслав. Чиста функція без Spring.
 * score = 50 (власник модуля) + 10 (primary) + 10 * збіг навичок (макс 30) - 5 * відкриті завдання (макс 15; для P1 не враховується).
 * Компетентний: score >= 40. Повертає топ-3 з причинами.
 */
public final class Router {
    private Router() {}

    public record Candidate(String developerId, String name, int score, List<String> reasons) {}

    /** Ранжує доступних власників модуля та повертає до трьох кандидатів зі score >= 40. */
    public static List<Candidate> rank(String moduleId, List<String> requiredSkills,
                                       List<Developer> developers, Map<String, Integer> openTasks,
                                       boolean p1) {
        if (developers == null || developers.isEmpty()) return List.of();
        Set<String> required = (requiredSkills == null ? List.<String>of() : requiredSkills).stream()
                .filter(s -> s != null && !s.isBlank())
                .map(s -> s.toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
        List<Candidate> ranked = new ArrayList<>();
        for (Developer developer : developers) {
            if (developer == null || !developer.available()) continue;
            List<String> reasons = new ArrayList<>();
            Ownership ownership = moduleId == null || developer.ownedModules() == null ? null
                    : developer.ownedModules().stream().filter(o -> o != null && moduleId.equals(o.id())).findFirst().orElse(null);
            int score = 0;
            if (ownership != null) {
                score += 50;
                boolean primary = "primary".equalsIgnoreCase(ownership.level());
                if (primary) score += 10;
                reasons.add("власник модуля " + moduleId + (primary ? " (primary)" : " (secondary)"));
            }

            Set<String> skills = developer.skills() == null ? Set.of() : developer.skills().stream()
                    .filter(s -> s != null).map(s -> s.toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
            List<String> matched = required.stream().filter(skills::contains).sorted().toList();
            int skillScore = Math.min(30, matched.size() * 10);
            score += skillScore;
            if (!matched.isEmpty()) reasons.add("навички: " + String.join(", ", matched));

            int active = openTasks == null ? 0 : Math.max(0, openTasks.getOrDefault(developer.id(), 0));
            int loadPenalty = p1 ? 0 : Math.min(15, active * 5);
            score -= loadPenalty;
            reasons.add(p1 ? "відкриті завдання не враховано для P1" : "відкритих завдань: " + active);
            if (score >= 40) ranked.add(new Candidate(developer.id(), developer.name(), score, List.copyOf(reasons)));
        }
        return ranked.stream().sorted(Comparator.comparingInt(Candidate::score).reversed()
                        .thenComparing(Candidate::developerId, Comparator.nullsLast(String::compareTo)))
                .limit(3).toList();
    }
}
