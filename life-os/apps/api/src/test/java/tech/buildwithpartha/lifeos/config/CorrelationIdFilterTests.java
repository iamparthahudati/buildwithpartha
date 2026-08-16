package tech.buildwithpartha.lifeos.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class CorrelationIdFilterTests {

  @Test
  void acceptsOnlySafeBoundedClientIdentifiers() {
    assertThat(CorrelationIdFilter.selectCorrelationId("client.request-123"))
        .isEqualTo("client.request-123");
    assertThat(CorrelationIdFilter.selectCorrelationId(" contains spaces "))
        .satisfies(CorrelationIdFilterTests::isUuid);
    assertThat(CorrelationIdFilter.selectCorrelationId("x".repeat(65)))
        .satisfies(CorrelationIdFilterTests::isUuid);
    assertThat(CorrelationIdFilter.selectCorrelationId(null))
        .satisfies(CorrelationIdFilterTests::isUuid);
  }

  @Test
  void readsRequestIdentifierAndFallsBackSafely() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setAttribute(CorrelationIdFilter.REQUEST_ATTRIBUTE, "request-correlation");
    assertThat(CorrelationIdFilter.correlationId(request)).isEqualTo("request-correlation");

    request.setAttribute(CorrelationIdFilter.REQUEST_ATTRIBUTE, 42);
    assertThat(CorrelationIdFilter.correlationId(request))
        .satisfies(CorrelationIdFilterTests::isUuid);
  }

  private static void isUuid(String value) {
    assertThat(UUID.fromString(value).toString()).isEqualTo(value);
  }
}
