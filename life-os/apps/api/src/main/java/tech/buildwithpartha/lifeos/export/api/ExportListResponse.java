package tech.buildwithpartha.lifeos.export.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * List of export files requested by the authenticated account.
 */
@Schema(description = "List of user data export requests and files.")
public record ExportListResponse(
    @Schema(description = "List of export items ordered newest first.")
        List<ExportItemResponse> exports) {}
