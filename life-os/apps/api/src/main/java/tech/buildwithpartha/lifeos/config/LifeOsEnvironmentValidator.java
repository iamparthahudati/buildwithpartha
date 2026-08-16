package tech.buildwithpartha.lifeos.config;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

/** Validates process-level configuration before Spring creates service or persistence beans. */
public final class LifeOsEnvironmentValidator
    implements ApplicationContextInitializer<ConfigurableApplicationContext> {

  static final List<String> REQUIRED_KEYS =
      List.of(
          "SPRING_PROFILES_ACTIVE",
          "SERVER_PORT",
          "DATABASE_URL",
          "DATABASE_USERNAME",
          "DATABASE_PASSWORD",
          "FLYWAY_DATABASE_URL",
          "FLYWAY_DATABASE_USERNAME",
          "FLYWAY_DATABASE_PASSWORD",
          "APP_PUBLIC_URL",
          "APP_SESSION_COOKIE_SECURE",
          "APP_MAIL_FROM",
          "SMTP_HOST",
          "SMTP_PORT");

  @Override
  public void initialize(ConfigurableApplicationContext applicationContext) {
    validate(applicationContext.getEnvironment());
  }

  static void validate(Environment environment) {
    List<String> missingKeys = new ArrayList<>();
    List<String> invalidKeys = new ArrayList<>();

    for (String key : REQUIRED_KEYS) {
      String value = environment.getProperty(key);
      if (value == null || value.isBlank()) {
        missingKeys.add(key);
      } else if (!isValid(key, value.trim())) {
        invalidKeys.add(key);
      }
    }

    if (!missingKeys.isEmpty() || !invalidKeys.isEmpty()) {
      throw new IllegalStateException(errorMessage(missingKeys, invalidKeys));
    }
  }

  private static boolean isValid(String key, String value) {
    return switch (key) {
      case "SERVER_PORT", "SMTP_PORT" -> isPort(value);
      case "DATABASE_URL", "FLYWAY_DATABASE_URL" -> value.startsWith("jdbc:postgresql://");
      case "APP_PUBLIC_URL" -> isPublicHttpUrl(value);
      case "APP_SESSION_COOKIE_SECURE" ->
          value.equalsIgnoreCase("true") || value.equalsIgnoreCase("false");
      case "APP_MAIL_FROM" -> value.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
      default -> true;
    };
  }

  private static boolean isPort(String value) {
    try {
      int port = Integer.parseInt(value);
      return port >= 1 && port <= 65_535;
    } catch (NumberFormatException exception) {
      return false;
    }
  }

  private static boolean isPublicHttpUrl(String value) {
    try {
      URI uri = URI.create(value);
      boolean supportedScheme = "http".equals(uri.getScheme()) || "https".equals(uri.getScheme());
      return supportedScheme
          && uri.getHost() != null
          && uri.getUserInfo() == null
          && uri.getQuery() == null
          && uri.getFragment() == null;
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }

  private static String errorMessage(List<String> missingKeys, List<String> invalidKeys) {
    List<String> problems = new ArrayList<>();
    if (!missingKeys.isEmpty()) {
      problems.add("missing keys: " + String.join(", ", missingKeys));
    }
    if (!invalidKeys.isEmpty()) {
      problems.add("invalid keys: " + String.join(", ", invalidKeys));
    }
    return "LifeOS backend environment validation failed; " + String.join("; ", problems);
  }
}
