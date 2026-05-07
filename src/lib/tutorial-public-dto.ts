import type { Tutorial, TutorialRevision, User } from "@/generated/prisma/client";

type AuthorPick = Pick<User, "name">;

export type PublicTutorialCard = {
  id: number;
  titleBn: string;
  summaryBn: string | null;
  posterImageUrl: string | null;
  durationSec: number | null;
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;
  doctorDisplayName: string;
};

export type PublicTutorialDetail = PublicTutorialCard & {
  bodyBn: string | null;
  videoUrl: string;
  mimeType: string | null;
  byteSize: number | null;
};

export function toPublicTutorialCard(
  tutorial: Pick<Tutorial, "id" | "likeCount" | "commentCount" | "publishedAt"> & {
    author: AuthorPick;
    currentRevision: Pick<
      TutorialRevision,
      "titleBn" | "summaryBn" | "posterImageUrl" | "durationSec"
    > | null;
  },
): PublicTutorialCard {
  const rev = tutorial.currentRevision;
  return {
    id: tutorial.id,
    titleBn: rev?.titleBn ?? "",
    summaryBn: rev?.summaryBn ?? null,
    posterImageUrl: rev?.posterImageUrl ?? null,
    durationSec: rev?.durationSec ?? null,
    likeCount: tutorial.likeCount,
    commentCount: tutorial.commentCount,
    publishedAt: tutorial.publishedAt?.toISOString() ?? null,
    doctorDisplayName: tutorial.author.name,
  };
}

export function toPublicTutorialDetail(
  tutorial: Pick<Tutorial, "id" | "likeCount" | "commentCount" | "publishedAt"> & {
    author: AuthorPick;
    currentRevision: TutorialRevision | null;
  },
): PublicTutorialDetail {
  const base = toPublicTutorialCard(tutorial);
  const rev = tutorial.currentRevision;
  return {
    ...base,
    bodyBn: rev?.bodyBn ?? null,
    videoUrl: rev?.videoUrl ?? "",
    mimeType: rev?.mimeType ?? null,
    byteSize: rev?.byteSize ?? null,
  };
}
