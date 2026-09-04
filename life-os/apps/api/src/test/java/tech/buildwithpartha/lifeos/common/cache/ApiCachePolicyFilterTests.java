package tech.buildwithpartha.lifeos.common.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ApiCachePolicyFilterTests {

  private final ApiCachePolicyFilter filter = new ApiCachePolicyFilter();

  @Test
  @DisplayName(
      "ApiCachePolicyFilter sets default security and proxy-bypass headers for API requests")
  void filterSetsDefaultHeadersForApiRequests() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/life-os/api/v1/tasks");
    MockHttpServletResponse response = new MockHttpServletResponse();
    FilterChain chain = mock(FilterChain.class);

    filter.doFilterInternal(request, response, chain);

    assertThat(response.getHeader("Cache-Control"))
        .isEqualTo("private, no-cache, max-age=0, must-revalidate");
    assertThat(response.getHeader("Pragma")).isEqualTo("no-cache");
    assertThat(response.getHeader("Expires")).isEqualTo("0");
    assertThat(response.getHeader("Vary")).isEqualTo("Accept-Encoding, Cookie, Authorization");
    assertThat(response.getHeader("CDN-Cache-Control")).isEqualTo("no-store");
    assertThat(response.getHeader("Cloudflare-CDN-Cache-Control")).isEqualTo("no-store");
  }

  @Test
  @DisplayName("ApiCachePolicyFilter skips adding headers for non-API and static asset requests")
  void filterSkipsNonApiAndStaticAssetRequests() throws Exception {
    FilterChain chain = mock(FilterChain.class);

    String[] nonApiUris = {
      null,
      "",
      "   ",
      "/actuator/health",
      "/index.html",
      "/styles.css",
      "/app.js",
      "/logo.png",
      "/photo.jpg",
      "/favicon.ico",
      "/icon.svg",
      "/font.woff2"
    };

    for (String uri : nonApiUris) {
      MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
      MockHttpServletResponse response = new MockHttpServletResponse();

      filter.doFilterInternal(request, response, chain);

      assertThat(response.getHeader("Cache-Control")).isNull();
      assertThat(response.getHeader("CDN-Cache-Control")).isNull();
    }
  }

  @Test
  @DisplayName("ApiCachePolicyFilter respects pre-existing response headers")
  void filterRespectsPreExistingHeaders() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/tasks");
    MockHttpServletResponse response = new MockHttpServletResponse();
    response.setHeader("Cache-Control", "public, max-age=3600");
    response.setHeader("Pragma", "custom");
    response.setHeader("Expires", "1000");
    response.setHeader("Vary", "Accept");
    response.setHeader("CDN-Cache-Control", "public");
    response.setHeader("Cloudflare-CDN-Cache-Control", "public");

    FilterChain chain = mock(FilterChain.class);
    filter.doFilterInternal(request, response, chain);

    assertThat(response.getHeader("Cache-Control")).isEqualTo("public, max-age=3600");
    assertThat(response.getHeader("Pragma")).isEqualTo("custom");
    assertThat(response.getHeader("Expires")).isEqualTo("1000");
    assertThat(response.getHeader("Vary")).isEqualTo("Accept");
    assertThat(response.getHeader("CDN-Cache-Control")).isEqualTo("public");
    assertThat(response.getHeader("Cloudflare-CDN-Cache-Control")).isEqualTo("public");
  }
}
