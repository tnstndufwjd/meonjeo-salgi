"use client";

import { useState } from "react";
import type { YouthProfile } from "@/lib/profile";
import { IntakeForm } from "./IntakeForm";
import { ScenarioView } from "./ScenarioView";

export function ConsultFlow() {
  const [profile, setProfile] = useState<YouthProfile | null>(null);
  return (
    <main className="px-4 pb-10 pt-8">
      {profile ? (
        <ScenarioView profile={profile} onBack={() => setProfile(null)} />
      ) : (
        <IntakeForm onSubmit={setProfile} />
      )}
    </main>
  );
}
