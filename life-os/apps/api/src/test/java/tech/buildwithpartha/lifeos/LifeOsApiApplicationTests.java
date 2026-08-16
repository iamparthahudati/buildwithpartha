package tech.buildwithpartha.lifeos;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentProperties;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class LifeOsApiApplicationTests {

  private final LifeOsEnvironmentProperties environmentProperties;

  @Autowired
  LifeOsApiApplicationTests(LifeOsEnvironmentProperties environmentProperties) {
    this.environmentProperties = environmentProperties;
  }

  @Test
  void startsWithoutExternalSecretsOrServices() {
    assertThat(environmentProperties.publicUrl().getHost()).isEqualTo("lifeos.example.test");
  }
}
