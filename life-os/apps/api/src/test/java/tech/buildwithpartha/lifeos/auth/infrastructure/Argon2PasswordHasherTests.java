package tech.buildwithpartha.lifeos.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

class Argon2PasswordHasherTests {

  private final Argon2PasswordHasher hasher = new Argon2PasswordHasher();

  @Test
  void hashesAsArgon2idAndVerifiesTheSamePassword() {
    RawPassword password = RawPassword.of("correct horse battery staple");

    String hash = hasher.hash(password);

    assertThat(hash).startsWith("$argon2id$");
    assertThat(hasher.matches(password, hash)).isTrue();
  }

  @Test
  void rejectsAWrongPassword() {
    RawPassword password = RawPassword.of("correct horse battery staple");
    String hash = hasher.hash(password);

    assertThat(hasher.matches(RawPassword.of("a different password"), hash)).isFalse();
  }

  @Test
  void saltsEachHashDifferentlyEvenForTheSamePassword() {
    RawPassword password = RawPassword.of("correct horse battery staple");

    String first = hasher.hash(password);
    String second = hasher.hash(password);

    assertThat(first).isNotEqualTo(second);
    assertThat(hasher.matches(password, first)).isTrue();
    assertThat(hasher.matches(password, second)).isTrue();
  }

  @Test
  void freshlyProducedHashesDoNotNeedRehashing() {
    String hash = hasher.hash(RawPassword.of("correct horse battery staple"));

    assertThat(hasher.needsRehash(hash)).isFalse();
  }

  @Test
  void flagsAHashProducedWithOlderParametersForRehash() {
    // Simulates a credential row written before this ticket's parameter review by hashing
    // with Spring Security's previous Argon2 default instead of the current one.
    Argon2PasswordEncoder legacyEncoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_2();
    RawPassword password = RawPassword.of("correct horse battery staple");
    String legacyHash = legacyEncoder.encode(password.value());

    assertThat(hasher.matches(password, legacyHash)).isTrue();
    assertThat(hasher.needsRehash(legacyHash)).isTrue();

    String rehashed = hasher.hash(password);

    assertThat(hasher.needsRehash(rehashed)).isFalse();
  }
}
