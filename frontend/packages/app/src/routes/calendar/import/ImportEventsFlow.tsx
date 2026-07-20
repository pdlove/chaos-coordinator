import { useState } from "react";
import type { ExtractEventsResponse } from "@chaos-coordinator/core";
import { ImportDefaultsScreen, type ImportDefaults } from "./ImportDefaultsScreen";
import { ImportCaptureScreen } from "./ImportCaptureScreen";
import { ImportReviewScreen } from "./ImportReviewScreen";

interface ImportEventsFlowProps {
  onClose: () => void;
}

type Step =
  | { name: "defaults" }
  | { name: "capture"; defaults: ImportDefaults }
  | { name: "review"; extraction: ExtractEventsResponse; images: File[] };

/** Step machine for the "create events from a photo" flow: pick defaults → submit a photo/pasted
 * text → review/edit/confirm the extracted candidates. Mounted from CalendarPage the same way
 * EventFormScreen/EventViewModal are. */
export function ImportEventsFlow({ onClose }: ImportEventsFlowProps) {
  const [step, setStep] = useState<Step>({ name: "defaults" });

  if (step.name === "defaults") {
    return <ImportDefaultsScreen onCancel={onClose} onNext={(defaults) => setStep({ name: "capture", defaults })} />;
  }

  if (step.name === "capture") {
    return (
      <ImportCaptureScreen
        defaults={step.defaults}
        onBack={() => setStep({ name: "defaults" })}
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
