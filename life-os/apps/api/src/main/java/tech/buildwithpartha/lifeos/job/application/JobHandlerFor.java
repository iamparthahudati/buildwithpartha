package tech.buildwithpartha.lifeos.job.application;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;

/**
 * Marks a {@link JobHandler} implementation with the {@link BackgroundJobKind} it handles.
 * Required for {@link JobHandlerRegistry} to auto-discover the handler at startup.
 *
 * <pre>{@code
 * @Component
 * @JobHandlerFor(BackgroundJobKind.DATA_EXPORT)
 * public class DataExportJobHandler implements JobHandler { ... }
 * }</pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface JobHandlerFor {
  BackgroundJobKind value();
}
