package tech.buildwithpartha.lifeos.common.idempotency.application;

/** Container for an HTTP status code and response body payload for idempotency replay. */
public record IdempotencyExecutionResult(int statusCode, String responseBody) {

  public IdempotencyExecutionResult {
    if (statusCode < 100 || statusCode > 599) {
      throw new IllegalArgumentException("Invalid HTTP status code: " + statusCode);
    }
  }

  public static IdempotencyExecutionResult of(int statusCode, String responseBody) {
    return new IdempotencyExecutionResult(statusCode, responseBody);
  }
}
