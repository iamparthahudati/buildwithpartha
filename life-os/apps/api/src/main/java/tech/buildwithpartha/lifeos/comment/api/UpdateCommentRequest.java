package tech.buildwithpartha.lifeos.comment.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import tech.buildwithpartha.lifeos.comment.domain.CommentBodyPolicy;
import tech.buildwithpartha.lifeos.comment.domain.CommentFormat;

/** Optimistic-concurrency request to edit a personal Comment. */
public record UpdateCommentRequest(
    @NotBlank @Size(max = CommentBodyPolicy.MAX_INPUT_LENGTH) @Schema(
            maxLength = CommentBodyPolicy.MAX_INPUT_LENGTH,
            requiredMode = Schema.RequiredMode.REQUIRED)
        String body,
    @NotNull @Schema(requiredMode = Schema.RequiredMode.REQUIRED) CommentFormat format,
    @NotNull @PositiveOrZero @Schema(format = "int64", requiredMode = Schema.RequiredMode.REQUIRED)
        Long version) {}
