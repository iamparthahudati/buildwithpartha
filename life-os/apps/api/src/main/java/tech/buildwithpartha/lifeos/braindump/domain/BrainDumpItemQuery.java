package tech.buildwithpartha.lifeos.braindump.domain;

import java.util.UUID;

public record BrainDumpItemQuery(
    UUID userId,
    String q,
    BrainDumpItemStatus status,
    Boolean archived,
    int page,
    int size,
    String sortBy,
    String sortDirection
) {}
