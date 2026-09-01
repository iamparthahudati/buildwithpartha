package tech.buildwithpartha.lifeos.attachment.api;

import java.util.List;

/** API response envelope listing entity attachments (ADR-015). */
public record AttachmentListResponse(List<AttachmentResponse> items) {}
