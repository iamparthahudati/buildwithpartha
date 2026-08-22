import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Text } from "@components/ui";
import { AppShell } from "@components/layout";
import { ToastProvider } from "@state/ToastProvider";
import { AuthSessionProvider } from "@state/AuthSessionProvider";

/**
 * Interactive demos for the layout catalog entries. Live apart from the
 * entry registry so that file exports only data and this one only
 * components, which keeps React Fast Refresh working.
 */

const APPSHELL_STAGE_STYLE = {
  border: "1px solid var(--lifeos-color-border)",
  borderRadius: "var(--lifeos-radius-lg)",
  overflow: "hidden",
  height: "36rem",
} as const;

function AppShellRouteContent() {
  return (
    <div style={{ padding: "var(--lifeos-space-4)" }}>
      <Text tone="secondary" size="sm">
        This is the routed &quot;main&quot; content `AppShell` composes around — Sidebar and TopBar
        are both self-contained components neither one knows the other exists.
      </Text>
    </div>
  );
}

const demoQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export function AppShellDemo() {
  return (
    <div style={APPSHELL_STAGE_STYLE}>
      <QueryClientProvider client={demoQueryClient}>
        <AuthSessionProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/life-os/app/today"]}>
              <Routes>
                <Route
                  path="/life-os/app"
                  element={
                    <AppShell
                      displayName="Priya Sharma"
                      email="priya@example.com"
                      timeZone="Asia/Kolkata"
                      locale="en-US"
                      onQuickAddTriggerClick={() => {}}
                      onSignOut={() => {}}
                    />
                  }
                >
                  <Route path="today" element={<AppShellRouteContent />} />
                  <Route path="tasks" element={<AppShellRouteContent />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthSessionProvider>
      </QueryClientProvider>
    </div>
  );
}
