package fixer.data;

/**
 * Микола: raw logs stay in Java; preserve line numbering.
 */
public interface LogStorage {
    String save(long incidentId, String rawLog);

    String read(long incidentId);

    void reset();
}
