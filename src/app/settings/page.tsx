"use client";

import dynamic from "next/dynamic";

const SettingsContent = dynamic(() => import("@/app/settings/settings-content"), {
  ssr: false,
});

export default function SettingsPage() {
  return <SettingsContent />;
}
