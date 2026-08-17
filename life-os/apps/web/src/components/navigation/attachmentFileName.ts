/**
 * A crafted filename can embed a Unicode bidi override character to visually
 * reverse part of its own name — the RLO ("right-to-left override", code
 * point 0x202E) trick documented in real malware campaigns, where bytes
 * that read `gpj.exe` are displayed as `exe.jpg` because the override flips
 * everything after it. Stripping these before display (never before
 * storage/upload — this only changes what is shown) is what keeps a
 * blocked or ready attachment's visible extension trustworthy. Built from
 * numeric code points rather than a regex literal, so the source file itself
 * never has to carry an invisible bidi-override character to match one.
 */
const BIDI_CONTROL_CODE_POINTS = [
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069,
];

const BIDI_CONTROL_CHARACTERS = new RegExp(
  `[${BIDI_CONTROL_CODE_POINTS.map((codePoint) => String.fromCodePoint(codePoint)).join("")}]`,
  "g",
);

export function sanitizeFileNameForDisplay(fileName: string): string {
  return fileName.replace(BIDI_CONTROL_CHARACTERS, "");
}
