package tech.buildwithpartha.lifeos.common.cache;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Test controller used for testing custom {@link CachePolicy} annotations in integration tests. */
@RestController
@RequestMapping("/test-cache")
public class TestCacheController {

  @CachePolicy("private, max-age=60")
  @GetMapping("/custom")
  public String customCacheEndpoint() {
    return "custom cache payload";
  }
}
