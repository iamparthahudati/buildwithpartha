package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThatCode;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.JobHandler;

class AccountDeletionJobHandlerTests {

  @Test
  void execute_runsSuccessfully() {
    AccountDeletionJobHandler handler = new AccountDeletionJobHandler();
    JobHandler.JobContext context =
        new JobHandler.JobContext(
            UUID.randomUUID(),
            Optional.of(UUID.randomUUID()),
            BackgroundJobKind.ACCOUNT_DELETION,
            "{}",
            Instant.now());

    assertThatCode(() -> handler.execute(context)).doesNotThrowAnyException();
  }
}
