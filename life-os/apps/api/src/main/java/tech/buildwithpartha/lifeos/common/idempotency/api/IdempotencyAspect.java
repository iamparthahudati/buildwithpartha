package tech.buildwithpartha.lifeos.common.idempotency.api;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.UUID;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tech.buildwithpartha.lifeos.common.idempotency.application.IdempotencyExecutionResult;
import tech.buildwithpartha.lifeos.common.idempotency.application.IdempotencyService;
import tools.jackson.databind.ObjectMapper;

/**
 * AOP aspect intercepting methods annotated with {@link Idempotent} to handle HTTP Idempotency-Key
 * replay semantics transparently.
 */
@Aspect
@Component
public class IdempotencyAspect {

  public static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

  private final IdempotencyService idempotencyService;
  private final ObjectMapper objectMapper;

  public IdempotencyAspect(IdempotencyService idempotencyService, ObjectMapper objectMapper) {
    this.idempotencyService = idempotencyService;
    this.objectMapper = objectMapper;
  }

  @Around("@annotation(idempotent)")
  public Object handleIdempotency(ProceedingJoinPoint joinPoint, Idempotent idempotent)
      throws Throwable {
    ServletRequestAttributes attributes =
        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
    if (attributes == null) {
      return joinPoint.proceed();
    }

    HttpServletRequest request = attributes.getRequest();
    String idempotencyKeyHeader = request.getHeader(IDEMPOTENCY_KEY_HEADER);

    if (idempotencyKeyHeader == null || idempotencyKeyHeader.isBlank()) {
      return joinPoint.proceed();
    }

    UUID userId = extractUserId(joinPoint);
    if (userId == null) {
      return joinPoint.proceed();
    }

    MethodSignature signature = (MethodSignature) joinPoint.getSignature();
    Method method = signature.getMethod();
    Class<?> returnType = method.getReturnType();

    IdempotencyExecutionResult result =
        idempotencyService.execute(
            userId,
            idempotencyKeyHeader,
            idempotent.operation(),
            () -> executeAndSerialize(joinPoint, method, returnType));

    return deserializeResult(result, method, returnType);
  }

  private UUID extractUserId(ProceedingJoinPoint joinPoint) {
    MethodSignature signature = (MethodSignature) joinPoint.getSignature();
    Object[] args = joinPoint.getArgs();
    var parameters = signature.getMethod().getParameters();

    for (int i = 0; i < parameters.length; i++) {
      if (parameters[i].isAnnotationPresent(AuthenticationPrincipal.class)
          && args[i] instanceof UUID uuid) {
        return uuid;
      }
    }
    for (Object arg : args) {
      if (arg instanceof UUID uuid) {
        return uuid;
      }
    }
    return null;
  }

  private IdempotencyExecutionResult executeAndSerialize(
      ProceedingJoinPoint joinPoint, Method method, Class<?> returnType) {
    try {
      Object proceedResult = joinPoint.proceed();
      int statusCode = resolveStatusCode(method, proceedResult);
      String bodyJson = serializeBody(proceedResult);
      return IdempotencyExecutionResult.of(statusCode, bodyJson);
    } catch (RuntimeException ex) {
      throw ex;
    } catch (Throwable ex) {
      throw new IllegalStateException("Underlying operation threw checked exception", ex);
    }
  }

  private int resolveStatusCode(Method method, Object proceedResult) {
    if (proceedResult instanceof ResponseEntity<?> responseEntity) {
      return responseEntity.getStatusCode().value();
    }
    ResponseStatus responseStatus = AnnotationUtils.findAnnotation(method, ResponseStatus.class);
    if (responseStatus != null) {
      return responseStatus.value().value();
    }
    return HttpStatus.OK.value();
  }

  private String serializeBody(Object proceedResult) {
    if (proceedResult == null) {
      return null;
    }
    Object bodyToSerialize = proceedResult;
    if (proceedResult instanceof ResponseEntity<?> responseEntity) {
      bodyToSerialize = responseEntity.getBody();
    }
    if (bodyToSerialize == null) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(bodyToSerialize);
    } catch (Exception ex) {
      throw new IllegalStateException("Failed to serialize response body for idempotency", ex);
    }
  }

  private Object deserializeResult(
      IdempotencyExecutionResult result, Method method, Class<?> returnType) throws Exception {
    String json = result.responseBody();
    int status = result.statusCode();

    if (ResponseEntity.class.isAssignableFrom(returnType)) {
      Type genericReturnType = method.getGenericReturnType();
      Class<?> bodyClass = Object.class;
      if (genericReturnType instanceof ParameterizedType paramType) {
        Type[] args = paramType.getActualTypeArguments();
        if (args.length > 0 && args[0] instanceof Class<?> clazz) {
          bodyClass = clazz;
        }
      }
      Object bodyObj = null;
      if (json != null && !json.isBlank()) {
        bodyObj = objectMapper.readValue(json, bodyClass);
      }
      return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(bodyObj);
    }

    if (json == null || json.isBlank()) {
      return null;
    }
    return objectMapper.readValue(json, returnType);
  }
}
