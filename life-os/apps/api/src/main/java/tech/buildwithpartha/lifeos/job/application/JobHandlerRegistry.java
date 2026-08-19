package tech.buildwithpartha.lifeos.job.application;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.JobHandler;
import tech.buildwithpartha.lifeos.common.job.JobHandlerFor;

/**
 * Discovers all {@link JobHandler} beans and routes each {@link BackgroundJobKind} to its handler.
 * Spring injects the full list of handlers; each must be annotated with {@link JobHandlerFor} so
 * this registry can build the lookup map.
 *
 * <p>Fails fast at startup if a registered handler has no {@link JobHandlerFor} annotation, or if
 * two handlers claim the same kind.
 */
@Component
public class JobHandlerRegistry {

  private final Map<BackgroundJobKind, JobHandler> handlers;

  public JobHandlerRegistry(List<JobHandler> allHandlers) {
    this.handlers =
        allHandlers.stream()
            .collect(
                Collectors.toUnmodifiableMap(
                    handler -> {
                      JobHandlerFor annotation =
                          AnnotationUtils.findAnnotation(
                              handler.getClass(), JobHandlerFor.class);
                      if (annotation == null) {
                        throw new IllegalStateException(
                            "JobHandler " + handler.getClass().getName()
                                + " is missing @JobHandlerFor");
                      }
                      return annotation.value();
                    },
                    handler -> handler));
  }

  /**
   * Returns the handler for the given kind.
   *
   * @throws IllegalStateException if no handler is registered for {@code kind}
   */
  public JobHandler handlerFor(BackgroundJobKind kind) {
    JobHandler handler = handlers.get(kind);
    if (handler == null) {
      throw new IllegalStateException("No JobHandler registered for kind: " + kind);
    }
    return handler;
  }
}
