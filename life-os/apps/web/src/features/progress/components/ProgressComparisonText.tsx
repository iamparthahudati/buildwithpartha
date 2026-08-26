import { CheckCircle2 } from "lucide-react";
import { Surface, Text, Badge, Icon } from "@components/ui";
import { ProgressReport, sanitizeNonCausalCopy } from "../model/progress";
import "./progress-comparison-text.css";

export interface ProgressComparisonTextProps {
  readonly report?: ProgressReport;
  readonly className?: string;
}

export function ProgressComparisonText({ report, className }: ProgressComparisonTextProps) {
  if (!report || !report.summaryText) {
    return null;
  }

  const sanitizedSummary = sanitizeNonCausalCopy(report.summaryText);

  return (
    <Surface
      as="section"
      title="Factual Progress Summary"
      padding="md"
      className={["progress-comparison-text", className].filter(Boolean).join(" ")}
    >
      <div className="progress-comparison-text__header">
        <Icon icon={CheckCircle2} decorative size="sm" />
        <Text size="sm" weight="semibold">
          Descriptive Insights
        </Text>
        <Badge tone="neutral">Dictionary {report.metricDictionaryVersion || "v1.0.0"}</Badge>
      </div>

      <Text size="sm" tone="secondary" className="progress-comparison-text__content">
        {sanitizedSummary}
      </Text>

      <Text size="xs" tone="secondary" className="progress-comparison-text__disclaimer">
        All figures are strictly descriptive and factual; non-causal claims enforcement active.
      </Text>
    </Surface>
  );
}
