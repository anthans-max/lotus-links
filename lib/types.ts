export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Database shape (matches Supabase schema) ────────────────────────────────

export interface Database {
  public: {
    Tables: {
      leagues: {
        Row: League
        Insert: Omit<League, 'id' | 'created_at'>
        Update: Partial<Omit<League, 'id' | 'created_at'>>
        Relationships: []
      }
      seasons: {
        Row: Season
        Insert: Omit<Season, 'id' | 'created_at'>
        Update: Partial<Omit<Season, 'id' | 'created_at'>>
        Relationships: []
      }
      tournaments: {
        Row: Tournament
        Insert: Omit<Tournament, 'id' | 'created_at'>
        Update: Partial<Omit<Tournament, 'id' | 'created_at'>>
        Relationships: []
      }
      holes: {
        Row: Hole
        Insert: Omit<Hole, 'id'>
        Update: Partial<Omit<Hole, 'id'>>
        Relationships: []
      }
      players: {
        Row: Player
        Insert: Omit<Player, 'id' | 'created_at'>
        Update: Partial<Omit<Player, 'id' | 'created_at'>>
        Relationships: []
      }
      groups: {
        Row: Group
        Insert: Omit<Group, 'id' | 'created_at'>
        Update: Partial<Omit<Group, 'id' | 'created_at'>>
        Relationships: []
      }
      group_players: {
        Row: GroupPlayer
        Insert: Omit<GroupPlayer, 'id'>
        Update: Partial<Omit<GroupPlayer, 'id'>>
        Relationships: []
      }
      pairing_preferences: {
        Row: PairingPreference
        Insert: Omit<PairingPreference, 'id' | 'created_at'>
        Update: Partial<Omit<PairingPreference, 'id' | 'created_at'>>
        Relationships: []
      }
      scores: {
        Row: Score
        Insert: Omit<Score, 'id' | 'created_at'>
        Update: Partial<Omit<Score, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// ─── Row types ────────────────────────────────────────────────────────────────

export interface League {
  id: string
  name: string
  admin_email: string
  logo_url: string | null
  primary_color: string
  league_type: string   // 'standard' | 'wish'
  created_at: string
  updated_at: string
}

export interface Season {
  id: string
  league_id: string
  name: string
  year: number
  start_date: string | null
  end_date: string | null
  points_system: string
  created_at: string
}

export interface Tournament {
  id: string
  league_id: string
  season_id: string | null
  name: string
  date: string
  course: string
  format: string
  holes: number
  status: 'upcoming' | 'active' | 'completed'
  course_source: string
  tournament_type: string
  login_required: boolean
  notes: string | null
  shotgun_start: boolean
  leaderboard_public: boolean
  public_token: string | null
  created_at: string
  // Handicap fields (added in migration 011)
  slope_rating: number | null
  course_rating: number | null
  // Configurable Stableford point values per outcome tier (null = use app defaults)
  stableford_points_config: {
    double_bogey_or_worse: number
    bogey: number
    par: number
    birdie: number
    eagle: number
    albatross: number
  } | null
  // Legacy alias — old code references course_name
  course_name?: string
  pin?: string | null
}

export interface Hole {
  id: string
  tournament_id: string
  hole_number: number
  par: number
  yardage: number | null
  handicap: number | null
}

export interface Player {
  id: string
  tournament_id: string
  name: string
  grade?: string | null
  handicap: number
  handicap_index: number | null
  skill_level: string | null
  status: 'pre-registered' | 'registered' | 'checked_in'
  player_email: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  willing_to_chaperone: boolean
  registration_comments: string | null
  registered_at: string | null
  created_at: string
}

export interface Group {
  id: string
  tournament_id: string
  name: string
  chaperone_name?: string | null
  chaperone_email?: string | null
  chaperone_phone?: string | null
  pin: string
  starting_hole: number
  tee_time: string | null
  current_hole: number
  status: 'not_started' | 'in_progress' | 'completed'
  created_at: string
}

export interface GroupPlayer {
  id: string
  group_id: string
  player_id: string
}

export interface PairingPreference {
  id: string
  tournament_id: string
  player_id: string
  preferred_player_id: string
  created_at: string
}

export interface Score {
  id: string
  tournament_id: string
  group_id: string | null
  player_id: string | null
  hole_number: number
  strokes: number
  entered_by: string | null
  submitted_at: string
  created_at?: string
}

// ─── Derived / UI types ───────────────────────────────────────────────────────

export interface LeaderboardEntry {
  group_id: string
  group_name: string
  chaperone_name: string | null
  total_strokes: number
  holes_completed: number
  score_to_par: number
}

export interface HoleWithScore extends Hole {
  score?: Score
}

export interface GroupWithPlayers extends Group {
  players: Player[]
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  created_at: string
}
