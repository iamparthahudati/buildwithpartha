import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { AttachmentUploader } from "./AttachmentUploader";

const RESTRICTIONS = {
  acceptedTypes: ["application/pdf", "image/png"],
  acceptedTypesLabel: "PDF or PNG",
  maxFileSizeBytes: 1024 * 1024,
  locale: "en-US",
};

function pdfFile(name: string, sizeBytes: number) {
  const file = new File([new Uint8Array(sizeBytes)], name, { type: "application/pdf" });
  return file;
}

describe("AttachmentUploader", () => {
  it("shows the restriction copy as a standing hint", () => {
    renderWithUser(<AttachmentUploader {...RESTRICTIONS} onFilesSelected={() => {}} />);
    expect(screen.getByText("Choose a PDF or PNG file up to 1 MB.")).toBeInTheDocument();
  });

  it("clicking the trigger opens the underlying file picker", async () => {
    const { user } = renderWithUser(
      <AttachmentUploader {...RESTRICTIONS} onFilesSelected={() => {}} />,
    );
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    await user.click(screen.getByRole("button", { name: "Add attachment" }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("hands a valid selected file to onFilesSelected", async () => {
    const onFilesSelected = vi.fn();
    renderWithUser(<AttachmentUploader {...RESTRICTIONS} onFilesSelected={onFilesSelected} />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = pdfFile("report.pdf", 2048);

    await userEvent.upload(input, file);

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("rejects a file over the size limit without calling onFilesSelected", async () => {
    const onFilesSelected = vi.fn();
    renderWithUser(<AttachmentUploader {...RESTRICTIONS} onFilesSelected={onFilesSelected} />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const tooLarge = pdfFile("scan.pdf", 2 * 1024 * 1024);

    await userEvent.upload(input, tooLarge);

    expect(onFilesSelected).not.toHaveBeenCalled();
    const message = screen.getByText("Choose a PDF or PNG file up to 1 MB.");
    expect(message.closest('[role="alert"]')).toBeInTheDocument();
  });

  it("accepts only the valid files from a mixed multi-file selection", async () => {
    const onFilesSelected = vi.fn();
    renderWithUser(
      <AttachmentUploader {...RESTRICTIONS} multiple onFilesSelected={onFilesSelected} />,
    );
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const good = pdfFile("good.pdf", 1024);
    const bad = new File(["x"], "bad.zip", { type: "application/zip" });

    await userEvent.upload(input, [good, bad]);

    expect(onFilesSelected).toHaveBeenCalledWith([good]);
  });

  it("does nothing when the picker's change event carries no files (dialog cancelled)", async () => {
    const onFilesSelected = vi.fn();
    renderWithUser(<AttachmentUploader {...RESTRICTIONS} onFilesSelected={onFilesSelected} />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    // userEvent.upload requires at least one file, so this fires the native
    // event directly the way a cancelled OS file dialog would.
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it("disables the trigger when disabled", () => {
    renderWithUser(<AttachmentUploader {...RESTRICTIONS} disabled onFilesSelected={() => {}} />);
    expect(screen.getByRole("button", { name: "Add attachment" })).toBeDisabled();
  });

  it("renders the tone guide's exact copy and no picker when the feature is off", () => {
    renderWithUser(
      <AttachmentUploader {...RESTRICTIONS} enabled={false} onFilesSelected={() => {}} />,
    );
    expect(screen.getByText("Attachments aren’t enabled for LifeOS yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.querySelector("input[type='file']")).not.toBeInTheDocument();
  });

  it("has no axe violations, enabled and disabled by feature flag", async () => {
    const { container, rerender } = renderWithUser(
      <AttachmentUploader {...RESTRICTIONS} onFilesSelected={() => {}} />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<AttachmentUploader {...RESTRICTIONS} enabled={false} onFilesSelected={() => {}} />);
    await expectNoAccessibilityViolations(container);
  });
});
