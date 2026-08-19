package tech.buildwithpartha.lifeos.common.error;

/**
 * Thrown when an authenticated request refers to a resource that does not exist. Maps to HTTP 404
 * with {@link StandardErrorCodes#RESOURCE_NOT_FOUND}.
 */
public final class ResourceNotFoundException extends CodedException {

  public ResourceNotFoundException(String message) {
    super(StandardErrorCodes.RESOURCE_NOT_FOUND, message);
  }
}
