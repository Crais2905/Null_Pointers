package fixer.data.port;
/** Микола implements; Славік consumes. See contracts/DECISIONS.md. */
public interface SettingsStore {
 boolean autoDispatch();
 void setAutoDispatch(boolean enabled);
}
