package fixer.evidence;

/**
 * 0 валідних доказів -> NEEDS_TRIAGE; 1 -> cap 0.7; suspected_module_id == null -> cap 0.5.
 */
public final class ConfidenceCalibrator {
    private ConfidenceCalibrator() {
    }
}
