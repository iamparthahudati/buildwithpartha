import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PRIVACY_VERSION } from "@features/auth";
import { PrivacyRoute } from "./PrivacyRoute";

describe("PrivacyRoute", () => {
  it("renders privacy notice title, metadata, version, DPDP compliance, and grievance officer contact", () => {
    render(
      <MemoryRouter initialEntries={["/life-os/privacy"]}>
        <PrivacyRoute />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /privacy notice/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(PRIVACY_VERSION))).toBeInTheDocument();
    expect(screen.getByText(/Partha \(buildwithpartha\.tech\)/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /1\. Introduction & Scope/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /2\. Information We Collect/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /3\. What We Never Do/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /4\. Data Retention, Export, and Deletion/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /5\. Security Safeguards/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /6\. Your Rights & Grievance Redressal/i }),
    ).toBeInTheDocument();

    const grievanceEmail = screen.getByRole("link", { name: /privacy@buildwithpartha\.tech/i });
    expect(grievanceEmail).toHaveAttribute("href", "mailto:privacy@buildwithpartha.tech");

    const backLink = screen.getByRole("link", { name: /← back to lifeos/i });
    expect(backLink).toHaveAttribute("href", "/life-os");
  });
});
