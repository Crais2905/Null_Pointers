package fixer.routing;

/**
 * В'ячеслав. Чиста функція без Spring.
 * score = 50 (власник модуля) + 10 (primary) + 10 * збіг навичок (макс 30) - 5 * відкриті завдання (макс 15; для P1 не враховується).
 * Компетентний: score >= 40. Повертає топ-3 з причинами.
 */
public final class Router {
    private Router() {}
    // public static List<Candidate> rank(Diagnosis d, List<Developer> devs, Map<String,Integer> openTasks) { ... }
}
