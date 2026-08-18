import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAuthSession } from "@state/authSession";

import { renderWithUser } from "@test/render";

import { AppProviders } from "./AppProviders";

function Probe() {
  const { user } = useAuthSession();
  return <p>{user === null ? "Signed out" : "Signed in"}</p>;
}

describe("AppProviders", () => {
  it("gives descendants a working auth session, backed by a query client", () => {
    renderWithUser(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );

    expect(screen.getByText("Signed out")).toBeInTheDocument();
  });
});
