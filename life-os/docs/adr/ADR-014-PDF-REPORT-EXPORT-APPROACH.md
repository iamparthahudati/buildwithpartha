# ADR-014 — PDF report export approach

- Status: Accepted
- Date: 2026-08-29
- Owner: Partha
- Ticket(s): LOS-1112
- Supersedes: None
- Superseded by: None

## Context

LOS-1112 requires implementing PDF report export capability for LifeOS. A named analytics report contains metric summaries, complex charts (rendered with SVG/canvas in React), and tables. The system needs to export these reports as high-fidelity PDF documents that can be downloaded, printed, or saved locally by the user. We must decide whether to perform PDF generation on the server or on the client, keeping in mind the privacy posture defined in [ADR-012](./ADR-012-V1-PRIVACY-POSTURE.md) and the strict dependency-locking policy defined in [ADR-004](./ADR-004-Java-21-Spring-Boot.md) and [ADR-003](./ADR-003-React-TypeScript-Vite.md).

## Decision drivers

- **Privacy and Data Minimization**: Avoid storing or writing sensitive personal metrics/records to persistent disks or temporary storage on the server.
- **Rendering Fidelity**: SVG/canvas chart visualization (Recharts) must render cleanly, with correct typography and colors, in the PDF.
- **Operational Simplicity**: Minimize CPU/memory load and package dependencies on the server (avoiding the need for headless browsers or complex PDF rendering libraries inside the backend runtime).
- **Accessibility and Usability**: Generated reports must follow responsive layouts and remain accessible to assistive technologies.

## Options considered

### Option A — Server-Side PDF Generation
The API generates the PDF via a Java rendering library (e.g., OpenPDF, PDFBox, or Flying Saucer) or by spinning up a headless browser (e.g., Playwright/Puppeteer) on the server. 
- *Benefits*: Standard API-driven workflow. Similar to CSV export, it can return a short-lived token to redeem.
- *Costs/Risks*: Running a headless browser inside a small server Docker container is highly resource-intensive and raises security concerns. A pure Java PDF library cannot easily render the client-side React SVG charts. Storing PDFs on the server creates data leakage risks, necessitating encryption, short-lived download tokens, and cleanup background jobs (private expiry).

### Option B — Client-Side Print Layout and Print Engine (Chosen)
The client application implements a print-friendly CSS stylesheet (`@media print`) and exposes a print trigger (`window.print()`). This lets the browser's native print engine generate the PDF (e.g., "Save as PDF" or "Print to PDF").
- *Benefits*: Zero server overhead and zero backend dependency changes. Zero privacy risk on the server since no PDF files are ever generated, stored, or transmitted over the network (fully complying with [ADR-012](./ADR-012-V1-PRIVACY-POSTURE.md)). The browser's native print engine flawlessly renders SVGs, layouts, and system fonts.
- *Costs/Risks*: Layout styling must be carefully print-tested (hiding toolbars, handling page breaks, adjusting backgrounds) and tested across desktop and mobile devices.

## Decision

Use **Option B: Client-side print-friendly layout and native browser print trigger** as the PDF report export approach. 

We will:
1. Retain the print trigger calling `window.print()` in `ReportsScreen.tsx`.
2. Add a print-only header block displaying the report type, date range, timezone, and project/category filters so the printed PDF contains full metadata since selectors are hidden.
3. Apply advanced print CSS stylesheet rules (`@media print`) in `reports-screen.css` and individual component CSS to hide interactive controls, adjust colors, and use page-break rules (`break-inside: avoid`, `page-break-inside: avoid`) to prevent elements from breaking awkwardly across pages.

## Consequences

### Positive
- **No Private Data Storage**: Since PDF generation happens entirely in browser memory on the user's device, no files are written to the server. Private expiry and server-side leak risks are avoided.
- **Chart Fidelity**: SVG charts render correctly without needing complex server-side canvas rasterization.
- **Zero Server overhead**: CPU and memory limits on the server remain unaffected. No new backend dependencies or lockfile updates are required.

### Negative and risks
- We rely on the browser's PDF generator, so print layout behavior must be validated using print preview tools across target browsers.
- Any client-side print failures are handled by the browser's print sub-system. We display a clear, accessible UI.

## Security, privacy and data impact

By utilizing client-side print rendering, no user data leaves the client sandbox for PDF processing, and no PDF files are stored on server disk. This aligns with [ADR-012](./ADR-012-V1-PRIVACY-POSTURE.md) privacy defaults and requires no data lifecycle or retention extensions.

## Rollout and validation

Validation will be done manually using browser print preview across Chrome/Firefox/Safari and via unit tests in `ReportsScreen.test.tsx` verifying that the print-only metadata header renders correctly with active filters.
