import { useState } from "react";
import type { ExtractBillPhotoResponse } from "@chaos-coordinator/core";
import { BillPhotoCaptureScreen } from "./BillPhotoCaptureScreen";
import { BillPhotoReviewScreen } from "./BillPhotoReviewScreen";

interface BillPhotoImportFlowProps {
  onClose: () => void;
}

type Step = { name: "capture" } | { name: "review"; extraction: ExtractBillPhotoResponse; images: File[] };

/** Step machine for the "scan a bill" flow: capture one or more photos of a single bill →
 * review the extracted fields, pick a match (or create new), and attach. Mounted from the
 * Bills page's "Scan a bill" button. */
export function BillPhotoImportFlow({ onClose }: BillPhotoImportFlowProps) {
  const [step, setStep] = useState<Step>({ name: "capture" });

  if (step.name === "capture") {
    return (
      <BillPhotoCaptureScreen
        onCancel={onClose}
        onExtracted={(extraction, images) => setStep({ name: "review", extraction, images })}
      />
    );
  }

  return (
    <BillPhotoReviewScreen
      extraction={step.extraction}
      sourceImages={step.images}
      onRetake={() => setStep({ name: "capture" })}
      onDone={onClose}
    />
  );
}
