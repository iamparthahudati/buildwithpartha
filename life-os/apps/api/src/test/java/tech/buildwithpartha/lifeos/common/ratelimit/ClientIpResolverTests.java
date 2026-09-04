package tech.buildwithpartha.lifeos.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpResolverTests {

  @Test
  void returnsRemoteAddrWhenNoProxy() {
    ClientIpResolver resolver = new ClientIpResolver(Set.of("127.0.0.1", "10.0.0.1"));
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRemoteAddr("192.168.1.50");

    String clientIp = resolver.resolveClientIp(request);
    assertThat(clientIp).isEqualTo("192.168.1.50");
  }

  @Test
  void extractsClientIpFromXForwardedForWhenTrustedProxy() {
    ClientIpResolver resolver = new ClientIpResolver(Set.of("127.0.0.1", "10.0.0.1"));
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRemoteAddr("10.0.0.1");
    request.addHeader("X-Forwarded-For", "203.0.113.195, 10.0.0.1");

    String clientIp = resolver.resolveClientIp(request);
    assertThat(clientIp).isEqualTo("203.0.113.195");
  }

  @Test
  void extractsRightmostUntrustedIpInProxyChain() {
    ClientIpResolver resolver = new ClientIpResolver(Set.of("10.0.0.1", "10.0.0.2"));

    String clientIp =
        resolver.resolveClientIp("10.0.0.1", "198.51.100.42, 203.0.113.195, 10.0.0.2");
    assertThat(clientIp).isEqualTo("203.0.113.195");
  }

  @Test
  void returnsLeftmostIpWhenAllHopsAreTrusted() {
    ClientIpResolver resolver = new ClientIpResolver(Set.of("10.0.0.1", "10.0.0.2", "10.0.0.3"));

    String clientIp = resolver.resolveClientIp("10.0.0.1", "10.0.0.3, 10.0.0.2");
    assertThat(clientIp).isEqualTo("10.0.0.3");
  }

  @Test
  void fallsBackToRemoteAddrWhenHeaderMissingOrBlank() {
    ClientIpResolver resolver = new ClientIpResolver(Set.of("127.0.0.1"));

    assertThat(resolver.resolveClientIp("127.0.0.1", null)).isEqualTo("127.0.0.1");
    assertThat(resolver.resolveClientIp("127.0.0.1", "   ")).isEqualTo("127.0.0.1");
  }
}
