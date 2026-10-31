package fixer.policy;

/** В'ячеслав. Правила R1-R6 (див. contracts/enums.md). Перша умова, що спрацювала, визначає рішення. */
public final class DispatchPolicy {
    private DispatchPolicy() {}

    public enum Outcome { NEEDS_TRIAGE, DEDUPLICATED, PENDING_CONFIRM, AUTO_DISPATCHED }
    public record Decision(Outcome outcome, String rule, String reason) {}

    /** Правила перевіряються у пріоритетному порядку R1 → R6. */
    public static Decision decide(int validEvidence, String category, double finalConfidence,
                                  boolean duplicateOfOpenTask, boolean hasCompetentCandidate, boolean autoDispatch) {
        String normalizedCategory = category == null ? "UNKNOWN" : category.trim().toUpperCase(java.util.Locale.ROOT);
        if (validEvidence <= 0 || "UNKNOWN".equals(normalizedCategory) || !Double.isFinite(finalConfidence) || finalConfidence < 0.5) {
            return new Decision(Outcome.NEEDS_TRIAGE, "R1", "Недостатньо підтверджених доказів або діагноз невідомий");
        }
        if (duplicateOfOpenTask) return new Decision(Outcome.DEDUPLICATED, "R2", "Знайдено відкрите завдання з таким fingerprint");
        if (!hasCompetentCandidate) return new Decision(Outcome.NEEDS_TRIAGE, "R3", "Не знайдено доступного компетентного виконавця");
        if (finalConfidence < 0.75) return new Decision(Outcome.PENDING_CONFIRM, "R4", "Потрібне підтвердження через невисоку впевненість");
        if (autoDispatch) return new Decision(Outcome.AUTO_DISPATCHED, "R5", "Впевненість достатня, автоматичне призначення увімкнено");
        return new Decision(Outcome.PENDING_CONFIRM, "R6", "Автоматичне призначення вимкнено");
    }
}
