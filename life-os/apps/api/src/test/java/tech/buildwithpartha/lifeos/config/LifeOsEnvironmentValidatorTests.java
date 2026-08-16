package tech.buildwithpartha.lifeos.config;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.mock.env.MockEnvironment;

class LifeOsEnvironmentValidatorTests {

  private static final Map<String, String> VALID_ENVIRONMENT =
      Map.ofEntries(
          Map.entry("SPRING_PROFILES_ACTIVE", "local"),
          Map.entry("SERVER_PORT", "8080"),
          Map.entry("DATABASE_URL", "jdbc:postgresql://localhost:55432/lifeos_local"),
          Map.entry("DATABASE_USERNAME", "lifeos_local_app"),
          Map.entry("DATABASE_PASSWORD", "database-secret"),
          Map.entry("FLYWAY_DATABASE_URL", "jdbc:postgresql://localhost:55432/lifeos_local"),
          Map.entry("FLYWAY_DATABASE_USERNAME", "lifeos_local_migrator"),
          Map.entry("FLYWAY_DATABASE_PASSWORD", "flyway-secret"),
          Map.entry("APP_PUBLIC_URL", "http://localhost:5173/life-os"),
          Map.entry("APP_SESSION_COOKIE_SECURE", "false"),
          Map.entry("APP_MAIL_FROM", "lifeos@example.test"),
          Map.entry("SMTP_HOST", "localhost"),
          Map.entry("SMTP_PORT", "1025"));

  @Test
  void acceptsCompleteEnvironmentDuringContextInitialization() {
    MockEnvironment environment = environmentWith(VALID_ENVIRONMENT);
    GenericApplicationContext applicationContext = new GenericApplicationContext();
    applicationContext.setEnvironment(environment);

    assertThatNoException()
        .isThrownBy(() -> new LifeOsEnvironmentValidator().initialize(applicationContext));
  }

  @Test
  void namesMissingAndBlankKeys() {
    Map<String, String> incompleteValues = new HashMap<>(VALID_ENVIRONMENT);
    incompleteValues.put("DATABASE_PASSWORD", " ");
    incompleteValues.remove("SMTP_HOST");
    MockEnvironment environment = environmentWith(incompleteValues);

    assertThatThrownBy(() -> LifeOsEnvironmentValidator.validate(environment))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("missing keys")
        .hasMessageContaining("DATABASE_PASSWORD")
        .hasMessageContaining("SMTP_HOST")
        .hasMessageNotContaining("database-secret");
  }

  @Test
  void namesInvalidKeysWithoutPrintingTheirValues() {
    MockEnvironment environment = environmentWith(VALID_ENVIRONMENT);
    environment.setProperty("SERVER_PORT", "not-a-port-secret");
    environment.setProperty("DATABASE_URL", "hidden-database-value");
    environment.setProperty("FLYWAY_DATABASE_URL", "hidden-flyway-value");
    environment.setProperty(
        "APP_PUBLIC_URL", "https://user:hidden@example.test/life-os?secret=yes");
    environment.setProperty("APP_SESSION_COOKIE_SECURE", "sometimes");
    environment.setProperty("APP_MAIL_FROM", "hidden-mail-value");
    environment.setProperty("SMTP_PORT", "70000");

    assertThatThrownBy(() -> LifeOsEnvironmentValidator.validate(environment))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining(
            "invalid keys: SERVER_PORT, DATABASE_URL, FLYWAY_DATABASE_URL, APP_PUBLIC_URL, "
                + "APP_SESSION_COOKIE_SECURE, APP_MAIL_FROM, SMTP_PORT")
        .hasMessageNotContaining("not-a-port-secret")
        .hasMessageNotContaining("hidden-database-value")
        .hasMessageNotContaining("hidden-flyway-value")
        .hasMessageNotContaining("hidden@example.test")
        .hasMessageNotContaining("sometimes")
        .hasMessageNotContaining("hidden-mail-value")
        .hasMessageNotContaining("70000");
  }

  @Test
  void rejectsMalformedUrlsAndOutOfRangePorts() {
    MockEnvironment environment = environmentWith(VALID_ENVIRONMENT);
    environment.setProperty("APP_PUBLIC_URL", "not a url");
    environment.setProperty("SERVER_PORT", "0");
    environment.setProperty("SMTP_PORT", "65536");

    assertThatThrownBy(() -> LifeOsEnvironmentValidator.validate(environment))
        .hasMessageContaining("SERVER_PORT")
        .hasMessageContaining("APP_PUBLIC_URL")
        .hasMessageContaining("SMTP_PORT");
  }

  private static MockEnvironment environmentWith(Map<String, String> values) {
    MockEnvironment environment = new MockEnvironment();
    values.forEach(environment::setProperty);
    return environment;
  }
}
