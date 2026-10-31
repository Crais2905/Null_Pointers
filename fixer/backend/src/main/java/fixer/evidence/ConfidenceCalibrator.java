package fixer.evidence;

/** 0 валідних доказів -> NEEDS_TRIAGE; 1 -> cap 0.7; невідомий модуль -> cap 0.5. */
public final class ConfidenceCalibrator {
    private ConfidenceCalibrator() {}

    public record Result(double llmConfidence, double finalConfidence, boolean needsTriage) {}

    public static Result calibrate(double llmConfidence, int validEvidence, String suspectedModuleId) {
        if (!Double.isFinite(llmConfidence)) llmConfidence = 0;
        double bounded = Math.max(0, Math.min(1, llmConfidence));
        double calibrated = bounded;
        if (validEvidence <= 1) calibrated = Math.min(calibrated, 0.7);
        if (suspectedModuleId == null || suspectedModuleId.isBlank()) calibrated = Math.min(calibrated, 0.5);
        return new Result(bounded, calibrated, validEvidence <= 0);
    }
}
