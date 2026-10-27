export type RecordStatus = "draft" | "available" | "sold" | "unavailable";

export interface DiscRecord {
  id: string;
  title: string | null;
  artist: string | null;
  priceCop: number | null;
  status: RecordStatus;
  notes: string | null;
  photoCount: number;
  updatedAt: string;
  deletedAt: string | null;
}
