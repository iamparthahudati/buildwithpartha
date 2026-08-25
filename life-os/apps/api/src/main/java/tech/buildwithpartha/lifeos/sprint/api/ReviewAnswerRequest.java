package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewAnswerRequest(
    @NotBlank @Size(max = 100) String promptKey, @NotBlank String answerValue) {}
