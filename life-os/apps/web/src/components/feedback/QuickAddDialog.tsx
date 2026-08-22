// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button, DateInput, Select, Text, TextInput, Textarea, TimeInput } from "@components/ui";
import { useToast } from "@state/toastQueue";
import {
  FormErrorSummary,
  FormField,
  FormFieldGroup,
  DateTimeField,
  type DateTimeValue,
} from "@components/forms";

import { FormDialog } from "./FormDialog";
import { InlineMessage } from "./InlineMessage";
import "./quick-add-dialog.css";

export interface QuickAddDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly timeZone: string;
  readonly initialType?: QuickAddType;
}

export type QuickAddType =
  "task" | "brain-dump" | "time-block" | "note" | "project" | "habit" | "goal";

const PROJECT_OPTIONS = [
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "health", label: "Health" },
  { value: "leisure", label: "Leisure" },
];

const HABIT_OPTIONS = [
  { value: "meditation", label: "Morning Meditation" },
  { value: "reading", label: "Read 10 pages" },
  { value: "workout", label: "Workout" },
  { value: "water", label: "Drink 3L water" },
];

const HABIT_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
  { value: "not-done", label: "Not Done" },
];

const GOAL_OPTIONS = [
  { value: "marathon", label: "Run Marathon" },
  { value: "book", label: "Write Book" },
  { value: "rust", label: "Learn Rust" },
  { value: "saving", label: "Save $10,000" },
];

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "red", label: "Red" },
  { value: "purple", label: "Purple" },
];

const ICON_OPTIONS = [
  { value: "folder", label: "Folder" },
  { value: "target", label: "Target" },
  { value: "calendar", label: "Calendar" },
  { value: "star", label: "Star" },
];

