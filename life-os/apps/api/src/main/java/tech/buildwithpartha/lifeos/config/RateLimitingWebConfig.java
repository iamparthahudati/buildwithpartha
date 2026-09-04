package tech.buildwithpartha.lifeos.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Spring Web MVC configuration registering rate-limiting interceptor. */
@Configuration
public class RateLimitingWebConfig implements WebMvcConfigurer {

  private final RateLimitingInterceptor rateLimitingInterceptor;

  public RateLimitingWebConfig(RateLimitingInterceptor rateLimitingInterceptor) {
    this.rateLimitingInterceptor = rateLimitingInterceptor;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(rateLimitingInterceptor);
  }
}
