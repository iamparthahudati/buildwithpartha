package tech.buildwithpartha.lifeos.common.cache;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;

class CachePolicyInterceptorTests {

  private final CachePolicyInterceptor interceptor = new CachePolicyInterceptor();

  @CachePolicy("no-store, private")
  static class ClassAnnotatedController {
    public void endpoint() {}
  }

  static class MethodAnnotatedController {
    @CachePolicy("private, max-age=120")
    public void endpoint() {}

    public void unannotatedEndpoint() {}
  }

  @Test
  @DisplayName("preHandle applies class-level @CachePolicy with no-store CDN directives")
  void appliesClassLevelNoStorePolicy() throws Exception {
    ClassAnnotatedController controller = new ClassAnnotatedController();
    Method method = ClassAnnotatedController.class.getMethod("endpoint");
    HandlerMethod handlerMethod = new HandlerMethod(controller, method);

    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/test");
    MockHttpServletResponse response = new MockHttpServletResponse();

    boolean result = interceptor.preHandle(request, response, handlerMethod);

    assertThat(result).isTrue();
    assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store, private");
    assertThat(response.getHeader("CDN-Cache-Control")).isEqualTo("no-store");
    assertThat(response.getHeader("Cloudflare-CDN-Cache-Control")).isEqualTo("no-store");
  }

  @Test
  @DisplayName("preHandle applies method-level @CachePolicy with private CDN directives")
  void appliesMethodLevelPrivatePolicy() throws Exception {
    MethodAnnotatedController controller = new MethodAnnotatedController();
    Method method = MethodAnnotatedController.class.getMethod("endpoint");
    HandlerMethod handlerMethod = new HandlerMethod(controller, method);

    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/test");
    MockHttpServletResponse response = new MockHttpServletResponse();

    boolean result = interceptor.preHandle(request, response, handlerMethod);

    assertThat(result).isTrue();
    assertThat(response.getHeader("Cache-Control")).isEqualTo("private, max-age=120");
    assertThat(response.getHeader("CDN-Cache-Control")).isEqualTo("private");
    assertThat(response.getHeader("Cloudflare-CDN-Cache-Control")).isEqualTo("private");
  }

  @Test
  @DisplayName("preHandle ignores unannotated handler methods")
  void ignoresUnannotatedHandlerMethods() throws Exception {
    MethodAnnotatedController controller = new MethodAnnotatedController();
    Method method = MethodAnnotatedController.class.getMethod("unannotatedEndpoint");
    HandlerMethod handlerMethod = new HandlerMethod(controller, method);

    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/test");
    MockHttpServletResponse response = new MockHttpServletResponse();

    boolean result = interceptor.preHandle(request, response, handlerMethod);

    assertThat(result).isTrue();
    assertThat(response.getHeader("Cache-Control")).isNull();
  }

  @Test
  @DisplayName("preHandle ignores non-HandlerMethod objects")
  void ignoresNonHandlerMethodObjects() {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/test");
    MockHttpServletResponse response = new MockHttpServletResponse();

    boolean result = interceptor.preHandle(request, response, "nonHandlerObject");

    assertThat(result).isTrue();
    assertThat(response.getHeader("Cache-Control")).isNull();
  }
}
