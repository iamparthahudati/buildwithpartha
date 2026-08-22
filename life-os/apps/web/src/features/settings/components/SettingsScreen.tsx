import { useState, type ReactNode } from "react";

import { ErrorState } from "@components/feedback";
import { PageHeader, Tabs, type TabItem } from "@components/navigation";
import { Skeleton } from "@components/ui";
import { useUserProfile, type UserProfileResponse } from "@features/user";

import { LocalizationSettingsPanel } from "./LocalizationSettingsPanel";
import { PrivacySettingsPanel } from "./PrivacySettingsPanel";
import { ProfileSettingsPanel } from "./ProfileSettingsPanel";
import { SecuritySettingsPanel } from "./SecuritySettingsPanel";
import "./settings-screen.css";

export interface SettingsScreenProps {
  readonly initialSection?: string;
  readonly onSectionChange?: (section: string) => void;
  readonly profile?: UserProfileResponse;
  readonly securityPanel?: ReactNode;
  readonly dataPanel?: ReactNode;
}

export function SettingsScreen({
  initialSection = "profile",
  onSectionChange,
  profile: overrideProfile,
  securityPanel,
  dataPanel,
}: SettingsScreenProps) {
  const [selectedSection, setSelectedSection] = useState(initialSection);

  const { data: fetchedProfile, isLoading, error, refetch } = useUserProfile();
  const profile = overrideProfile ?? fetchedProfile;

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    onSectionChange?.(section);
  };

  if (isLoading && !profile) {
    return (
      <div className="lifeos-settings-screen" data-testid="settings-screen-loading">
        <PageHeader
          title="Settings"
          description="Manage your account profile, localization, preferences, and security."
          breadcrumbs={[
            { label: "Today", href: "/life-os/app/today" },
            { label: "Settings", href: "/life-os/app/settings" },
          ]}
        />
        <div className="lifeos-settings-skeleton">
          <Skeleton shape="block" height="300px" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="lifeos-settings-screen" data-testid="settings-screen-error">
        <PageHeader
          title="Settings"
          description="Manage your account profile, localization, preferences, and security."
          breadcrumbs={[
            { label: "Today", href: "/life-os/app/today" },
            { label: "Settings", href: "/life-os/app/settings" },
          ]}
        />
        <ErrorState
          scope="page"
          title="Couldn't load settings"
          description="We couldn't retrieve your profile settings from the server. Please try again."
          onRetry={() => {
            refetch();
          }}
        />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const tabItems: readonly TabItem[] = [
    {
      id: "profile",
      label: "Profile",
      panel: <ProfileSettingsPanel profile={profile} />,
    },
    {
      id: "localization",
      label: "Localization",
      panel: <LocalizationSettingsPanel profile={profile} />,
    },
    {
      id: "security",
      label: "Security",
      panel: securityPanel ?? <SecuritySettingsPanel />,
    },
    {
      id: "data",
      label: "Data & privacy",
      panel: dataPanel ?? <PrivacySettingsPanel profile={profile} />,
    },
  ];

  return (
    <div className="lifeos-settings-screen" data-testid="settings-screen">
      <PageHeader
        title="Settings"
        description="Manage your account profile, localization, preferences, and security."
        breadcrumbs={[
          { label: "Today", href: "/life-os/app/today" },
          { label: "Settings", href: "/life-os/app/settings" },
        ]}
      />

      <main className="lifeos-settings-content">
        <Tabs
          label="Settings sections"
          items={tabItems}
          selectedId={selectedSection}
          onSelectedIdChange={handleSectionChange}
        />
      </main>
    </div>
  );
}
