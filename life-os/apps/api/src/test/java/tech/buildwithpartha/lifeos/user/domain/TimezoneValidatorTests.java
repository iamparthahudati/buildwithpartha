package tech.buildwithpartha.lifeos.user.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class TimezoneValidatorTests {

  @ParameterizedTest
  @ValueSource(
      strings = {
        "UTC",
        "Asia/Kolkata",
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
        "Australia/Sydney",
        "Pacific/Auckland",
        "Africa/Cairo"
      })
  void acceptsValidIanaTimezonesAndUtc(String timezone) {
    assertThat(TimezoneValidator.isValidIanaTimeZone(timezone)).isTrue();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "",
        "   ",
        "Invalid/Timezone",
        "America/NonExistentCity",
        "GMT+5",
        "EST",
        "PST",
        "NotATimezone"
      })
  void rejectsInvalidOrUnrecognizedTimezones(String timezone) {
    assertThat(TimezoneValidator.isValidIanaTimeZone(timezone)).isFalse();
  }

  @Test
  void rejectsNullTimezone() {
    assertThat(TimezoneValidator.isValidIanaTimeZone(null)).isFalse();
  }
}
