package tech.buildwithpartha.lifeos.habit.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitDomainFixture;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriod;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaHabitRepositoryTests {

  @Autowired private HabitJpaRepository habitJpaRepository;
  @Autowired private HabitEntryJpaRepository habitEntryJpaRepository;
  @Autowired private HabitPausePeriodJpaRepository habitPausePeriodJpaRepository;

  @Test
  @DisplayName("Saved Habit round-trips and honors user/archived finders")
  void roundTripsHabit() {
    JpaHabitRepository repository = new JpaHabitRepository(habitJpaRepository);
    Habit habit = HabitDomainFixture.sampleDailyHabit();

    Habit saved = repository.save(habit);
    assertThat(saved.id()).isEqualTo(habit.id());
    assertThat(saved.timeZone()).isEqualTo("America/New_York");
    assertThat(saved.reminderTime()).isEqualTo(habit.reminderTime());

    assertThat(repository.findById(habit.id())).isPresent();
    assertThat(repository.findByIdAndUserId(habit.id(), habit.userId())).isPresent();
    assertThat(repository.findByIdAndUserId(habit.id(), HabitDomainFixture.OTHER_USER_ID))
        .isEmpty();

    assertThat(repository.findByUserId(habit.userId())).hasSize(1);
    assertThat(repository.findByUserIdAndArchived(habit.userId(), false)).hasSize(1);
    assertThat(repository.findByUserIdAndArchived(habit.userId(), true)).isEmpty();

    repository.delete(habit);
    assertThat(repository.findById(habit.id())).isEmpty();
  }

  @Test
  @DisplayName("Saved HabitEntry round-trips and is found by habit + local date")
  void roundTripsHabitEntry() {
    JpaHabitRepository habitRepository = new JpaHabitRepository(habitJpaRepository);
    JpaHabitEntryRepository entryRepository = new JpaHabitEntryRepository(habitEntryJpaRepository);

    Habit habit = habitRepository.save(HabitDomainFixture.sampleDailyHabit());
    HabitEntry entry = HabitDomainFixture.sampleEntry(habit.id());

    HabitEntry saved = entryRepository.save(entry);
    assertThat(saved.completedCount()).isEqualTo(3);

    Optional<HabitEntry> byDate =
        entryRepository.findByHabitIdAndLocalDate(habit.id(), LocalDate.of(2026, 2, 1));
    assertThat(byDate).isPresent();

    List<HabitEntry> inRange =
        entryRepository.findByHabitIdAndLocalDateBetween(
            habit.id(), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 28));
    assertThat(inRange).hasSize(1);

    List<HabitEntry> outOfRange =
        entryRepository.findByHabitIdAndLocalDateBetween(
            habit.id(), LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 31));
    assertThat(outOfRange).isEmpty();
    assertThat(entryRepository.findByHabitIds(Set.of(habit.id()))).containsExactly(saved);
    assertThat(entryRepository.findByHabitIds(Set.of())).isEmpty();

    entryRepository.delete(entry);
    assertThat(entryRepository.findById(entry.id())).isEmpty();
  }

  @Test
  @DisplayName("Saved HabitPausePeriod round-trips and is found by habit")
  void roundTripsHabitPausePeriod() {
    JpaHabitRepository habitRepository = new JpaHabitRepository(habitJpaRepository);
    JpaHabitPausePeriodRepository pauseRepository =
        new JpaHabitPausePeriodRepository(habitPausePeriodJpaRepository);

    Habit habit = habitRepository.save(HabitDomainFixture.sampleDailyHabit());
    HabitPausePeriod pause = HabitDomainFixture.samplePausePeriod(habit.id());

    HabitPausePeriod saved = pauseRepository.save(pause);
    assertThat(saved.reason()).contains("Vacation");
    assertThat(saved.endDate()).contains(LocalDate.of(2026, 3, 10));

    assertThat(pauseRepository.findByHabitId(habit.id())).hasSize(1);
    assertThat(pauseRepository.findByHabitIds(Set.of(habit.id()))).containsExactly(saved);
    assertThat(pauseRepository.findByHabitIds(Set.of())).isEmpty();
    assertThat(pauseRepository.findById(pause.id())).isPresent();

    pauseRepository.delete(pause);
    assertThat(pauseRepository.findById(pause.id())).isEmpty();
  }
}
