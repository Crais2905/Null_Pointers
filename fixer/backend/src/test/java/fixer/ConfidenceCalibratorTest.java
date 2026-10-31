package fixer;

import fixer.evidence.ConfidenceCalibrator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ConfidenceCalibratorTest {
    @Test
    void capsSingleEvidenceAndUnknownModule() {
        var oneEvidence = ConfidenceCalibrator.calibrate(0.93, 1, "payments");
        assertEquals(0.93, oneEvidence.llmConfidence(), 1e-9);
        assertEquals(0.7, oneEvidence.finalConfidence(), 1e-9);
        assertFalse(oneEvidence.needsTriage());

        var noModule = ConfidenceCalibrator.calibrate(0.93, 4, null);
        assertEquals(0.5, noModule.finalConfidence(), 1e-9);
    }

    @Test
    void clampsConfidenceAndMarksZeroEvidenceForTriage() {
        var noEvidence = ConfidenceCalibrator.calibrate(1.5, 0, "payments");
        assertEquals(1.0, noEvidence.llmConfidence(), 1e-9);
        assertEquals(0.7, noEvidence.finalConfidence(), 1e-9);
        assertTrue(noEvidence.needsTriage());

        var invalid = ConfidenceCalibrator.calibrate(Double.NaN, 2, "payments");
        assertEquals(0.0, invalid.llmConfidence(), 1e-9);
        assertEquals(0.0, invalid.finalConfidence(), 1e-9);
    }
}
