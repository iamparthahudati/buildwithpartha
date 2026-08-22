package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.CommonPasswordChecker;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/**
 * Screens a candidate password against a bundled list of widely-known breached/default passwords
 * ({@code src/main/resources/auth/common-passwords.txt}), matched case-insensitively so that a
 * common word with the first letter capitalized is still flagged.
 *
 * <p>{@code 06-SECURITY.md} calls this out as "where feasible": a local list needs no network call
 * and so stays fast, deterministic, and safe to run in a test suite, unlike a live breach-database
 * lookup that would send password material off-box.
 */
@Component
class WordlistCommonPasswordChecker implements CommonPasswordChecker {

  private static final String RESOURCE_PATH = "auth/common-passwords.txt";

  private final Set<String> commonPasswords;

  WordlistCommonPasswordChecker() {
    this.commonPasswords = loadWordlist();
  }

  @Override
  public boolean isCommon(RawPassword rawPassword) {
    return commonPasswords.contains(rawPassword.value().toLowerCase(Locale.ROOT));
  }

  private static Set<String> loadWordlist() {
    Set<String> words = new HashSet<>();
    ClassPathResource resource = new ClassPathResource(RESOURCE_PATH);
    try (InputStream input = resource.getInputStream();
        BufferedReader reader =
            new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        String trimmed = line.strip();
        if (trimmed.isEmpty() || trimmed.startsWith("#")) {
          continue;
        }
        words.add(trimmed.toLowerCase(Locale.ROOT));
      }
    } catch (IOException e) {
      throw new UncheckedIOException("Unable to load " + RESOURCE_PATH, e);
    }
    return Set.copyOf(words);
  }
}
