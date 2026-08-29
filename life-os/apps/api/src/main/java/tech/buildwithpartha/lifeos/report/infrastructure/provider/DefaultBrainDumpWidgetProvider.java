package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.braindump.BrainDumpCountProvider;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.BrainDumpData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.BrainDumpWidget;
import tech.buildwithpartha.lifeos.report.application.provider.BrainDumpWidgetProvider;

/** Provider for the Today brain dump widget, supplying the live unprocessed count (LOS-1204). */
@Component
public class DefaultBrainDumpWidgetProvider implements BrainDumpWidgetProvider {

  private final BrainDumpCountProvider brainDumpCountProvider;

  public DefaultBrainDumpWidgetProvider(BrainDumpCountProvider brainDumpCountProvider) {
    this.brainDumpCountProvider =
        Objects.requireNonNull(brainDumpCountProvider, "brainDumpCountProvider must not be null");
  }

  @Override
  public BrainDumpWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    int unprocessedCount = brainDumpCountProvider.getUnprocessedCount(userId);
    return BrainDumpWidget.success(new BrainDumpData(unprocessedCount));
  }
}
