package tech.buildwithpartha.lifeos.auth.application;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetToken;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetTokenRepository;

final class FakePasswordResetTokenRepository implements PasswordResetTokenRepository {

  private final List<PasswordResetToken> saved = new ArrayList<>();

  boolean forceNextConsumeToLoseTheRace;

  @Override
  public PasswordResetToken save(PasswordResetToken token) {
    saved.add(token);
    return token;
  }

  @Override
  public Optional<PasswordResetToken> findByTokenHash(String tokenHash) {
    return saved.stream().filter(token -> token.tokenHash().equals(tokenHash)).findFirst();
  }

  @Override
  public boolean consume(UUID tokenId, Instant consumedAt) {
    if (forceNextConsumeToLoseTheRace) {
      forceNextConsumeToLoseTheRace = false;
      return false;
    }
    for (int i = 0; i < saved.size(); i++) {
      PasswordResetToken token = saved.get(i);
      if (token.id().equals(tokenId)) {
        if (token.consumedAt().isPresent()) {
          return false;
        }
        saved.set(
            i,
            new PasswordResetToken(
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

  List<PasswordResetToken> all() {
    return List.copyOf(saved);
  }
}
