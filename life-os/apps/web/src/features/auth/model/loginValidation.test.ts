import { describe, expect, it } from "vitest";

import { validateLoginForm, type LoginFormValues } from "./loginValidation";

describe("validateLoginForm", () => {
  const validValues: LoginFormValues = {
    email: "user@example.test",
    password: "valid-password",
  };

  it("returns no errors for valid input", () => {
    expect(validateLoginForm(validValues)).toEqual({});
  });

  it("rejects an empty or whitespace-only email", () => {
    expect(validateLoginForm({ ...validValues, email: "" }).email).toBe(
      "Enter your email address.",
    );
    expect(validateLoginForm({ ...validValues, email: "   " }).email).toBe(
      "Enter your email address.",
    );
  });

  it("rejects an email that exceeds maximum length", () => {
    const longEmail = `${"a".repeat(245)}@example.com`;
    expect(validateLoginForm({ ...validValues, email: longEmail }).email).toBe(
      "Enter an email address of 254 characters or fewer.",
    );
  });

  it("rejects an invalid email format", () => {
    expect(validateLoginForm({ ...validValues, email: "not-an-email" }).email).toBe(
      "Enter an email address in the format name@example.com.",
    );
  });

  it("rejects an empty password", () => {
    expect(validateLoginForm({ ...validValues, password: "" }).password).toBe(
      "Enter your password.",
    );
  });

  it("returns multiple field errors simultaneously when both are invalid", () => {
    const errors = validateLoginForm({ email: "", password: "" });
    expect(errors.email).toBe("Enter your email address.");
    expect(errors.password).toBe("Enter your password.");
  });
});
