package tech.buildwithpartha.lifeos.common.idempotency.api;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Annotation for controller endpoints to enforce generic idempotency replay semantics. */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {

  /** Unique operation type identifier for user+operation key scoping. */
  String operation();
}
