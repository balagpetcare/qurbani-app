import type { TutorialRevision } from "@/generated/prisma/client";

import type { TutorialFieldsInput } from "@/lib/tutorial-validation";

export function tutorialRevisionToInput(rev: TutorialRevision): TutorialFieldsInput {
  return {
    titleBn: rev.titleBn,
    summaryBn: rev.summaryBn,
    bodyBn: rev.bodyBn,
    videoUrl: rev.videoUrl,
    posterImageUrl: rev.posterImageUrl,
    durationSec: rev.durationSec,
    mimeType: rev.mimeType,
    byteSize: rev.byteSize,
  };
}
