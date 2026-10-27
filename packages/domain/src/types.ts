export type RecordStatus = "draft" | "available" | "sold" | "unavailable";

export interface DiscRecord {
  id: string;
  title: string | null;
  artist: string | null;
  priceCop: number | null;
  status: RecordStatus;
  notes: string | null;
  /** Photos and videos together. */
  mediaCount: number;
  updatedAt: string;
  deletedAt: string | null;
  /** Set by the database when the record is sold. */
  soldAt: string | null;
  facebookPostedAt: string | null;
  /** The Facebook post is out of date because the status changed after posting. */
  facebookNeedsUpdate: boolean;
}
