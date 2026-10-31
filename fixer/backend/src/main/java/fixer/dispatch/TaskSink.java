package fixer.dispatch;

/** Микола. Адаптери доставки: InAppSink (завжди), WebhookSink (якщо задано URL), MarkdownExporter. */
public interface TaskSink {
    /** Transport failure returns WEBHOOK_FAILED; missing task or transactional misuse raises an error. */
    String deliver(Long taskId);
}
