package tech.buildwithpartha.lifeos.auth.application;

import java.util.List;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;

/**
 * Returns each given token once, in order, then repeats the last one for any further call — {@code
 * LoginService} calls {@link #generate()} twice per login (session token, then CSRF token), so a
 * single-token fixture would hand back the same value for both.
 */
final class FakeSecureTokenGenerator implements SecureTokenGenerator {

  private final List<RawToken> tokens;
  private int index;

  FakeSecureTokenGenerator(RawToken... tokens) {
    this.tokens = List.of(tokens);
  }

  @Override
  public RawToken generate() {
    RawToken token = tokens.get(Math.min(index, tokens.size() - 1));
    index++;
    return token;
  }

  @Override
  public String hash(String rawValue) {
    return tokens.stream()
        .filter(token -> token.value().equals(rawValue))
        .findFirst()
        .map(RawToken::hash)
        .orElse("sha256:other-" + rawValue);
  }
}
