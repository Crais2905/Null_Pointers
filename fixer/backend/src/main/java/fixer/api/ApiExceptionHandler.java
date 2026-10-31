package fixer.api;

import fixer.data.DataException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class ApiExceptionHandler {
    public record ErrorResponse(String code, String message) {}

    @ExceptionHandler(DataException.class)
    public ResponseEntity<ErrorResponse> dataException(DataException error) {
        return ResponseEntity.status(error.status()).body(new ErrorResponse(error.code(), error.getMessage()));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestPartException.class})
    public ResponseEntity<ErrorResponse> badRequest(Exception error) {
        return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_INPUT", "Request body or required file is invalid"));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> fileTooLarge(MaxUploadSizeExceededException error) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ErrorResponse("LOG_TOO_LARGE", "Maximum upload is 10 MiB"));
    }
}
