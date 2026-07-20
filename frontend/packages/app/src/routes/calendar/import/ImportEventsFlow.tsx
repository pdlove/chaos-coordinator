import { useState } from "react";
import type { ExtractEventsResponse } from "@chaos-coordinator/core";
import { ImportDefaultsScreen } from "./ImportDefaultsScreen";
import { ImportReviewScreen } from "./ImportReviewScreen";

interface ImportEventsFlowProps {
  onClose: () => void;
}

type Step = { name: "defaults" } | { name: "review"; extraction: ExtractEventsResponse; images: File[] };

/** Step machine for the "create events from a photo" flow: pick defaults + submit a photo/pasted
 * text (both on ImportDefaultsScreen) → review/edit/confirm the extracted candidates. Mounted
 * from EventFormScreen's "New event" header. */
export function ImportEventsFlow({ onClose }: ImportEventsFlowProps) {
  const [step, setStep] = useState<Step>({ name: "defaults" });

  if (step.name === "defaults") {
    return (
      <ImportDefaultsScreen
        onCancel={onClose}
        onExtracted={(extraction, images) => setStep({ name: "review", extraction, images })}
      />
    );
  }

  return (
    <ImportReviewScreen
      extraction={step.extraction}
      sourceImages={step.images}
      onBack={() => setStep({ name: "defaults" })}
      onDone={onClose}
    />
  );
}
