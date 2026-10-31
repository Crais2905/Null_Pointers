package fixer.data.port;
/**
 * Микола implements; Славік consumes. See contracts/DECISIONS.md.
 */

import java.util.List;

public interface DeveloperDirectory {
    record Ownership(String id, String level) {
    }

    record Developer(String id, String name, String role, boolean available, String handle, List<String> skills,
                     List<Ownership> ownedModules) {
    }

    record Module(String id, String name, String description, List<String> keywords) {
    }

    List<Developer> developers();

    List<Module> modules();
}
