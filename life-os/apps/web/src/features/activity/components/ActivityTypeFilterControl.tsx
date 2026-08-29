import { Select } from "@components/ui";

import {
  ACTIVITY_TYPE_FILTER_OPTIONS,
  type ActivityTypeFilter,
} from "../model/activityPresentation";
import "./activity-type-filter-control.css";

export interface ActivityTypeFilterControlProps {
  readonly value: ActivityTypeFilter;
  readonly onChange: (value: ActivityTypeFilter) => void;
}

export function ActivityTypeFilterControl({ value, onChange }: ActivityTypeFilterControlProps) {
  return (
    <Select
      className="lifeos-activity-type-filter"
      label="Activity type"
      value={value}
      options={ACTIVITY_TYPE_FILTER_OPTIONS}
      onChange={(event) => onChange(event.currentTarget.value as ActivityTypeFilter)}
    />
  );
}
