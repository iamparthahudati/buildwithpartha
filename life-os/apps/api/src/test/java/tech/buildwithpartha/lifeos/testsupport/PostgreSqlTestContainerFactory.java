package tech.buildwithpartha.lifeos.testsupport;

import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/** Creates isolated PostgreSQL containers with deterministic LifeOS test settings. */
public final class PostgreSqlTestContainerFactory {

  public static final String IMAGE = "postgres:18.4-alpine3.24";
  public static final String DATABASE = "lifeos_test";
  public static final String USERNAME = "lifeos_test";

  private PostgreSqlTestContainerFactory() {}

  public static PostgreSQLContainer create() {
    return new PostgreSQLContainer(DockerImageName.parse(IMAGE))
        .withDatabaseName(DATABASE)
        .withUsername(USERNAME)
        .withPassword("lifeos_test_only");
  }
}
