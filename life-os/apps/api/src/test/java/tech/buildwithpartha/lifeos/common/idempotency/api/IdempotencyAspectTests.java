package tech.buildwithpartha.lifeos.common.idempotency.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.util.UUID;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tech.buildwithpartha.lifeos.common.idempotency.application.IdempotencyService;
import tools.jackson.databind.ObjectMapper;

class IdempotencyAspectTests {

  private IdempotencyService idempotencyService;
  private ObjectMapper objectMapper;
  private IdempotencyAspect aspect;

  @BeforeEach
  void setUp() {
    idempotencyService = mock(IdempotencyService.class);
    objectMapper = new ObjectMapper();
    aspect = new IdempotencyAspect(idempotencyService, objectMapper);
  }

  @AfterEach
  void tearDown() {
    RequestContextHolder.resetRequestAttributes();
  }

  @Test
  @DisplayName("Proceeds without idempotency service when request attributes are null")
  void proceedsWhenNoRequestAttributes() throws Throwable {
    ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
    Idempotent idempotent = mock(Idempotent.class);
    when(pjp.proceed()).thenReturn("result");

    Object res = aspect.handleIdempotency(pjp, idempotent);

    assertThat(res).isEqualTo("result");
    verifyNoInteractions(idempotencyService);
  }

  @Test
  @DisplayName("Proceeds without idempotency service when Idempotency-Key header is missing")
  void proceedsWhenNoHeader() throws Throwable {
    MockHttpServletRequest request = new MockHttpServletRequest();
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
    Idempotent idempotent = mock(Idempotent.class);
    when(pjp.proceed()).thenReturn("result");

    Object res = aspect.handleIdempotency(pjp, idempotent);

    assertThat(res).isEqualTo("result");
    verifyNoInteractions(idempotencyService);
  }

  @Test
  @DisplayName("Proceeds without idempotency service when userId argument is missing")
  void proceedsWhenNoUserId() throws Throwable {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Idempotency-Key", "valid-key-123");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
    MethodSignature signature = mock(MethodSignature.class);
    Method method = TestController.class.getMethod("noUserIdMethod");

    when(pjp.getSignature()).thenReturn(signature);
    when(signature.getMethod()).thenReturn(method);
    when(pjp.getArgs()).thenReturn(new Object[] {});
    when(pjp.proceed()).thenReturn("result");

    Idempotent idempotent = mock(Idempotent.class);
    Object res = aspect.handleIdempotency(pjp, idempotent);

    assertThat(res).isEqualTo("result");
    verifyNoInteractions(idempotencyService);
  }

  @Test
  @DisplayName("Handles ResponseEntity return type serialization and deserialization")
  void handlesResponseEntityReturn() throws Throwable {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Idempotency-Key", "valid-key-123");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
    MethodSignature signature = mock(MethodSignature.class);
    Method method = TestController.class.getMethod("responseEntityMethod", UUID.class);

    when(pjp.getSignature()).thenReturn(signature);
    when(signature.getMethod()).thenReturn(method);
    when(pjp.getArgs()).thenReturn(new Object[] {UUID.randomUUID()});
    when(pjp.proceed())
        .thenReturn(ResponseEntity.status(HttpStatus.CREATED).body("created-payload"));

    when(idempotencyService.execute(any(), any(), any(), any()))
        .thenAnswer(
            invocation -> {
              var supplier = invocation.getArgument(3, java.util.function.Supplier.class);
              return supplier.get();
            });

    Idempotent idempotent = mock(Idempotent.class);
    when(idempotent.operation()).thenReturn("TEST_OP");

    Object res = aspect.handleIdempotency(pjp, idempotent);

    assertThat(res).isInstanceOf(ResponseEntity.class);
    ResponseEntity<?> responseEntity = (ResponseEntity<?>) res;
    assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(responseEntity.getBody()).isEqualTo("created-payload");
  }

