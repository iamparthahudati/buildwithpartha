package tech.buildwithpartha.lifeos.testsupport;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.testcontainers.utility.DockerImageName;

class PostgreSqlTestContainerFactoryTests {

  @Test
  void definesAPinnedIsolatedPostgresContainer() {
    DockerImageName image = DockerImageName.parse(PostgreSqlTestContainerFactory.IMAGE);

    assertThat(image.getUnversionedPart()).isEqualTo("postgres");
    assertThat(image.getVersionPart()).isEqualTo("18.4-alpine3.24");
    assertThat(PostgreSqlTestContainerFactory.DATABASE).isEqualTo("lifeos_test");
    assertThat(PostgreSqlTestContainerFactory.USERNAME).isEqualTo("lifeos_test");
  }
}
