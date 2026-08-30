package tech.buildwithpartha.lifeos.braindump.domain;

import java.util.List;

public record BrainDumpItemQueryResult(List<BrainDumpItem> items, long totalItems) {}
