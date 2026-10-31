package fixer.dispatch;

/** Микола. Адаптери доставки: InAppSink (завжди), WebhookSink (якщо задано URL), MarkdownExporter. */
public interface TaskSink {
    /** Не кидає виняток назовні: помилку повертає як статус доставки. */
    String deliver(Long taskId);
}
