import { describe, expect, it } from "vitest";

import { formatFileSize, validateAttachmentFile } from "./attachmentValidation";

const RESTRICTIONS = {
  acceptedTypes: ["application/pdf", "image/png"],
  maxFileSizeBytes: 1024 * 1024,
};

describe("validateAttachmentFile", () => {
  it("accepts a file within the type and size restrictions", () => {
    expect(validateAttachmentFile({ type: "application/pdf", size: 1024 }, RESTRICTIONS)).toEqual({
      valid: true,
    });
  });

  it("rejects an unaccepted MIME type", () => {
    expect(validateAttachmentFile({ type: "application/zip", size: 1024 }, RESTRICTIONS)).toEqual({
      valid: false,
      reason: "type",
    });
  });

  it("rejects a file over the maximum size", () => {
    expect(
      validateAttachmentFile({ type: "image/png", size: 2 * 1024 * 1024 }, RESTRICTIONS),
    ).toEqual({ valid: false, reason: "size" });
  });

  it("checks type before size, so an oversized wrong-type file reports its type", () => {
    expect(
      validateAttachmentFile({ type: "application/zip", size: 2 * 1024 * 1024 }, RESTRICTIONS),
    ).toEqual({ valid: false, reason: "type" });
  });

  it("accepts a file exactly at the size limit", () => {
    expect(
      validateAttachmentFile(
        { type: "image/png", size: RESTRICTIONS.maxFileSizeBytes },
        RESTRICTIONS,
      ),
    ).toEqual({ valid: true });
  });
});

describe("formatFileSize", () => {
  it("formats a sub-kilobyte size in bytes", () => {
    expect(formatFileSize(512, "en-US")).toBe("512 byte");
  });

  it("formats kilobytes with one fraction digit", () => {
    expect(formatFileSize(1536, "en-US")).toBe("1.5 kB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(5 * 1024 * 1024, "en-US")).toBe("5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(2 * 1024 ** 3, "en-US")).toBe("2 GB");
  });
});