export function QuickAddDialog({
  open,
  onClose,
  timeZone,
  initialType = "task",
}: QuickAddDialogProps) {
  const navigate = useNavigate();
  const toast = useToast();

  const [activeType, setActiveType] = useState<QuickAddType>(initialType);
  const [isPending, setIsPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const taskBtnRef = useRef<HTMLButtonElement>(null);
  const brainDumpBtnRef = useRef<HTMLButtonElement>(null);
  const timeBlockBtnRef = useRef<HTMLButtonElement>(null);
  const noteBtnRef = useRef<HTMLButtonElement>(null);
  const moreTypesRef = useRef<HTMLSelectElement>(null);

  // Monitor network connection status
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Form State
  // 1. Task fields
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [taskPriority, setTaskPriority] = useState("");
  const [dueDateVal, setDueDateVal] = useState<DateTimeValue>({ date: null, time: null });

  // 2. Brain Dump fields
  const [brainContent, setBrainContent] = useState("");

  // 3. Time Block fields
  const [timeTitle, setTimeTitle] = useState("");
  const [timeDate, setTimeDate] = useState("");
  const [timeStartTime, setTimeStartTime] = useState("");
  const [timeEndTime, setTimeEndTime] = useState("");
  const [timeCategory, setTimeCategory] = useState("");

  // 4. Note fields
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  // 5. Project fields
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState("");
  const [projectIcon, setProjectIcon] = useState("");

  // 6. Habit fields
  const [habitId, setHabitId] = useState("");
  const [habitStatus, setHabitStatus] = useState("");

  // 7. Goal fields
  const [goalId, setGoalId] = useState("");
  const [goalProgress, setGoalProgress] = useState("");
  const [goalNotes, setGoalNotes] = useState("");

  const resetFields = (type: string) => {
    switch (type) {
      case "task":
        setTaskTitle("");
        setTaskProject("");
        setTaskPriority("");
        setDueDateVal({ date: null, time: null });
        break;
      case "brain-dump":
        setBrainContent("");
        break;
      case "time-block":
        setTimeTitle("");
        setTimeDate("");
        setTimeStartTime("");
        setTimeEndTime("");
        setTimeCategory("");
        break;
      case "note":
        setNoteTitle("");
        setNoteContent("");
        break;
      case "project":
        setProjectName("");
        setProjectColor("");
        setProjectIcon("");
        break;
      case "habit":
        setHabitId("");
        setHabitStatus("");
        break;
      case "goal":
        setGoalId("");
        setGoalProgress("");
        setGoalNotes("");
        break;
    }
  };

  const resetAllFields = () => {
    resetFields("task");
    resetFields("brain-dump");
    resetFields("time-block");
    resetFields("note");
    resetFields("project");
    resetFields("habit");
    resetFields("goal");
  };

  // Reset fields when dialog is closed
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      resetAllFields();
      setFieldErrors({});
      setSubmitError(undefined);
      setActiveType(initialType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialType, open]);

  const initialFocusRef =
    initialType === "brain-dump"
      ? brainDumpBtnRef
      : initialType === "time-block"
        ? timeBlockBtnRef
        : initialType === "note"
          ? noteBtnRef
          : ["project", "habit", "goal"].includes(initialType)
            ? moreTypesRef
            : taskBtnRef;

  // If the active type becomes unavailable due to offline transition, handle it
  const isTypeOfflineSafe = ["task", "note", "brain-dump"].includes(activeType);
  const isCurrentTypeDisabledOffline = !isOnline && !isTypeOfflineSafe;

  const getIsActiveDirty = () => {
    switch (activeType) {
      case "task":
        return (
          taskTitle !== "" ||
          taskProject !== "" ||
          taskPriority !== "" ||
          dueDateVal.date !== null ||
          dueDateVal.time !== null
        );
      case "brain-dump":
        return brainContent !== "";
      case "time-block":
        return (
          timeTitle !== "" ||
          timeDate !== "" ||
          timeStartTime !== "" ||
          timeEndTime !== "" ||
          timeCategory !== ""
        );
      case "note":
        return noteTitle !== "" || noteContent !== "";
      case "project":
        return projectName !== "" || projectColor !== "" || projectIcon !== "";
      case "habit":
        return habitId !== "" || habitStatus !== "";
      case "goal":
        return goalId !== "" || goalProgress !== "" || goalNotes !== "";
      default:
        return false;
    }
  };

  const isDirty = getIsActiveDirty();

  const getActiveRecordName = () => {
    switch (activeType) {
      case "task":
        return taskTitle;
      case "brain-dump":
        return brainContent.length > 20 ? `${brainContent.slice(0, 20)}...` : brainContent;
      case "time-block":
        return timeTitle;
      case "note":
        return noteTitle;
      case "project":
        return projectName;
      case "habit":
        return HABIT_OPTIONS.find((h) => h.value === habitId)?.label || habitId;
      case "goal":
        return GOAL_OPTIONS.find((g) => g.value === goalId)?.label || goalId;
      default:
        return "";
    }
  };

  const getActiveTypeName = () => {
    switch (activeType) {
      case "task":
        return "Task";
      case "brain-dump":
        return "Brain dump item";
      case "time-block":
        return "Time block";
      case "note":
        return "Note";
      case "project":
        return "Project";
      case "habit":
        return "Habit entry";
      case "goal":
        return "Goal check-in";
      default:
        return "";
    }
  };

  const getSubmitLabel = () => {
    switch (activeType) {
      case "task":
        return "Add task";
      case "brain-dump":
        return "Add brain dump item";
      case "time-block":
        return "Add time block";
      case "note":
        return "Add note";
      case "project":
        return "Create project";
      case "habit":
        return "Record habit entry";
      case "goal":
        return "Log goal check-in";
      default:
        return "Add";
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (activeType === "task") {
      if (!taskTitle.trim()) {
        errors.taskTitle = "Title is required.";
      }
    } else if (activeType === "brain-dump") {
      if (!brainContent.trim()) {
        errors.brainContent = "Content is required.";
      }
    } else if (activeType === "time-block") {
      if (!timeTitle.trim()) {
        errors.timeTitle = "Title is required.";
      }
      if (!timeDate) {
        errors.timeDate = "Date is required.";
      }
      if (!timeStartTime) {
        errors.timeStartTime = "Start time is required.";
      }
      if (!timeEndTime) {
        errors.timeEndTime = "End time is required.";
      }
      if (timeStartTime && timeEndTime && timeEndTime <= timeStartTime) {
        errors.timeEndTime = "End time must be after start time.";
      }
    } else if (activeType === "note") {
      if (!noteTitle.trim()) {
        errors.noteTitle = "Title is required.";
      }
    } else if (activeType === "project") {
      if (!projectName.trim()) {
        errors.projectName = "Name is required.";
      }
    } else if (activeType === "habit") {
      if (!habitId) {
        errors.habitId = "Habit is required.";
      }
      if (!habitStatus) {
        errors.habitStatus = "Status is required.";
      }
    } else if (activeType === "goal") {
      if (!goalId) {
        errors.goalId = "Goal is required.";
      }
      if (!goalProgress.trim()) {
        errors.goalProgress = "Progress is required.";
      } else if (isNaN(Number(goalProgress)) || Number(goalProgress) < 0) {
        errors.goalProgress = "Progress must be a positive number.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (isCurrentTypeDisabledOffline) {
      return;
    }

    if (!validate()) {
      // Focus error summary immediately
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 0);
      return;
    }

    setIsPending(true);
    setSubmitError(undefined);

    try {
      // Simulate network request
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const recordName = getActiveRecordName();

      // Implement simulated failures for testing
      if (recordName === "force-fail" || recordName === "force-fail...") {
        throw new Error("Server error: Failed to save record due to a database constraint.");
      }

      // Success flow
      const typeName = getActiveTypeName();
      const isQueued = !isOnline && isTypeOfflineSafe;

      if (isQueued) {
        toast.push({
          tone: "info",
          message: `${typeName} "${recordName}" queued — will sync when online`,
        });
      } else {
        toast.push({
          tone: "success",
          message: `${typeName} "${recordName}" created successfully`,
        });
      }

      resetFields(activeType);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  const handleMoreOptions = () => {
    toast.push({
      tone: "info",
      message: "Full creation form isn't available yet. Current fields preserved.",
    });

    const typeRoutes: Record<string, string> = {
      task: "/life-os/app/tasks",
      "brain-dump": "/life-os/app/brain-dump",
      "time-block": "/life-os/app/time-blocks",
      note: "/life-os/app/notes",
      project: "/life-os/app/projects",
      habit: "/life-os/app/habits",
      goal: "/life-os/app/goals",
    };

    const route = typeRoutes[activeType];
    if (route) {
      navigate(route);
    }
    onClose();
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Quick Add"
      submitLabel={getSubmitLabel()}
      pending={isPending}
      isDirty={isDirty}
      error={submitError}
      initialFocusRef={initialFocusRef}
    >
      <div className="lifeos-quick-add">
        {/* Type Chooser */}
        <div className="lifeos-quick-add__chooser-container">
          <span className="lifeos-quick-add__chooser-legend">Select creation type</span>
          <div className="lifeos-quick-add__chooser">
            <Button
              ref={taskBtnRef}
              variant={activeType === "task" ? "primary" : "secondary"}
              disabled={isPending}
              onClick={() => {
                setActiveType("task");
                setFieldErrors({});
                setSubmitError(undefined);
              }}
            >
              Task
            </Button>
            <Button
              ref={brainDumpBtnRef}
              variant={activeType === "brain-dump" ? "primary" : "secondary"}
              disabled={isPending}
              onClick={() => {
                setActiveType("brain-dump");
                setFieldErrors({});
                setSubmitError(undefined);
              }}
            >
              Brain Dump
            </Button>
            <Button
              ref={timeBlockBtnRef}
              variant={activeType === "time-block" ? "primary" : "secondary"}
              disabled={!isOnline || isPending}
              title={!isOnline ? "Unavailable offline" : undefined}
              onClick={() => {
                setActiveType("time-block");
                setFieldErrors({});
                setSubmitError(undefined);
              }}
            >
              Time Block
            </Button>
            <Button
              ref={noteBtnRef}
              variant={activeType === "note" ? "primary" : "secondary"}
              disabled={isPending}
              onClick={() => {
                setActiveType("note");
                setFieldErrors({});
                setSubmitError(undefined);
              }}
            >
              Note
            </Button>

            <div
              className={[
                "lifeos-quick-add__chooser-select",
                ["project", "habit", "goal"].includes(activeType) && "is-active",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Select
                ref={moreTypesRef}
                label="More creation types"
                labelHidden
                placeholder="More creation types..."
                disabled={isPending}
                value={["project", "habit", "goal"].includes(activeType) ? activeType : ""}
                options={[
                  { value: "project", label: "Project", disabled: !isOnline },
                  { value: "habit", label: "Habit Entry", disabled: !isOnline },
                  { value: "goal", label: "Goal Check-in", disabled: !isOnline },
                ]}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setActiveType(val as QuickAddType);
                    setFieldErrors({});
                    setSubmitError(undefined);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Offline Warning Banner */}
        {isCurrentTypeDisabledOffline ? (
          <InlineMessage
            tone="warning"
            announce="polite"
            className="lifeos-quick-add__offline-warning"
          >
            {getActiveTypeName()} creation is unavailable offline.
          </InlineMessage>
        ) : null}

        {/* Forms Fields */}
        <FormFieldGroup>
          <FormErrorSummary ref={errorSummaryRef} />

          {activeType === "task" && (
            <div className="lifeos-quick-add__fields-grid">
              <FormField name="taskTitle" label="Title" error={fieldErrors.taskTitle}>
                {(field) => (
                  <TextInput
                    {...field}
                    disabled={isPending}
                    value={taskTitle}
                    onChange={(e) => {
                      setTaskTitle(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, taskTitle: "" }));
                    }}
                  />
                )}
              </FormField>

              <div className="lifeos-quick-add__fields-grid lifeos-quick-add__fields-grid--two-columns">
                <FormField
                  name="taskProject"
                  label="Project"
                  required={false}
                  error={fieldErrors.taskProject}
                >
                  {(field) => (
                    <Select
                      {...field}
                      disabled={isPending}
                      placeholder="Select project..."
                      value={taskProject}
                      options={PROJECT_OPTIONS}
                      onChange={(e) => {
                        setTaskProject(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, taskProject: "" }));
                      }}
                    />
                  )}
                </FormField>

                <FormField
                  name="taskPriority"
                  label="Priority"
                  required={false}
                  error={fieldErrors.taskPriority}
                >
                  {(field) => (
                    <Select
                      {...field}
                      disabled={isPending}
                      placeholder="Select priority..."
                      value={taskPriority}
                      options={[
                        { value: "P1", label: "P1 (High)" },
                        { value: "P2", label: "P2 (Medium)" },
                        { value: "P3", label: "P3 (Low)" },
                        { value: "P4", label: "P4 (None)" },
                      ]}
                      onChange={(e) => {
                        setTaskPriority(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, taskPriority: "" }));
                      }}
                    />
                  )}
                </FormField>
              </div>

              <DateTimeField
                legend="Due date & time"
                value={dueDateVal}
                disabled={isPending}
                timeZone={timeZone}
                onValueChange={(val) => {
                  setDueDateVal(val);
                  setFieldErrors((prev) => ({ ...prev, taskDueDate: "", taskDueTime: "" }));
                }}
              />
            </div>
          )}

          {activeType === "brain-dump" && (
            <div className="lifeos-quick-add__fields-grid">
              <FormField name="brainContent" label="Content" error={fieldErrors.brainContent}>
                {(field) => (
                  <Textarea
                    {...field}
                    disabled={isPending}
                    value={brainContent}
                    onChange={(e) => {
                      setBrainContent(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, brainContent: "" }));
                    }}
                  />
                )}
              </FormField>
            </div>
          )}

          {activeType === "time-block" && (
            <div className="lifeos-quick-add__fields-grid">
              <FormField name="timeTitle" label="Title" error={fieldErrors.timeTitle}>
                {(field) => (
                  <TextInput
                    {...field}
                    disabled={isPending || isCurrentTypeDisabledOffline}
                    value={timeTitle}
                    onChange={(e) => {
                      setTimeTitle(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, timeTitle: "" }));
                    }}
                  />
                )}
              </FormField>

              <div className="lifeos-quick-add__fields-grid lifeos-quick-add__fields-grid--two-columns">
                <FormField name="timeDate" label="Date" error={fieldErrors.timeDate}>
                  {(field) => (
                    <DateInput
                      {...field}
                      disabled={isPending || isCurrentTypeDisabledOffline}
                      value={timeDate}
                      onChange={(e) => {
                        setTimeDate(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, timeDate: "" }));
                      }}
                      onClear={() => setTimeDate("")}
                    />
                  )}
                </FormField>

                <FormField
                  name="timeCategory"
                  label="Category"
                  required={false}
                  error={fieldErrors.timeCategory}
                >
                  {(field) => (
                    <Select
                      {...field}
                      disabled={isPending || isCurrentTypeDisabledOffline}
                      placeholder="Select category..."
                      value={timeCategory}
                      options={[
                        { value: "work", label: "Work" },
                        { value: "personal", label: "Personal" },
                        { value: "health", label: "Health" },
                        { value: "leisure", label: "Leisure" },
                      ]}
                      onChange={(e) => {
                        setTimeCategory(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, timeCategory: "" }));
                      }}
                    />
                  )}
                </FormField>
              </div>

              <div className="lifeos-quick-add__fields-grid lifeos-quick-add__fields-grid--two-columns">
                <FormField
                  name="timeStartTime"
                  label="Start Time"
                  error={fieldErrors.timeStartTime}
                >
                  {(field) => (
                    <TimeInput
                      {...field}
                      disabled={isPending || isCurrentTypeDisabledOffline}
                      value={timeStartTime}
                      onChange={(e) => {
                        setTimeStartTime(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, timeStartTime: "", timeEndTime: "" }));
                      }}
                      onClear={() => setTimeStartTime("")}
                    />
                  )}
                </FormField>

                <FormField name="timeEndTime" label="End Time" error={fieldErrors.timeEndTime}>
                  {(field) => (
                    <TimeInput
                      {...field}
                      disabled={isPending || isCurrentTypeDisabledOffline}
                      value={timeEndTime}
                      onChange={(e) => {
                        setTimeEndTime(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, timeEndTime: "" }));
                      }}
                      onClear={() => setTimeEndTime("")}
                    />
                  )}
                </FormField>
              </div>
            </div>
          )}

          {activeType === "note" && (
            <div className="lifeos-quick-add__fields-grid">
              <FormField name="noteTitle" label="Title" error={fieldErrors.noteTitle}>
                {(field) => (
                  <TextInput
                    {...field}
                    disabled={isPending}
                    value={noteTitle}
                    onChange={(e) => {
                      setNoteTitle(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, noteTitle: "" }));
                    }}
                  />
                )}
              </FormField>

              <FormField
                name="noteContent"
                label="Content"
                required={false}
                error={fieldErrors.noteContent}
              >
                {(field) => (
                  <Textarea
                    {...field}
                    disabled={isPending}
                    value={noteContent}
                    onChange={(e) => {
                      setNoteContent(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, noteContent: "" }));
                    }}
                  />
                )}
              </FormField>
            </div>
          )}

          {activeType === "project" && (
            <div className="lifeos-quick-add__fields-grid">
              <FormField name="projectName" label="Project Name" error={fieldErrors.projectName}>
                {(field) => (
                  <TextInput
                    {...field}
                    disabled={isPending || isCurrentTypeDisabledOffline}
                    value={projectName}
                    onChange={(e) => {
                      setProjectName(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, projectName: "" }));
                    }}
                  />
                )}
              </FormField>

              <div className="lifeos-quick-add__fields-grid lifeos-quick-add__fields-grid--two-columns">
                <FormField
                  name="projectColor"
                  label="Color"
                  required={false}
                  error={fieldErrors.projectColor}
                >
                  {(field) => (
                    <Select
                      {...field}
                      disabled={isPending || isCurrentTypeDisabledOffline}
                      placeholder="Select color..."
                      value={projectColor}
                      options={COLOR_OPTIONS}
                      onChange={(e) => {
                        setProjectColor(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, projectColor: "" }));
                      }}
                    />
                  )}
                </FormField>

                <FormField
                  name="projectIcon"
                  label="Icon"
                  required={false}
                  error={fieldErrors.projectIcon}
                >
                  {(field) => (
                    <Select
                      {...field}
                      disabled={isPending || isCurrentTypeDisabledOffline}
                      placeholder="Select icon..."
                      value={projectIcon}
                      options={ICON_OPTIONS}
                      onChange={(e) => {
                        setProjectIcon(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, projectIcon: "" }));
                      }}
                    />
                  )}
                </FormField>
              </div>
            </div>
          )}

          {activeType === "habit" && (
            <div className="lifeos-quick-add__fields-grid">
              <FormField name="habitId" label="Habit" error={fieldErrors.habitId}>
                {(field) => (
                  <Select
                    {...field}
                    disabled={isPending || isCurrentTypeDisabledOffline}
                    placeholder="Select habit..."
                    value={habitId}
                    options={HABIT_OPTIONS}
                    onChange={(e) => {
                      setHabitId(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, habitId: "" }));
                    }}
                  />
                )}
              </FormField>

              <FormField name="habitStatus" label="Status" error={fieldErrors.habitStatus}>
                {(field) => (
                  <Select
                    {...field}
                    disabled={isPending || isCurrentTypeDisabledOffline}
                    placeholder="Select status..."
                    value={habitStatus}
                    options={HABIT_STATUS_OPTIONS}
                    onChange={(e) => {
                      setHabitStatus(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, habitStatus: "" }));
                    }}
                  />
                )}
              </FormField>
            </div>
          )}

          {activeType === "goal" && (
            <div className="lifeos-quick-add__fields-grid">
              <FormField name="goalId" label="Goal" error={fieldErrors.goalId}>
                {(field) => (
                  <Select
                    {...field}
                    disabled={isPending || isCurrentTypeDisabledOffline}
                    placeholder="Select goal..."
                    value={goalId}
                    options={GOAL_OPTIONS}
                    onChange={(e) => {
                      setGoalId(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, goalId: "" }));
                    }}
                  />
                )}
              </FormField>

              <FormField
                name="goalProgress"
                label="Progress Value"
                error={fieldErrors.goalProgress}
              >
                {(field) => (
                  <TextInput
                    {...field}
                    disabled={isPending || isCurrentTypeDisabledOffline}
                    type="number"
                    value={goalProgress}
                    onChange={(e) => {
                      setGoalProgress(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, goalProgress: "" }));
                    }}
                  />
                )}
              </FormField>

              <FormField
                name="goalNotes"
                label="Check-in Notes"
                required={false}
                error={fieldErrors.goalNotes}
              >
                {(field) => (
                  <Textarea
                    {...field}
                    disabled={isPending || isCurrentTypeDisabledOffline}
                    value={goalNotes}
                    onChange={(e) => {
                      setGoalNotes(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, goalNotes: "" }));
                    }}
                  />
                )}
              </FormField>
            </div>
          )}
        </FormFieldGroup>

        {/* More options navigation */}
        <div className="lifeos-quick-add__more-options">
          <Button variant="link" size="sm" onClick={handleMoreOptions}>
            More options
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
