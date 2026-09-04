package tech.buildwithpartha.lifeos.common.cache;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/** HandlerInterceptor that applies custom {@link CachePolicy} annotations to response headers. */
@Component
public class CachePolicyInterceptor implements HandlerInterceptor {

  @Override
  public boolean preHandle(
      HttpServletRequest request, HttpServletResponse response, Object handler) {
    if (handler instanceof HandlerMethod handlerMethod) {
      CachePolicy methodAnno = handlerMethod.getMethodAnnotation(CachePolicy.class);
      CachePolicy classAnno = handlerMethod.getBeanType().getAnnotation(CachePolicy.class);
      CachePolicy policy = methodAnno != null ? methodAnno : classAnno;

      if (policy != null) {
        String cacheDirective = policy.value();
        response.setHeader("Cache-Control", cacheDirective);

        if (cacheDirective.contains("no-store")) {
          response.setHeader("CDN-Cache-Control", "no-store");
          response.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
        } else if (cacheDirective.contains("private")) {
          response.setHeader("CDN-Cache-Control", "private");
          response.setHeader("Cloudflare-CDN-Cache-Control", "private");
        }
      }
    }
    return true;
  }
}
