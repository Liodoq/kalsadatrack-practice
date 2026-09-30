export type ReportStatus = 'unfinished' | 'resumed' | 'reported_finished';
export type FlagReason = 'spam' | 'duplicate' | 'false' | 'inappropriate';

export interface City {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export interface Profile {
  id: string;
  display_name: string;
  is_admin: boolean;
  accepted_guidelines_at: string | null;
}

export interface ReportSummary {
  id: string;
  user_id: string;
  city_id: number;
  city_name: string;
  reporter_name: string;
  street: string;
  description: string | null;
  lat: number;
  lng: number;
  first_noticed: string;
  status: ReportStatus;
  is_verified: boolean;
  is_hidden: boolean;
  created_at: string;
  confirmation_count: number;
  confirmer_count: number;
  avg_rating: number | null;
  rating_count: number;
  cover_path: string | null;
}

export interface CityRanking {
  id: number;
  name: string;
  active_count: number;
  verified_count: number;
  total_count: number;
  avg_inconvenience: number | null;
}

export interface FlaggedReport {
  id: string;
  street: string;
  city_name: string;
  status: ReportStatus;
  is_hidden: boolean;
  is_verified: boolean;
  created_at: string;
  flag_count: number;
  reasons: FlagReason[];
  last_flagged_at: string;
}