  @Test
  @DisplayName("Handles DTO return type with @ResponseStatus annotation")
  void handlesDtoReturnWithResponseStatus() throws Throwable {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Idempotency-Key", "valid-key-123");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
    MethodSignature signature = mock(MethodSignature.class);
    Method method = TestController.class.getMethod("dtoMethod", UUID.class);

    when(pjp.getSignature()).thenReturn(signature);
    when(signature.getMethod()).thenReturn(method);
    when(signature.getReturnType()).thenReturn((Class) TestDto.class);
    when(pjp.getArgs()).thenReturn(new Object[] {UUID.randomUUID()});
    when(pjp.proceed()).thenReturn(new TestDto("hello"));

    when(idempotencyService.execute(any(), any(), any(), any()))
        .thenAnswer(
            invocation -> {
              var supplier = invocation.getArgument(3, java.util.function.Supplier.class);
              return supplier.get();
            });

    Idempotent idempotent = mock(Idempotent.class);
    when(idempotent.operation()).thenReturn("TEST_OP");

    Object res = aspect.handleIdempotency(pjp, idempotent);

    assertThat(res).isInstanceOf(TestDto.class);
    assertThat(((TestDto) res).name()).isEqualTo("hello");
  }

  @Test
  @DisplayName("Handles default OK status when method lacks @ResponseStatus")
  void handlesDefaultOkStatus() throws Throwable {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Idempotency-Key", "valid-key-123");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
    MethodSignature signature = mock(MethodSignature.class);
    Method method = TestController.class.getMethod("defaultStatusMethod", UUID.class);

    when(pjp.getSignature()).thenReturn(signature);
    when(signature.getMethod()).thenReturn(method);
    when(signature.getReturnType()).thenReturn((Class) TestDto.class);
    when(pjp.getArgs()).thenReturn(new Object[] {UUID.randomUUID()});
    when(pjp.proceed()).thenReturn(new TestDto("default"));

    when(idempotencyService.execute(any(), any(), any(), any()))
        .thenAnswer(
            invocation -> {
              var supplier = invocation.getArgument(3, java.util.function.Supplier.class);
              return supplier.get();
            });

    Idempotent idempotent = mock(Idempotent.class);
    when(idempotent.operation()).thenReturn("TEST_OP");

    Object res = aspect.handleIdempotency(pjp, idempotent);

    assertThat(res).isInstanceOf(TestDto.class);
  }

  @Test
  @DisplayName("Extracts userId parameter by argument position when type matches UUID")
  void extractsUserIdByArgumentMatch() throws Throwable {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Idempotency-Key", "valid-key-123");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
    MethodSignature signature = mock(MethodSignature.class);
    Method method = TestController.class.getMethod("unannotatedUserIdMethod", UUID.class);

    when(pjp.getSignature()).thenReturn(signature);
    when(signature.getMethod()).thenReturn(method);
    when(signature.getReturnType()).thenReturn((Class) TestDto.class);
    UUID uid = UUID.randomUUID();
    when(pjp.getArgs()).thenReturn(new Object[] {uid});
    when(pjp.proceed()).thenReturn(new TestDto("unannotated"));

    when(idempotencyService.execute(any(), any(), any(), any()))
        .thenAnswer(
            invocation -> {
              var supplier = invocation.getArgument(3, java.util.function.Supplier.class);
              return supplier.get();
            });

    Idempotent idempotent = mock(Idempotent.class);
    when(idempotent.operation()).thenReturn("TEST_OP");

    Object res = aspect.handleIdempotency(pjp, idempotent);

    assertThat(res).isInstanceOf(TestDto.class);
  }

  static class TestController {
    public void noUserIdMethod() {}

    public ResponseEntity<String> responseEntityMethod(@AuthenticationPrincipal UUID userId) {
      return null;
    }

    @ResponseStatus(HttpStatus.CREATED)
    public TestDto dtoMethod(@AuthenticationPrincipal UUID userId) {
      return null;
    }

    public TestDto defaultStatusMethod(@AuthenticationPrincipal UUID userId) {
      return null;
    }

    public TestDto unannotatedUserIdMethod(UUID userId) {
      return null;
    }
  }

  public record TestDto(String name) {}
}
