import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

import { Button, IconButton, LiveRegion, ProgressRing, Text } from "@components/ui";
import { TimerRing } from "@components/feedback";
import { useAnnouncer } from "@hooks/useAnnouncer";
import { useMediaQuery } from "@hooks/useMediaQuery";
import { useUserPreferences } from "@features/user";

import { useFocusSession } from "../hooks/useFocusSession";
import { type FocusSessionStatus } from "../api/focusApi";
import "./focus-mini-player.css";

const MOBILE_QUERY = "(max-width: 767px)";

export interface FocusMiniPlayerProps {
  readonly timeZone: string;
  readonly locale: string;
  readonly now?: Date;
}

const STATUS_TONE = {
  idle: "primary" as const,
  running: "primary" as const,
  paused: "warning" as const,
  completed: "success" as const,
};

export function FocusMiniPlayer({ locale }: FocusMiniPlayerProps) {
  const { session, isLoading, remainingSeconds, start, pause, resume, cancel, reset } =
    useFocusSession();

  const { data: prefs } = useUserPreferences();
  const defaultMinutes = prefs?.planningDefaults?.focusDurationMinutes ?? 25;

  const [isOpen, setIsOpen] = useState(false);
  const [prevDefaultMinutes, setPrevDefaultMinutes] = useState(defaultMinutes);
  const [durationInput, setDurationInput] = useState<string>(String(defaultMinutes));
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (defaultMinutes !== prevDefaultMinutes) {
    setPrevDefaultMinutes(defaultMinutes);
    setDurationInput(String(defaultMinutes));
  }

  // Click outside listener for desktop popover
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Escape key listener for desktop popover
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Transition announcements
  const { announce, message } = useAnnouncer();
  const prevStatusRef = useRef<FocusSessionStatus | "idle">("idle");
  const currentStatus = session?.status ?? "idle";

  useEffect(() => {
    if (prevStatusRef.current === currentStatus) {
      return;
    }
    prevStatusRef.current = currentStatus;

    // Suppress announcements if TimerRing is currently mounted/visible
    const isTimerRingVisible = isOpen || isMobile;
    if (isTimerRingVisible) {
      return;
    }

    if (currentStatus === "paused") {
      announce("Focus session paused.");
    } else if (currentStatus === "running") {
      announce("Focus session resumed.");
    } else if (currentStatus === "completed") {
      announce("Focus session completed.");
    }
  }, [currentStatus, isOpen, isMobile, announce]);

  if (isLoading) {
    return null;
  }

  const minutes = parseInt(durationInput, 10);
  const isValid = !isNaN(minutes) && minutes > 0 && minutes <= 1440;

  const handleStart = async (durationSecs?: number) => {
    const finalSecs = durationSecs ?? (isValid ? minutes * 60 : defaultMinutes * 60);
    await start(finalSecs);
  };

  const handleCancel = async () => {
    await cancel();
    setIsOpen(false);
  };

  const desktopTriggerContent = () => {
    if (currentStatus === "idle") {
      return (
        <IconButton
          ref={triggerRef}
          icon={Clock}
          label="Start focus"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        />
      );
    }

    return (
      <button
        ref={triggerRef}
        type="button"
        className="lifeos-focus-mini-player__trigger-btn"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Focus session: ${formatClock(remainingSeconds)} remaining, ${currentStatus}. Click for controls.`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--lifeos-space-2)" }}>
          <ProgressRing
            label="Focus session progress"
            labelHidden
            value={session ? session.totalSeconds - remainingSeconds : 0}
            max={session ? session.totalSeconds : 100}
            tone={STATUS_TONE[currentStatus]}
            size="sm"
            valueText={`${remainingSeconds} seconds remaining`}
          />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            <Text size="xs" weight="medium">
              {formatClock(remainingSeconds)}
            </Text>
          </span>
        </div>
      </button>
    );
  };

  const renderStartForm = (isMobileView: boolean) => (
    <div className="lifeos-focus-mini-player__start-form">
      <Text size="sm" weight="medium">
        Start Focus Session
      </Text>
      <div style={{ display: "flex", gap: "var(--lifeos-space-2)", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="focus-duration-input" className="lifeos-visually-hidden">
            Duration in minutes
          </label>
          <input
            id="focus-duration-input"
            type="number"
            className="lifeos-field__element"
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            min={1}
            max={1440}
            style={{ width: "100%" }}
          />
        </div>
        <Button disabled={!isValid} onClick={() => handleStart()}>
          Start
        </Button>
      </div>
      <div className="lifeos-focus-mini-player__presets">
        {[15, 25, 45].map((p) => (
          <Button
            key={p}
            size="sm"
            variant="secondary"
            onClick={async () => {
              await handleStart(p * 60);
              if (!isMobileView) {
                setIsOpen(false);
              }
            }}
          >
            {p}m
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="lifeos-focus-mini-player">
      {/* Desktop Inline & Popover */}
      <div className="lifeos-focus-mini-player__desktop-only">
        {desktopTriggerContent()}

        {isOpen && (
          <div ref={popoverRef} className="lifeos-focus-mini-player__popover">
            {currentStatus === "idle" ? (
              renderStartForm(false)
            ) : (
              <>
                <TimerRing
                  label="Focus session"
                  totalSeconds={session ? session.totalSeconds : 0}
                  remainingSeconds={remainingSeconds}
                  status={currentStatus}
                  locale={locale}
                  size="md"
                  onPause={pause}
                  onResume={resume}
                  onReset={reset}
                />
                <Button
                  variant="danger"
                  className="lifeos-focus-mini-player__cancel-btn"
                  onClick={handleCancel}
                >
                  Cancel Session
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile Inline (Directly in Drawer) */}
      <div className="lifeos-focus-mini-player__mobile-only">
        {currentStatus === "idle" ? (
          renderStartForm(true)
        ) : (
          <>
            <TimerRing
              label="Focus session"
              totalSeconds={session ? session.totalSeconds : 0}
              remainingSeconds={remainingSeconds}
              status={currentStatus}
              locale={locale}
              size="md"
              onPause={pause}
              onResume={resume}
              onReset={reset}
            />
            <Button
              variant="danger"
              className="lifeos-focus-mini-player__cancel-btn"
              onClick={handleCancel}
            >
              Cancel Session
            </Button>
          </>
        )}
      </div>

      <LiveRegion message={message} />
    </div>
  );
}

function formatClock(totalSeconds: number): string {
  const whole = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${minutes}:${pad(seconds)}`;
}
