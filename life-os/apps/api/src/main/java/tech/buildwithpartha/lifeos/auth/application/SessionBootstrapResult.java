package tech.buildwithpartha.lifeos.auth.application;

import java.util.Objects;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.User;

public record SessionBootstrapResult(User user, RawToken csrfToken) {

  public SessionBootstrapResult {
    Objects.requireNonNull(user, "user must not be null");
    Objects.requireNonNull(csrfToken, "csrfToken must not be null");
  }
}
