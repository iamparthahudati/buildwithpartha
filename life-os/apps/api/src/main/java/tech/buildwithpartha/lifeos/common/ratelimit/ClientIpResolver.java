package tech.buildwithpartha.lifeos.common.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Proxy-aware client IP resolver. Resolves the caller's origin IP address from incoming request
 * socket information and {@code X-Forwarded-For} header when request is received from a trusted
 * proxy.
 */
@Component
public class ClientIpResolver {

  private static final Set<String> DEFAULT_TRUSTED = Set.of("127.0.0.1", "0:0:0:0:0:0:0:1", "::1");
  private final Set<String> trustedProxies;

  @Autowired
  public ClientIpResolver(
      @Value("${lifeos.security.trusted-proxies:127.0.0.1,::1}") String trustedProxiesConfig) {
    Set<String> configured =
        Arrays.stream(trustedProxiesConfig.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toSet());
    configured.addAll(DEFAULT_TRUSTED);
    this.trustedProxies = Set.copyOf(configured);
  }

  public ClientIpResolver(Set<String> trustedProxies) {
    this.trustedProxies = Set.copyOf(trustedProxies);
  }

  public String resolveClientIp(HttpServletRequest request) {
    String remoteAddr = request.getRemoteAddr();
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    return resolveClientIp(remoteAddr, xForwardedFor);
  }

  public String resolveClientIp(String remoteAddr, String xForwardedForHeader) {
    String safeRemoteAddr =
        (remoteAddr == null || remoteAddr.isBlank()) ? "127.0.0.1" : remoteAddr.trim();

    if (!isTrustedProxy(safeRemoteAddr)) {
      return safeRemoteAddr;
    }

    if (xForwardedForHeader == null || xForwardedForHeader.isBlank()) {
      return safeRemoteAddr;
    }

    List<String> hops =
        Arrays.stream(xForwardedForHeader.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();

    if (hops.isEmpty()) {
      return safeRemoteAddr;
    }

    // Traverse right-to-left to find first untrusted IP in proxy chain
    for (int i = hops.size() - 1; i >= 0; i--) {
      String hop = hops.get(i);
      if (!isTrustedProxy(hop)) {
        return hop;
      }
    }

    // All hops are trusted proxies; return the leftmost origin IP
    return hops.getFirst();
  }

  public boolean isTrustedProxy(String ipAddress) {
    if (ipAddress == null || ipAddress.isBlank()) {
      return false;
    }
    String trimmed = ipAddress.trim();
    return trustedProxies.contains(trimmed);
  }
}
