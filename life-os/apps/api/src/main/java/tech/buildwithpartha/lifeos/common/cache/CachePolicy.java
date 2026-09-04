package tech.buildwithpartha.lifeos.common.cache;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation for controller classes or handler methods to declaratively specify custom HTTP
 * Cache-Control response directives.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface CachePolicy {

  /**
   * The Cache-Control directive header value (e.g. "private, max-age=60" or "no-store, private").
   */
  String value() default "no-store, private, no-cache, max-age=0, must-revalidate";
}
