package tech.buildwithpartha.lifeos.common.error;

import java.util.Objects;

/** Safe field-level validation metadata without rejected values. */
public record FieldProblem(String field, String code) {

  public FieldProblem {
    Objects.requireNonNull(field, "field must not be null");
    Objects.requireNonNull(code, "code must not be null");
  }
}
