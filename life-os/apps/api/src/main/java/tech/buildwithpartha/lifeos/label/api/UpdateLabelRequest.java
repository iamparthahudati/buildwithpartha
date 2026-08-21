package tech.buildwithpartha.lifeos.label.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateLabelRequest(
    @NotBlank(message = "Label name must not be blank")
        @Size(max = 50, message = "Label name must not exceed 50 characters")
        String name,
    @Size(max = 9, message = "Color format invalid") String color,
    @NotNull(message = "Version is required") Long version) {}
