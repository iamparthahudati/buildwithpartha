import { Button, Heading, Surface, Text } from "@components/ui";

export interface StartStepProps {
  readonly isSubmitting: boolean;
  readonly onBack: () => void;
  readonly onFinish: () => Promise<void> | void;
}

export function StartStep({ isSubmitting, onBack, onFinish }: StartStepProps) {
  return (
    <div className="lifeos-onboarding-step">
      <div className="lifeos-onboarding-step__header">
        <Heading level={1} size="xl">
          Start LifeOS
        </Heading>
        <Text size="md" tone="secondary">
          Your workspace is initialized and ready. LifeOS never manufactures fake progress, sample
          habits, or fictional starter data.
        </Text>
      </div>

      <div className="lifeos-onboarding-step__start-content">
        <Surface tone="raised" padding="lg" className="lifeos-onboarding-step__start-card">
          <div className="lifeos-onboarding-step__start-choice">
            <div className="lifeos-onboarding-step__start-badge">Recommended</div>
            <Heading level={2} size="md">
              Start empty
            </Heading>
            <Text size="sm" tone="secondary">
              Open an honest, clean Today screen. Add tasks, habits, and time blocks as real needs
              arise.
            </Text>
          </div>
        </Surface>

        <div className="lifeos-onboarding-step__note">
          <Text size="sm" tone="muted">
            All profile and planning preferences can be changed at any time in Settings.
          </Text>
        </div>

        <div className="lifeos-onboarding-step__actions">
          <Button type="button" variant="secondary" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button type="button" variant="primary" loading={isSubmitting} onClick={onFinish}>
            Finish setup
          </Button>
        </div>
      </div>
    </div>
  );
}
