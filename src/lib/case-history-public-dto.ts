import type { PublicCaseHistory, User } from "@/generated/prisma/client";

import { mediaUrlsFromDbJson } from "@/lib/case-history-validation";

type AuthorPick = Pick<User, "name">;

export type PublicCaseHistoryCard = {
  id: number;
  titleBn: string;
  summaryBn: string | null;
  posterImageUrl: string | null;
  animalKind: string | null;
  animalTypeLabelBn: string | null;
  areaBucket: string;
  publishedAt: string | null;
  doctorDisplayName: string;
  likeCount: number;
  commentCount: number;
};

export type PublicCaseHistoryDetail = PublicCaseHistoryCard & {
  problemSummaryBn: string;
  diagnosisSummaryBn: string | null;
  treatmentSummaryBn: string | null;
  resultSummaryBn: string | null;
  bodyBn: string | null;
  mediaUrls: string[];
};

export function toPublicCaseHistoryCard(
  row: Pick<
    PublicCaseHistory,
    | "id"
    | "titleBn"
    | "summaryBn"
    | "posterImageUrl"
    | "animalKind"
    | "animalTypeLabelBn"
    | "areaBucket"
    | "publishedAt"
    | "likeCount"
    | "commentCount"
  > & {
    authorDoctor: AuthorPick;
  },
): PublicCaseHistoryCard {
  return {
    id: row.id,
    titleBn: row.titleBn,
    summaryBn: row.summaryBn,
    posterImageUrl: row.posterImageUrl,
    animalKind: row.animalKind,
    animalTypeLabelBn: row.animalTypeLabelBn,
    areaBucket: row.areaBucket,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    doctorDisplayName: row.authorDoctor.name,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
  };
}

export function toPublicCaseHistoryDetail(
  row: Pick<
    PublicCaseHistory,
    | "id"
    | "titleBn"
    | "summaryBn"
    | "posterImageUrl"
    | "animalKind"
    | "animalTypeLabelBn"
    | "areaBucket"
    | "publishedAt"
    | "likeCount"
    | "commentCount"
    | "problemSummaryBn"
    | "diagnosisSummaryBn"
    | "treatmentSummaryBn"
    | "resultSummaryBn"
    | "bodyBn"
    | "mediaUrls"
  > & {
    authorDoctor: AuthorPick;
  },
): PublicCaseHistoryDetail {
  return {
    ...toPublicCaseHistoryCard(row),
    problemSummaryBn: row.problemSummaryBn,
    diagnosisSummaryBn: row.diagnosisSummaryBn,
    treatmentSummaryBn: row.treatmentSummaryBn,
    resultSummaryBn: row.resultSummaryBn,
    bodyBn: row.bodyBn,
    mediaUrls: mediaUrlsFromDbJson(row.mediaUrls),
  };
}
