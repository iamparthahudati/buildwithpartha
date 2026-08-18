package tech.buildwithpartha.lifeos.auth.application;

import java.util.ArrayList;
import java.util.List;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationToken;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationTokenRepository;

final class FakeEmailVerificationTokenRepository implements EmailVerificationTokenRepository {

  private final List<EmailVerificationToken> saved = new ArrayList<>();

  @Override
  public EmailVerificationToken save(EmailVerificationToken token) {
    saved.add(token);
    return token;
  }

  List<EmailVerificationToken> all() {
    return List.copyOf(saved);
  }
}
