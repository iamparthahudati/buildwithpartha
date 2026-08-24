import type { TimeBlock } from "./timeBlock";
import type {
  TimeBlockCategoryOption,
  TimeBlockProjectOption,
  TimeBlockTaskOption,
} from "../components/TimeBlockForm";
import type { TimeCategoryItem } from "../components/TimeCategoryBreakdown";

export const MOCK_TIME_BLOCK_CATEGORIES: readonly TimeBlockCategoryOption[] = [
  { value: "Focus", label: "Focus", color: "blue", icon: "target" },
  { value: "Meeting", label: "Meeting", color: "purple", icon: "users" },
  { value: "Planning", label: "Planning", color: "green", icon: "calendar" },
  { value: "Admin", label: "Admin", color: "gray", icon: "file-text" },
  { value: "Personal", label: "Personal", color: "amber", icon: "user" },
  { value: "Health", label: "Health", color: "emerald", icon: "heart" },
  { value: "Leisure", label: "Leisure", color: "indigo", icon: "coffee" },
];

export const MOCK_TIME_BLOCK_PROJECTS: readonly TimeBlockProjectOption[] = [
  { id: "proj-1", name: "LifeOS Web Platform" },
  { id: "proj-2", name: "API Core Framework" },
  { id: "proj-3", name: "Design System V2" },
];

export const MOCK_TIME_BLOCK_TASKS: readonly TimeBlockTaskOption[] = [
  { id: "task-1", title: "LOS-0907 Compose Time Blocks screen with mocks" },
  { id: "task-2", title: "LOS-0908 Integrate Time Blocks screen" },
  { id: "task-3", title: "LOS-0909 Implement Calendar aggregation API" },
];

export const MOCK_TIME_SUMMARY_CATEGORIES: readonly TimeCategoryItem[] = [
  { id: "cat-1", name: "Focus", minutes: 270, colorName: "blue" },
  { id: "cat-2", name: "Meeting", minutes: 60, colorName: "purple" },
  { id: "cat-3", name: "Planning", minutes: 60, colorName: "green" },
  { id: "cat-4", name: "Personal", minutes: 60, colorName: "amber" },
];

export const MOCK_TIME_BLOCKS: readonly TimeBlock[] = [
  {
    id: "tb-1",
    title: "Morning Review & Daily Plan",
    category: { name: "Planning", color: "green", icon: "calendar" },
    categoryColor: "green",
    categoryIcon: "calendar",
    date: "2026-08-24",
    startTime: "08:00",
    endTime: "09:00",
    timeZone: "UTC",
    status: "COMPLETED",
    completed: true,
    notes: "Review priorities, set daily MIT, schedule focus blocks",
  },
  {
    id: "tb-2",
    title: "Core Architecture Refactor",
    category: { name: "Focus", color: "blue", icon: "target" },
    categoryColor: "blue",
    categoryIcon: "target",
    date: "2026-08-24",
    startTime: "09:00",
    endTime: "11:30",
    timeZone: "UTC",
    status: "IN_PROGRESS",
    isCurrent: true,
    project: { id: "proj-1", name: "LifeOS Web Platform" },
    task: { id: "task-1", title: "LOS-0907 Compose Time Blocks screen with mocks" },
    notes: "Implement TimeBlocksScreen layout, state management, and mock specimens",
  },
  {
    id: "tb-3",
    title: "Team Standup & Sprint Sync",
    category: { name: "Meeting", color: "purple", icon: "users" },
    categoryColor: "purple",
    categoryIcon: "users",
    date: "2026-08-24",
    startTime: "11:30",
    endTime: "12:30",
    timeZone: "UTC",
    status: "SCHEDULED",
    project: { id: "proj-1", name: "LifeOS Web Platform" },
    notes: "Sync on Epic 09 progress and dependencies",
  },
  {
    id: "tb-4",
    title: "Lunch & Personal Break",
    category: { name: "Personal", color: "amber", icon: "user" },
    categoryColor: "amber",
    categoryIcon: "user",
    date: "2026-08-24",
    startTime: "12:30",
    endTime: "13:30",
    timeZone: "UTC",
    status: "SCHEDULED",
  },
  {
    id: "tb-5",
    title: "Feature Development: Time Blocks API",
    category: { name: "Focus", color: "blue", icon: "target" },
    categoryColor: "blue",
    categoryIcon: "target",
    date: "2026-08-24",
    startTime: "13:30",
    endTime: "16:30",
    timeZone: "UTC",
    status: "SCHEDULED",
    project: { id: "proj-2", name: "API Core Framework" },
    task: { id: "task-2", title: "LOS-0908 Integrate Time Blocks screen" },
  },
];

export const MOCK_CONFLICT_TIME_BLOCKS: readonly TimeBlock[] = [
  ...MOCK_TIME_BLOCKS,
  {
    id: "tb-6",
    title: "Client Architecture Sync",
    category: { name: "Meeting", color: "purple", icon: "users" },
    categoryColor: "purple",
    categoryIcon: "users",
    date: "2026-08-24",
    startTime: "11:45",
    endTime: "12:30",
    timeZone: "UTC",
    status: "SCHEDULED",
    hasConflict: true,
    conflictDescriptions: ["Overlaps with Team Standup & Sprint Sync (11:30 – 12:30)"],
  },
];

export const MOCK_WEEK_TIME_BLOCKS: readonly TimeBlock[] = [
  ...MOCK_TIME_BLOCKS,
  {
    id: "tb-w1",
    title: "Database Schema Migration Review",
    category: { name: "Planning", color: "green", icon: "calendar" },
    categoryColor: "green",
    date: "2026-08-25",
    startTime: "09:00",
    endTime: "10:30",
    timeZone: "UTC",
    status: "SCHEDULED",
  },
  {
    id: "tb-w2",
    title: "Design System Specs Sync",
    category: { name: "Meeting", color: "purple", icon: "users" },
    categoryColor: "purple",
    date: "2026-08-26",
    startTime: "14:00",
    endTime: "15:00",
    timeZone: "UTC",
    status: "SCHEDULED",
  },
  {
    id: "tb-w3",
    title: "Deep Work: Calendar Component",
    category: { name: "Focus", color: "blue", icon: "target" },
    categoryColor: "blue",
    date: "2026-08-27",
    startTime: "10:00",
    endTime: "13:00",
    timeZone: "UTC",
    status: "SCHEDULED",
  },
];
