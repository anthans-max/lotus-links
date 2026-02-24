// Leaderboard requires a tournament ID — redirect to home if accessed without one
import { redirect } from 'next/navigation'

export default function LeaderboardPage() {
  redirect('/')
}
