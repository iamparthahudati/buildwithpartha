package tech.buildwithpartha.lifeos.label.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port for loading, persisting, and deleting Labels. */
public interface LabelRepository {

  Optional<Label> findById(UUID id);

  List<Label> findByUserId(UUID userId);

  Label save(Label label);

  void delete(Label label);
}
