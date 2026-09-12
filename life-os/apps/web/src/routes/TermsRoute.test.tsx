import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { TERMS_VERSION } from "@features/auth";
import { TermsRoute } from "./TermsRoute";

describe("TermsRoute", () => {
  it("renders terms of service title, effective version, data ownership clause, and governing law", () => {
    render(
      <MemoryRouter initialEntries={["/life-os/terms"]}>
        <TermsRoute />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /terms of service/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(TERMS_VERSION))).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /1\. Acceptance of Terms/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /2\. Eligibility & Accounts/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /3\. User Content & 100% Data Ownership/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /4\. Acceptable Use/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /5\. Service Availability & Changes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /6\. Account Deletion & Termination/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /7\. Limitation of Liability & Governing Law/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /8\. Contact Information/i }),
    ).toBeInTheDocument();

    const legalEmail = screen.getByRole("link", { name: /legal@buildwithpartha\.tech/i });
    expect(legalEmail).toHaveAttribute("href", "mailto:legal@buildwithpartha.tech");

    const backLink = screen.getByRole("link", { name: /← back to lifeos/i });
    expect(backLink).toHaveAttribute("href", "/life-os");
  });
});
