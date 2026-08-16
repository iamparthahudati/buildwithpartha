package tech.buildwithpartha.lifeos.config;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.error.ApiProblem;
import tech.buildwithpartha.lifeos.common.error.ErrorCode;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;

/** Creates the only public Problem Details representation used by the API. */
@Component
public final class ApiProblemFactory {

  private static final String TYPE_ROOT = "https://buildwithpartha.tech/life-os/problems/v1/";

  public ApiProblem create(
      HttpServletRequest request, HttpStatus status, ErrorCode code, String title, String detail) {
    return create(request, status, code, title, detail, List.of());
  }

  public ApiProblem create(
      HttpServletRequest request,
      HttpStatus status,
      ErrorCode code,
      String title,
      String detail,
      List<FieldProblem> errors) {
    String codeValue = code.value();
    String typeSuffix = codeValue.toLowerCase(Locale.ROOT).replace('_', '-');
    return new ApiProblem(
        TYPE_ROOT + typeSuffix,
        title,
        status.value(),
        detail,
        request.getRequestURI(),
        codeValue,
        CorrelationIdFilter.correlationId(request),
        errors);
  }
}
