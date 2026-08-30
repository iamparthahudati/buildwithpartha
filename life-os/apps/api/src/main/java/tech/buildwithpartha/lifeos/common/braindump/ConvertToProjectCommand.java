package tech.buildwithpartha.lifeos.common.braindump;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public record ConvertToProjectCommand(
    String name,
    Optional<String> description,
    Optional<LocalDate> startDate,
    Optional<LocalDate> deadlineDate,
    String priority,
    Optional<String> color,
    Optional<String> icon,
    Set<UUID> labelIds) {}
