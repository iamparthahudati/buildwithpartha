package tech.buildwithpartha.lifeos.common.audit;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;

class EventCommandSafetyTests {

  @Test
  void eventCommandsExposeNoFreeFormMetadataChannel() {
    assertThat(unsafeComponents(ProductActivityCommand.class)).isEmpty();
    assertThat(unsafeComponents(SecurityAuditCommand.class)).isEmpty();
  }

  private static java.util.List<RecordComponent> unsafeComponents(Class<?> commandType) {
    return Arrays.stream(commandType.getRecordComponents())
        .filter(
            component -> {
              Class<?> type = component.getType();
              return type == String.class
                  || type == byte[].class
                  || java.util.Collection.class.isAssignableFrom(type)
                  || java.util.Map.class.isAssignableFrom(type);
            })
        .toList();
  }
}
