package tech.buildwithpartha.lifeos.job.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.JobHandler;
import tech.buildwithpartha.lifeos.common.job.JobHandlerFor;

class JobHandlerRegistryTests {

  @JobHandlerFor(BackgroundJobKind.DATA_EXPORT)
  private static final class ValidHandler implements JobHandler {
    @Override
    public void execute(JobContext context) {}
  }

  private static final class UnannotatedHandler implements JobHandler {
    @Override
    public void execute(JobContext context) {}
  }

  @Test
  void handlerFor_returnsRegisteredHandler() {
    ValidHandler handler = new ValidHandler();
    JobHandlerRegistry registry = new JobHandlerRegistry(List.of(handler));

    assertThat(registry.handlerFor(BackgroundJobKind.DATA_EXPORT)).isSameAs(handler);
  }

  @Test
  void handlerFor_unregisteredKind_throwsIllegalStateException() {
    ValidHandler handler = new ValidHandler();
    JobHandlerRegistry registry = new JobHandlerRegistry(List.of(handler));

    assertThatThrownBy(() -> registry.handlerFor(BackgroundJobKind.ACCOUNT_DELETION))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("No JobHandler registered");
  }

  @Test
  void constructor_missingAnnotation_throwsIllegalStateException() {
    UnannotatedHandler handler = new UnannotatedHandler();
    assertThatThrownBy(() -> new JobHandlerRegistry(List.of(handler)))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("missing @JobHandlerFor");
  }
}
