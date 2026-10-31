package fixer.dispatch;

public record DeliveryResult(Status status, String error) {
    public enum Status {IN_APP, WEBHOOK_OK, WEBHOOK_FAILED}
}
