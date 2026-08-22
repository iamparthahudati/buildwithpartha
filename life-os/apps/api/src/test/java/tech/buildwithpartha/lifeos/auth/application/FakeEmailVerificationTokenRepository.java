package tech.buildwithpartha.lifeos.auth.application;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationToken;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationTokenRepository;

final class FakeEmailVerificationTokenRepository implements EmailVerificationTokenRepository {

  private final List<EmailVerificationToken> saved = new ArrayList<>();

  // Set by a test to make the next consume() call lose the race, as if another request already
  // won it.
  boolean forceNextConsumeToLoseTheRace;

  @Override
  public EmailVerificationToken save(EmailVerificationToken token) {
    saved.add(token);
    return token;
  }

  @Override
  public Optional<EmailVerificationToken> findByTokenHash(String tokenHash) {
    return saved.stream().filter(token -> token.tokenHash().equals(tokenHash)).findFirst();
  }

  @Override
  public boolean consume(UUID tokenId, Instant consumedAt) {
    if (forceNextConsumeToLoseTheRace) {
      forceNextConsumeToLoseTheRace = false;
      return false;
    }
    for (int i = 0; i < saved.size(); i++) {
      EmailVerificationToken token = saved.get(i);
      if (token.id().equals(tokenId)) {
        if (token.consumedAt().isPresent()) {
          return false;
        }
        saved.set(
            i,
            new EmailVerificationToken(
                token.id(),
                token.userId(),
                token.tokenHash(),
                token.expiresAt(),
                Optional.of(consumedAt),
                token.createdAt()));
        return true;
      }
    }
    return false;
  }

  List<EmailVerificationToken> all() {
    return List.copyOf(saved);
  }
}
