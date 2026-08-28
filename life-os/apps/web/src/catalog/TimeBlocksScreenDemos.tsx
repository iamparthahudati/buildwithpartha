import { useState } from "react";
import {
  TimeBlocksScreen,
  MOCK_TIME_BLOCKS,
  MOCK_CONFLICT_TIME_BLOCKS,
  MOCK_WEEK_TIME_BLOCKS,
} from "@features/time-blocks";
import { Button, Surface, Text } from "@components/ui";

export function TimeBlocksScreenDemo() {
  const [scenario, setScenario] = useState<
    "populated" | "week" | "conflict" | "dst" | "offline" | "loading" | "empty" | "error"
  >("populated");

  return (
    <div className="specimen-stack" style={{ width: "100%" }}>
      <Surface as="div" bordered padding="sm">
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <Text size="xs" weight="semibold">
            TimeBlocksScreen Scenario:
          </Text>
          <Button
            variant={scenario === "populated" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setScenario("populated")}
          >
            Day View (Populated)
          </Button>
          <Button
            variant={scenario === "week" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setScenario("week")}
          >
            Week View
          </Button>
          <Button
            variant={scenario === "conflict" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setScenario("conflict")}
          >
            Conflict
          </Button>
          <Button
            variant={scenario === "dst" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setScenario("dst")}
          >
            DST Transition
          </Button>
          <Button
            variant={scenario === "offline" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setScenario("offline")}
          >
            Offline
          </Button>
          <Button
            variant={scenario === "loading" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setScenario("loading")}
          >
            Loading
          </Button>
          <Button
            variant={scenario === "empty" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setScenario("empty")}
          >
            First-use Empty
          </Button>
          <Button
            variant={scenario === "error" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setScenario("error")}
          >
            Error
          </Button>
        </div>
      </Surface>

      {scenario === "populated" ? (
        <TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_TIME_BLOCKS} />
      ) : null}

      {scenario === "week" ? (
        <TimeBlocksScreen
          initialViewMode="week"
          initialDate="2026-08-24"
          initialBlocks={MOCK_WEEK_TIME_BLOCKS}
        />
      ) : null}

      {scenario === "conflict" ? (
        <TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_CONFLICT_TIME_BLOCKS} />
      ) : null}

      {scenario === "dst" ? (
        <TimeBlocksScreen
          initialDate="2026-08-24"
          initialBlocks={MOCK_TIME_BLOCKS}
          dstNotice="Daylight Saving Time transition: 23-hour day (clocks spring forward 02:00 -> 03:00)."
        />
      ) : null}

      {scenario === "offline" ? (
        <TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_TIME_BLOCKS} isOffline />
      ) : null}

      {scenario === "loading" ? <TimeBlocksScreen initialDate="2026-08-24" loading /> : null}

      {scenario === "empty" ? (
        <TimeBlocksScreen initialDate="2026-08-24" initialBlocks={[]} />
      ) : null}

      {scenario === "error" ? (
        <TimeBlocksScreen
          initialDate="2026-08-24"
          initialBlocks={[]}
          error="Failed to load time blocks for Monday, Aug 24, 2026. Network request timed out."
          onRetry={() => {}}
        />
      ) : null}
    </div>
  );
}
