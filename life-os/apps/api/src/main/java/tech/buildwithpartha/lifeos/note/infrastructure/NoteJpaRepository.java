package tech.buildwithpartha.lifeos.note.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface NoteJpaRepository extends JpaRepository<NoteEntity, UUID> {
  Optional<NoteEntity> findByIdAndUserId(UUID id, UUID userId);

  List<NoteEntity> findByUserId(UUID userId);
}
