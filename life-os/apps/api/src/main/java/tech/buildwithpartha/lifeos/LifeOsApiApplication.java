package tech.buildwithpartha.lifeos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentValidator;

@SpringBootApplication
@ConfigurationPropertiesScan
public class LifeOsApiApplication {

  public static void main(String[] args) {
    SpringApplication application = new SpringApplication(LifeOsApiApplication.class);
    application.addInitializers(new LifeOsEnvironmentValidator());
    application.run(args);
  }
}
