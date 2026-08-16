package tech.buildwithpartha.lifeos;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class LifeOsApiApplicationTests {

  @Test
  void startsWithoutExternalSecretsOrServices() {}
}
