// Team image assets
import alfaPoster from '@/assets/teams/alfa-poster.jpg';
import bravoPoster from '@/assets/teams/bravo-poster.png';
import charliePoster from '@/assets/teams/charlie-poster.jpg';
import deltaPoster from '@/assets/teams/delta-poster.jpg';
import panelsBg from '@/assets/teams/panels-bg.png';
import homeBackground from '@/assets/home-background.png';
import loginBackground from '@/assets/login-background.jpg';

export const teamPosters: Record<string, string> = {
  ALFA: alfaPoster,
  BRAVO: bravoPoster,
  CHARLIE: charliePoster,
  DELTA: deltaPoster,
};

export const teamColors: Record<string, { primary: string; secondary: string; glow: string }> = {
  ALFA: {
    primary: '#22c55e', // green
    secondary: '#166534',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  BRAVO: {
    primary: '#f97316', // orange
    secondary: '#c2410c',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  CHARLIE: {
    primary: '#3b82f6', // blue
    secondary: '#1d4ed8',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  DELTA: {
    primary: '#eab308', // yellow/gold
    secondary: '#a16207',
    glow: 'rgba(234, 179, 8, 0.4)',
  },
};

export const getTeamPoster = (team: string | null): string | null => {
  if (!team) return null;
  return teamPosters[team.toUpperCase()] || null;
};

export const getTeamColors = (team: string | null) => {
  if (!team) return teamColors.ALFA;
  return teamColors[team.toUpperCase()] || teamColors.ALFA;
};

export { panelsBg, homeBackground, loginBackground };
