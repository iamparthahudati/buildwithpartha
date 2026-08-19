import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "@test/render";

import { App } from "./App";

describe("App", () => {
  it("composes AppProviders and the real route table, landing on the public entry", async () => {
    renderWithUser(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: "LifeOS" })).toBeInTheDocument();
  });
});
