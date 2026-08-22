package tech.buildwithpartha.lifeos.auth.application;

import java.util.Set;
import tech.buildwithpartha.lifeos.auth.domain.CommonPasswordChecker;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/** A {@link CommonPasswordChecker} test double flagging an explicit set of raw values. */
final class FakeCommonPasswordChecker implements CommonPasswordChecker {

  private final Set<String> commonValues;

  FakeCommonPasswordChecker(Set<String> commonValues) {
    this.commonValues = commonValues;
  }

  @Override
  public boolean isCommon(RawPassword rawPassword) {
    return commonValues.contains(rawPassword.value());
  }
}
