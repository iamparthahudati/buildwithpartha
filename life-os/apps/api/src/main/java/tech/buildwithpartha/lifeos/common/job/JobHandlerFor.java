package tech.buildwithpartha.lifeos.common.job;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares which {@link BackgroundJobKind} a {@link JobHandler} implementation handles.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface JobHandlerFor {

  BackgroundJobKind value();
}
