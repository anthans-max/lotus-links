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
  created_at: string
}

export interface Season {
  id: string
  league_id: string
  name: string
  year: number
  created_at: string
}

export interface Tournament {
  id: string
  season_id: string | null
  name: string
  date: string
  course_name: string
  format: string          // e.g. 'scramble'
  status: 'draft' | 'active' | 'completed'
  pin?: string | null     // chaperone PIN
  created_at: string
}

export interface Hole {
  id: string
  tournament_id: string
  hole_number: number
  par: number
  yardage: number
}

export interface Player {
  id: string
  tournament_id: string
  name: string
  grade?: string | null
  created_at: string
}

export interface Group {
  id: string
  tournament_id: string
  name: string            // e.g. "Group 1"
  chaperone_name?: string | null
  pin: string             // 4-6 digit PIN for score entry
  starting_hole?: number | null
  created_at: string
}

export interface GroupPlayer {
  id: string
  group_id: string
  player_id: string
}

export interface Score {
  id: string
  tournament_id: string
  group_id: string
  hole_id: string
  strokes: number
  created_at: string
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
