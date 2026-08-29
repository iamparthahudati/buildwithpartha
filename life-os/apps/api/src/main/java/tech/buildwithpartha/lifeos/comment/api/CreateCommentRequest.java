package tech.buildwithpartha.lifeos.comment.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import tech.buildwithpartha.lifeos.comment.domain.CommentBodyPolicy;
import tech.buildwithpartha.lifeos.comment.domain.CommentFormat;

/** Request to add a personal Comment. */
public record CreateCommentRequest(
    @NotBlank @Size(max = CommentBodyPolicy.MAX_INPUT_LENGTH) @Schema(
            maxLength = CommentBodyPolicy.MAX_INPUT_LENGTH,
            requiredMode = Schema.RequiredMode.REQUIRED)
        String body,
    @Schema(defaultValue = "PLAIN_TEXT") CommentFormat format) {}
