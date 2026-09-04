package tech.buildwithpartha.lifeos.common.cache;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Spring Web MVC configuration for caching policies, Shallow ETag filtering, and headers. */
@Configuration
public class CacheConfiguration implements WebMvcConfigurer {

  private final CachePolicyInterceptor cachePolicyInterceptor;

  public CacheConfiguration(CachePolicyInterceptor cachePolicyInterceptor) {
    this.cachePolicyInterceptor = cachePolicyInterceptor;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(cachePolicyInterceptor);
  }

  /**
   * Defines ShallowEtagHeaderFilter bean for automatic GET response ETag calculation and 304
   * handling.
   */
  @Bean
  public ShallowEtagHeaderFilter shallowEtagHeaderFilter() {
    return new ShallowEtagHeaderFilter();
  }
}
