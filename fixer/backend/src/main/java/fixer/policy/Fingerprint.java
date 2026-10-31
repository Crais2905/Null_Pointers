package fixer.policy;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** В'ячеслав. fingerprint = sha1(signature), де signature приходить від Python (не від LLM). */
public final class Fingerprint {
    private Fingerprint() {}

    /** SHA-1 від UTF-8 signature без trim, lowercase чи іншої нормалізації. */
    public static String of(String signature) {
        if (signature == null || signature.isBlank()) return null;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-1").digest(signature.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-1 is required by the Java runtime", impossible);
        }
    }
}
