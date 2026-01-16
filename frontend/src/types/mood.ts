// frontend/src/types/mood.ts
export interface Mood {
  id: number;
  content: string;
  photo_url?: string | null | undefined;
  photo_public_id?: string;
  mood_vector: number; // 0.0 - 1.0
  mood_reason?: string;
  created_at: string;
}

export interface MoodCreatePayload {
  content: string;
  photo_url?: string;
  photo_public_id?: string;
}
