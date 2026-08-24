import { screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as calendarFeature from "@features/calendar";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { renderWithUser } from "@test/render";
import { RouterLocationProbe } from "@test/RouterLocationProbe";

import { CalendarRoute } from "./CalendarRoute";

const calendarMocks = vi.hoisted(() => ({
  online: true,
  query: vi.fn(),
}));

vi.mock("@features/calendar", async (importOriginal) => {
  const actual = await importOriginal<typeof calendarFeature>();
  return {
    ...actual,
    useCalendar: calendarMocks.query,
    useCalendarOnlineStatus: () => calendarMocks.online,
    CalendarScreen: (props: calendarFeature.CalendarScreenProps) => (
      <div>
        <p>Calendar route screen</p>
        <p>date:{props.date}</p>
        <p>view:{props.view}</p>
        <button type="button" onClick={() => props.onDateChange("2026-09-01")}>
          Change date
        </button>
        <button type="button" onClick={() => props.onViewChange("day")}>
          Change view
        </button>
        <button type="button" onClick={() => props.onSourcesChange(new Set(["TASK_DUE"]))}>
          Tasks only
        </button>
        <button
          type="button"
          onClick={() =>
            props.onSelectEvent({
              id: "time-block:block-1",
              sourceId: "block-1",
              sourceType: "TIME_BLOCK",
              title: "Deep work",
              localDate: "2026-08-24",
              allDay: true,
              status: "SCHEDULED",
            })
          }
        >
          Open block
        </button>
        <button type="button" onClick={props.onAddTimeBlock}>
          Quick add
        </button>
      </div>
    ),
  };
});

const MOCK_AUTH_STATE: AuthSessionValue = {
  user: {
    id: "user-1",
    email: "test@example.com",
    displayName: "Test User",
    timeZone: "America/New_York",
    locale: "en-US",
    weekStart: 1,
  },
  csrfToken: "csrf",
  isBootstrapping: false,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

function renderRoute(initialEntry: string, onQuickAddClick = vi.fn()) {
  return {
    onQuickAddClick,
    ...renderWithUser(
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<Outlet context={{ onQuickAddClick }} />}>
              <Route path="/life-os/app/calendar" element={<CalendarRoute />} />
              <Route path="*" element={<RouterLocationProbe />} />
            </Route>
          </Routes>
          <RouterLocationProbe />
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    ),
  };
}

describe("CalendarRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    calendarMocks.online = true;
    calendarMocks.query.mockReturnValue({
      data: { events: [], truncated: false },
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("queries the exact six-week month range and restores URL source filters", () => {
    renderRoute("/life-os/app/calendar?date=2026-08-24&source=TIME_BLOCK&source=MILESTONE");

    expect(calendarMocks.query).toHaveBeenCalledWith(
      {
        startDate: "2026-07-27",
        endDate: "2026-09-06",
        timeZone: "America/New_York",
        sources: ["TIME_BLOCK", "MILESTONE"],
      },
      true,
    );
    expect(screen.getByText("view:month")).toBeInTheDocument();
  });

  it("persists date, view, and sources in the URL", async () => {
    const { user } = renderRoute("/life-os/app/calendar?date=2026-08-24");

    await user.click(screen.getByRole("button", { name: "Change date" }));
    await user.click(screen.getByRole("button", { name: "Change view" }));
    await user.click(screen.getByRole("button", { name: "Tasks only" }));

    expect(screen.getAllByLabelText("location").at(-1)).toHaveTextContent(
      "/life-os/app/calendar?date=2026-09-01&view=day&source=TASK_DUE",
    );
  });

  it("opens the canonical Time Block record and preserves the Calendar return URL", async () => {
    const { user } = renderRoute("/life-os/app/calendar?date=2026-08-24&view=day");
    await user.click(screen.getByRole("button", { name: "Open block" }));

    const location = screen.getAllByLabelText("location").at(-1);
    expect(location).toHaveTextContent("/life-os/app/time-blocks?date=2026-08-24&selected=block-1");
    expect(location).toHaveTextContent("returnTo=%2Flife-os%2Fapp%2Fcalendar");
  });

  it("disables querying with no selected sources or while offline and opens Quick Add", async () => {
    calendarMocks.online = false;
    const onQuickAddClick = vi.fn();
    const { user } = renderRoute("/life-os/app/calendar?source=", onQuickAddClick);

    expect(calendarMocks.query).toHaveBeenCalledWith(expect.any(Object), false);
    await user.click(screen.getByRole("button", { name: "Quick add" }));
    expect(onQuickAddClick).toHaveBeenCalledWith("time-block");
  });
});
