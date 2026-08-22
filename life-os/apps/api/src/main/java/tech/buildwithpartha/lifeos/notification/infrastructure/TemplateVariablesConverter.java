package tech.buildwithpartha.lifeos.notification.infrastructure;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Map;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Maps {@code outbox_messages.template_variables} to a plain {@code TEXT} column as JSON, avoiding
 * a dependency on a native Postgres {@code jsonb} Hibernate type. Uses its own {@link ObjectMapper}
 * rather than the application's configured bean: a {@code Map<String,String>} needs no custom
 * (de)serialization, and JPA converters are instantiated by Hibernate outside Spring's bean
 * container.
 */
@Converter
class TemplateVariablesConverter implements AttributeConverter<Map<String, String>, String> {

  private static final ObjectMapper MAPPER = new JsonMapper();
  private static final TypeReference<Map<String, String>> MAP_TYPE = new TypeReference<>() {};

  @Override
  public String convertToDatabaseColumn(Map<String, String> attribute) {
    return MAPPER.writeValueAsString(attribute == null ? Map.of() : attribute);
  }

  @Override
  public Map<String, String> convertToEntityAttribute(String dbData) {
    if (dbData == null || dbData.isBlank()) {
      return Map.of();
    }
    return MAPPER.readValue(dbData, MAP_TYPE);
  }
}
