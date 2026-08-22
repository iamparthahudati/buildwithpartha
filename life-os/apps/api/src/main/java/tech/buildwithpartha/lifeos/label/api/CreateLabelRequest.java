package tech.buildwithpartha.lifeos.label.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLabelRequest(
    @NotBlank(message = "Name required") @Size(max = 50, message = "Max 50 chars") String name,
    @Size(max = 9, message = "Invalid color") String color) {}
