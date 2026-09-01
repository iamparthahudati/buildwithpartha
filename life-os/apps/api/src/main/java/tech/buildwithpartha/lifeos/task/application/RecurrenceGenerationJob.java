package tech.buildwithpartha.lifeos.task.application;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeries;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeriesRepository;

/**
 * Scheduled background job that periodically generates due occurrences for active recurring task
 * series.
 */
@Component
public class RecurrenceGenerationJob {

  private static final Logger log = LoggerFactory.getLogger(RecurrenceGenerationJob.class);

  private final RecurringTaskSeriesRepository seriesRepository;
  private final RecurrenceGenerationService generationService;

  public RecurrenceGenerationJob(
      RecurringTaskSeriesRepository seriesRepository,
      RecurrenceGenerationService generationService) {
    this.seriesRepository = seriesRepository;
    this.generationService = generationService;
  }

  @Scheduled(cron = "${lifeos.recurrence.cron:0 0 * * * *}")
  public void runRecurrenceGeneration() {
    log.info("Starting scheduled recurrence generation job");
    int totalGenerated = 0;

    List<RecurringTaskSeries> seriesList =
        seriesRepository.findByUserId(null); // Or active series lookup
    for (RecurringTaskSeries series : seriesList) {
      if (series.archivedAt().isPresent() || series.deletedAt().isPresent()) {
        continue;
      }
      try {
        ZoneId zoneId = ZoneId.of(series.timeZone());
        LocalDate horizon = LocalDate.now(zoneId).plusDays(7);
        totalGenerated += generationService.generateOccurrencesForSeries(series, horizon);
      } catch (Exception e) {
        log.error("Failed to generate occurrences for recurring series {}", series.id(), e);
      }
    }

    log.info(
        "Completed scheduled recurrence generation job, generated {} task occurrences",
        totalGenerated);
  }
}
