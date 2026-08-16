import type { ReactElement } from "react";

import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type RenderWithUserResult = RenderResult & {
  user: ReturnType<typeof userEvent.setup>;
};

export function renderWithUser(ui: ReactElement, options?: RenderOptions): RenderWithUserResult {
  return {
    user: userEvent.setup(),
    ...render(ui, options),
  };
}
