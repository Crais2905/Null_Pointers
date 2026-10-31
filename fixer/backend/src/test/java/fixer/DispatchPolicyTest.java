package fixer;

import fixer.policy.DispatchPolicy;
import fixer.policy.DispatchPolicy.Decision;
import fixer.policy.DispatchPolicy.Outcome;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DispatchPolicyTest {
    @Test
    void appliesTriageBeforeOtherRules() {
        assertDecision(DispatchPolicy.decide(0, "PAYMENT_DUPLICATE", 0.99, true, true, true), Outcome.NEEDS_TRIAGE, "R1");
        assertDecision(DispatchPolicy.decide(2, "UNKNOWN", 0.99, false, true, true), Outcome.NEEDS_TRIAGE, "R1");
        assertDecision(DispatchPolicy.decide(2, "PAYMENT_DUPLICATE", 0.49, false, true, true), Outcome.NEEDS_TRIAGE, "R1");
    }

    @Test
    void followsPriorityAndConfidenceRules() {
        assertDecision(DispatchPolicy.decide(2, "PAYMENT_DUPLICATE", 0.90, true, true, true), Outcome.DEDUPLICATED, "R2");
        assertDecision(DispatchPolicy.decide(2, "PAYMENT_DUPLICATE", 0.90, false, false, true), Outcome.NEEDS_TRIAGE, "R3");
        assertDecision(DispatchPolicy.decide(2, "PAYMENT_DUPLICATE", 0.50, false, true, true), Outcome.PENDING_CONFIRM, "R4");
        assertDecision(DispatchPolicy.decide(2, "PAYMENT_DUPLICATE", 0.75, false, true, true), Outcome.AUTO_DISPATCHED, "R5");
        assertDecision(DispatchPolicy.decide(2, "PAYMENT_DUPLICATE", 0.75, false, true, false), Outcome.PENDING_CONFIRM, "R6");
    }

    private static void assertDecision(Decision actual, Outcome outcome, String rule) {
        assertEquals(outcome, actual.outcome());
        assertEquals(rule, actual.rule());
    }
}
