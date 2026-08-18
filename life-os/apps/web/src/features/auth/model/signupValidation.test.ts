import { describe, expect, it } from "vitest";

import { validateSignupForm, type SignupFormValues } from "./signupValidation";

const VALID_VALUES: SignupFormValues = Object.freeze({
  email: "person@example.test",
  password: "correct-horse-battery-staple",
  displayName: "Person",
  termsAccepted: true,
});

describe("validateSignupForm", () => {
  it("returns no errors for a fully valid submission", () => {
    expect(validateSignupForm(VALID_VALUES)).toEqual({});
  });

  it("requires an email address", () => {
    expect(validateSignupForm({ ...VALID_VALUES, email: "  " }).email).toBe(
      "Enter your email address.",
    );
  });

  it("rejects a value that is not shaped like an email address", () => {
    expect(validateSignupForm({ ...VALID_VALUES, email: "not-an-email" }).email).toBe(
      "Enter an email address in the format name@example.com.",
    );
  });

  it("rejects an email address over 254 characters", () => {
    const longEmail = `${"a".repeat(250)}@example.test`;
    expect(validateSignupForm({ ...VALID_VALUES, email: longEmail }).email).toBe(
      "Enter an email address of 254 characters or fewer.",
    );
  });

  it("requires a name", () => {
    expect(validateSignupForm({ ...VALID_VALUES, displayName: "" }).displayName).toBe(
      "Enter your name.",
    );
  });

  it("rejects a name over 100 characters", () => {
    expect(validateSignupForm({ ...VALID_VALUES, displayName: "a".repeat(101) }).displayName).toBe(
      "Enter a name of 100 characters or fewer.",
    );
  });

  it("requires a password", () => {
    expect(validateSignupForm({ ...VALID_VALUES, password: "" }).password).toBe(
      "Enter a password.",
    );
  });

  it("rejects a password shorter than the policy minimum", () => {
    expect(validateSignupForm({ ...VALID_VALUES, password: "short" }).password).toBe(
      "Use at least 12 characters.",
    );
  });

  it("rejects a password longer than the policy maximum", () => {
    expect(validateSignupForm({ ...VALID_VALUES, password: "a".repeat(129) }).password).toBe(
      "Use 128 characters or fewer.",
    );
  });

  it("requires the terms and privacy checkbox to be checked", () => {
    expect(validateSignupForm({ ...VALID_VALUES, termsAccepted: false }).termsAccepted).toBe(
      "Accept the terms and privacy notice to continue.",
    );
  });

  it("reports every violated field at once, not just the first", () => {
    const errors = validateSignupForm({
      email: "",
      password: "",
      displayName: "",
      termsAccepted: false,
    });
    expect(Object.keys(errors).sort()).toEqual([
      "displayName",
      "email",
      "password",
      "termsAccepted",
    ]);
  });
});
