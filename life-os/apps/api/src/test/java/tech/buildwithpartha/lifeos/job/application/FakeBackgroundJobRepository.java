package tech.buildwithpartha.lifeos.job.application;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJob;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobRepository;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobStatus;

/** In-memory fake for unit tests. */
final class FakeBackgroundJobRepository implements BackgroundJobRepository {

  private final List<BackgroundJob> store = new ArrayList<>();

  @Override
  public BackgroundJob save(BackgroundJob job) {
    store.removeIf(existing -> existing.id().equals(job.id()));
    store.add(job);
    return job;
  }

  @Override
  public Optional<BackgroundJob> findById(UUID id) {
    return store.stream().filter(j -> j.id().equals(id)).findFirst();
  }

  @Override
  public List<BackgroundJob> findDuePending(Instant now, int limit) {
    return store.stream()
        .filter(j -> j.status() == BackgroundJobStatus.PENDING && !j.nextAttemptAt().isAfter(now))
        .sorted((a, b) -> a.nextAttemptAt().compareTo(b.nextAttemptAt()))
        .limit(limit)
        .toList();
  }

  @Override
  public int deleteTerminalOlderThan(Instant cutoff) {
    long before = store.size();
    store.removeIf(j -> j.isTerminal() && j.updatedAt().isBefore(cutoff));
    return (int) (before - store.size());
  }

  List<BackgroundJob> all() {
    return List.copyOf(store);
  }
}
