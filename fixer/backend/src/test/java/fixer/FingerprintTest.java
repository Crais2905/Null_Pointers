package fixer;

import fixer.policy.Fingerprint;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FingerprintTest {
    @Test
    void hashesTheExactUtf8SignatureAsLowercaseSha1() {
        assertEquals("a9993e364706816aba3e25717850c26c9cd0d89d", Fingerprint.of("abc"));
        assertEquals(Fingerprint.of("abc"), Fingerprint.of("abc"));
        assertNotEquals(Fingerprint.of("abc"), Fingerprint.of("ABC"));
        assertEquals(40, Fingerprint.of("signature").length());
        assertTrue(Fingerprint.of("signature").matches("[0-9a-f]{40}"));
    }

    @Test
    void doesNotFingerprintBlankOrMissingSignatures() {
        assertNull(Fingerprint.of(null));
        assertNull(Fingerprint.of(""));
        assertNull(Fingerprint.of("   "));
    }
}
