import { describe, expect, it } from "vitest";

import { sanitizeFileNameForDisplay } from "./attachmentFileName";

describe("sanitizeFileNameForDisplay", () => {
  it("leaves an ordinary filename unchanged", () => {
    expect(sanitizeFileNameForDisplay("quarterly-report.pdf")).toBe("quarterly-report.pdf");
  });

  it("strips a right-to-left override used to spoof a file extension", () => {
    // The bytes read "gpj" + RLO + "exe.jpg", which a naive renderer would
    // display as "gpjexe.jpg" reversed after the override — the real
    // spoofing technique this guards against.
    const spoofed = `gpj${String.fromCodePoint(0x202e)}exe.jpg`;
    expect(sanitizeFileNameForDisplay(spoofed)).toBe("gpjexe.jpg");
  });

  it("strips every bidi control code point in the stripped set", () => {
    const codePoints = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];
    const withControls = codePoints.map((codePoint) => String.fromCodePoint(codePoint)).join("");
    expect(sanitizeFileNameForDisplay(`a${withControls}b`)).toBe("ab");
  });
});
