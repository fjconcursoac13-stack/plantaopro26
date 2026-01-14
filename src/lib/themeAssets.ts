import { 
  Shield, Crosshair, Cpu, Award, Sun, Monitor, Flame, Snowflake, Radar, Eye, Moon,
  Radio, Siren, Lock, Target, Zap, Wifi, Activity, AlertTriangle, Anchor, 
  Aperture, ArrowUpRight, Atom, Battery, Bell, Biohazard, Bluetooth, Bomb, 
  BrainCircuit, Camera, ChevronRight, Circle, Cloud, Cog, Command, Compass, 
  Fingerprint, Focus, Globe, Grid3X3, Headphones, Heart, Home, Key, Layers, 
  LayoutGrid, Lightbulb, MapPin, MessageSquare, Mic, Navigation, Phone, Power,
  QrCode, Radio as RadioIcon, RefreshCw, Rocket, RotateCcw, Satellite, 
  ScanLine, Search, Send, Server, Settings, ShieldAlert, ShieldCheck, 
  Signal, Smartphone, Speaker, Star, Sword, Terminal, Timer, ToggleLeft, 
  Truck, Tv, Users, Video, Volume2, Watch, WifiOff, Wrench
} from 'lucide-react';
import type { ThemeType } from '@/contexts/ThemeContext';
import type { LucideIcon } from 'lucide-react';

export interface BackgroundEffect {
  type: 'particles' | 'grid' | 'radar' | 'matrix' | 'hexagons' | 'scanlines' | 'frost' | 'flames' | 'dots' | 'waves' | 'orbs';
  intensity: 'low' | 'medium' | 'high';
  primaryColor: string;
  secondaryColor?: string;
  animated: boolean;
  particleCount?: number;
  speed?: 'slow' | 'medium' | 'fast';
}

export interface ThemeAssets {
  mainIcon: LucideIcon;
  decorativeIcons: LucideIcon[];
  teamIcons: {
    ALFA: LucideIcon;
    BRAVO: LucideIcon;
    CHARLIE: LucideIcon;
    DELTA: LucideIcon;
  };
  teamColors: {
    ALFA: { color: string; bgGradient: string; borderColor: string; glowColor: string };
    BRAVO: { color: string; bgGradient: string; borderColor: string; glowColor: string };
    CHARLIE: { color: string; bgGradient: string; borderColor: string; glowColor: string };
    DELTA: { color: string; bgGradient: string; borderColor: string; glowColor: string };
  };
  teamDescriptions: {
    ALFA: { description: string; slogan: string };
    BRAVO: { description: string; slogan: string };
    CHARLIE: { description: string; slogan: string };
    DELTA: { description: string; slogan: string };
  };
  logoStyle: {
    gradient: string;
    textShadow: string;
  };
  subtitle: string;
  backgroundEffects: BackgroundEffect[];
  ambientGlow: {
    primary: string;
    secondary: string;
    tertiary?: string;
  };
  cornerAccents: {
    style: 'tactical' | 'tech' | 'military' | 'minimal' | 'frost' | 'flame' | 'none';
    color: string;
  };
}

export const themeAssets: Record<ThemeType, ThemeAssets> = {
  tactical: {
    mainIcon: Crosshair,
    decorativeIcons: [Radio, Siren, Lock],
    teamIcons: {
      ALFA: Shield,
      BRAVO: Sword,
      CHARLIE: Target,
      DELTA: Users,
    },
    teamColors: {
      ALFA: { color: 'text-amber-400', bgGradient: 'from-amber-900/80 via-amber-800/60 to-slate-900/90', borderColor: 'border-amber-500/60', glowColor: 'shadow-amber-500/30' },
      BRAVO: { color: 'text-orange-400', bgGradient: 'from-orange-900/80 via-orange-800/60 to-slate-900/90', borderColor: 'border-orange-500/60', glowColor: 'shadow-orange-500/30' },
      CHARLIE: { color: 'text-yellow-400', bgGradient: 'from-yellow-900/80 via-yellow-800/60 to-slate-900/90', borderColor: 'border-yellow-500/60', glowColor: 'shadow-yellow-500/30' },
      DELTA: { color: 'text-amber-300', bgGradient: 'from-amber-800/80 via-amber-700/60 to-slate-900/90', borderColor: 'border-amber-400/60', glowColor: 'shadow-amber-400/30' },
    },
    teamDescriptions: {
      ALFA: { description: 'Primeira Linha de Defesa', slogan: 'Alerta Máximo' },
      BRAVO: { description: 'Força de Resposta Rápida', slogan: 'Ação Imediata' },
      CHARLIE: { description: 'Operações Especializadas', slogan: 'Precisão Total' },
      DELTA: { description: 'Suporte e Coordenação', slogan: 'Visão Estratégica' },
    },
    logoStyle: {
      gradient: 'from-amber-400 via-orange-500 to-amber-400',
      textShadow: '0 0 30px rgba(251, 191, 36, 0.5)',
    },
    subtitle: 'Sistema Tático de Escalas',
    backgroundEffects: [
      { type: 'grid', intensity: 'medium', primaryColor: 'rgba(251, 191, 36, 0.15)', animated: true, speed: 'slow' },
      { type: 'scanlines', intensity: 'low', primaryColor: 'rgba(251, 191, 36, 0.4)', animated: true, speed: 'medium' },
      { type: 'particles', intensity: 'medium', primaryColor: 'rgba(251, 191, 36, 0.6)', animated: true, particleCount: 30, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(251, 191, 36, 0.15)', secondary: 'rgba(249, 115, 22, 0.1)', tertiary: 'rgba(234, 179, 8, 0.08)' },
    cornerAccents: { style: 'tactical', color: 'border-amber-500/30' },
  },
  military: {
    mainIcon: Shield,
    decorativeIcons: [Star, Compass, Anchor],
    teamIcons: {
      ALFA: ShieldCheck,
      BRAVO: Sword,
      CHARLIE: Anchor,
      DELTA: Compass,
    },
    teamColors: {
      ALFA: { color: 'text-green-400', bgGradient: 'from-green-900/80 via-green-800/60 to-slate-900/90', borderColor: 'border-green-500/60', glowColor: 'shadow-green-500/30' },
      BRAVO: { color: 'text-emerald-400', bgGradient: 'from-emerald-900/80 via-emerald-800/60 to-slate-900/90', borderColor: 'border-emerald-500/60', glowColor: 'shadow-emerald-500/30' },
      CHARLIE: { color: 'text-lime-400', bgGradient: 'from-lime-900/80 via-lime-800/60 to-slate-900/90', borderColor: 'border-lime-500/60', glowColor: 'shadow-lime-500/30' },
      DELTA: { color: 'text-teal-400', bgGradient: 'from-teal-900/80 via-teal-800/60 to-slate-900/90', borderColor: 'border-teal-500/60', glowColor: 'shadow-teal-500/30' },
    },
    teamDescriptions: {
      ALFA: { description: 'Pelotão Avançado', slogan: 'Honra e Dever' },
      BRAVO: { description: 'Força de Combate', slogan: 'Coragem e Força' },
      CHARLIE: { description: 'Unidade Naval', slogan: 'Mar e Terra' },
      DELTA: { description: 'Navegação Tática', slogan: 'Rumo Certo' },
    },
    logoStyle: {
      gradient: 'from-green-400 via-emerald-500 to-green-400',
      textShadow: '0 0 30px rgba(34, 197, 94, 0.5)',
    },
    subtitle: 'Sistema Militar de Escalas',
    backgroundEffects: [
      { type: 'radar', intensity: 'high', primaryColor: 'rgba(34, 197, 94, 0.4)', animated: true, speed: 'slow' },
      { type: 'dots', intensity: 'medium', primaryColor: 'rgba(34, 197, 94, 0.3)', animated: true, particleCount: 8, speed: 'medium' },
      { type: 'grid', intensity: 'low', primaryColor: 'rgba(34, 197, 94, 0.1)', animated: false },
    ],
    ambientGlow: { primary: 'rgba(34, 197, 94, 0.12)', secondary: 'rgba(16, 185, 129, 0.1)', tertiary: 'rgba(20, 184, 166, 0.08)' },
    cornerAccents: { style: 'military', color: 'border-green-500/30' },
  },
  cyber: {
    mainIcon: Cpu,
    decorativeIcons: [Zap, Wifi, BrainCircuit],
    teamIcons: {
      ALFA: Terminal,
      BRAVO: BrainCircuit,
      CHARLIE: QrCode,
      DELTA: Server,
    },
    teamColors: {
      ALFA: { color: 'text-cyan-400', bgGradient: 'from-cyan-900/80 via-cyan-800/60 to-slate-900/90', borderColor: 'border-cyan-500/60', glowColor: 'shadow-cyan-500/30' },
      BRAVO: { color: 'text-purple-400', bgGradient: 'from-purple-900/80 via-purple-800/60 to-slate-900/90', borderColor: 'border-purple-500/60', glowColor: 'shadow-purple-500/30' },
      CHARLIE: { color: 'text-pink-400', bgGradient: 'from-pink-900/80 via-pink-800/60 to-slate-900/90', borderColor: 'border-pink-500/60', glowColor: 'shadow-pink-500/30' },
      DELTA: { color: 'text-blue-400', bgGradient: 'from-blue-900/80 via-blue-800/60 to-slate-900/90', borderColor: 'border-blue-500/60', glowColor: 'shadow-blue-500/30' },
    },
    teamDescriptions: {
      ALFA: { description: 'Unidade de Sistemas', slogan: 'Código Ativo' },
      BRAVO: { description: 'Inteligência Artificial', slogan: 'Neural Link' },
      CHARLIE: { description: 'Criptografia Avançada', slogan: 'Zero Breach' },
      DELTA: { description: 'Infraestrutura Core', slogan: 'Uptime 100%' },
    },
    logoStyle: {
      gradient: 'from-cyan-400 via-purple-500 to-pink-400',
      textShadow: '0 0 30px rgba(6, 182, 212, 0.5)',
    },
    subtitle: 'Sistema Cyber de Operações',
    backgroundEffects: [
      { type: 'matrix', intensity: 'high', primaryColor: 'rgba(6, 182, 212, 0.5)', animated: true, speed: 'fast' },
      { type: 'hexagons', intensity: 'medium', primaryColor: 'rgba(168, 85, 247, 0.2)', animated: false },
      { type: 'particles', intensity: 'high', primaryColor: 'rgba(236, 72, 153, 0.5)', secondaryColor: 'rgba(6, 182, 212, 0.5)', animated: true, particleCount: 50, speed: 'fast' },
    ],
    ambientGlow: { primary: 'rgba(6, 182, 212, 0.15)', secondary: 'rgba(168, 85, 247, 0.12)', tertiary: 'rgba(236, 72, 153, 0.1)' },
    cornerAccents: { style: 'tech', color: 'border-cyan-500/40' },
  },
  classic: {
    mainIcon: Award,
    decorativeIcons: [Star, Key, ShieldCheck],
    teamIcons: {
      ALFA: ShieldCheck,
      BRAVO: Star,
      CHARLIE: Award,
      DELTA: Key,
    },
    teamColors: {
      ALFA: { color: 'text-blue-400', bgGradient: 'from-blue-900/80 via-blue-800/60 to-slate-900/90', borderColor: 'border-blue-500/60', glowColor: 'shadow-blue-500/30' },
      BRAVO: { color: 'text-indigo-400', bgGradient: 'from-indigo-900/80 via-indigo-800/60 to-slate-900/90', borderColor: 'border-indigo-500/60', glowColor: 'shadow-indigo-500/30' },
      CHARLIE: { color: 'text-sky-400', bgGradient: 'from-sky-900/80 via-sky-800/60 to-slate-900/90', borderColor: 'border-sky-500/60', glowColor: 'shadow-sky-500/30' },
      DELTA: { color: 'text-violet-400', bgGradient: 'from-violet-900/80 via-violet-800/60 to-slate-900/90', borderColor: 'border-violet-500/60', glowColor: 'shadow-violet-500/30' },
    },
    teamDescriptions: {
      ALFA: { description: 'Proteção Institucional', slogan: 'Tradição e Honra' },
      BRAVO: { description: 'Excelência Operacional', slogan: 'Padrão Ouro' },
      CHARLIE: { description: 'Reconhecimento de Elite', slogan: 'Mérito Máximo' },
      DELTA: { description: 'Acesso Controlado', slogan: 'Segurança Total' },
    },
    logoStyle: {
      gradient: 'from-blue-400 via-indigo-500 to-blue-400',
      textShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
    },
    subtitle: 'Sistema Institucional de Escalas',
    backgroundEffects: [
      { type: 'dots', intensity: 'low', primaryColor: 'rgba(59, 130, 246, 0.2)', animated: false },
      { type: 'waves', intensity: 'low', primaryColor: 'rgba(99, 102, 241, 0.15)', animated: true, speed: 'slow' },
      { type: 'orbs', intensity: 'medium', primaryColor: 'rgba(59, 130, 246, 0.1)', animated: true, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(59, 130, 246, 0.12)', secondary: 'rgba(99, 102, 241, 0.1)' },
    cornerAccents: { style: 'minimal', color: 'border-blue-500/20' },
  },
  crimson: {
    mainIcon: Flame,
    decorativeIcons: [AlertTriangle, Bomb, Biohazard],
    teamIcons: {
      ALFA: Flame,
      BRAVO: Bomb,
      CHARLIE: AlertTriangle,
      DELTA: Biohazard,
    },
    teamColors: {
      ALFA: { color: 'text-red-400', bgGradient: 'from-red-900/80 via-red-800/60 to-slate-900/90', borderColor: 'border-red-500/60', glowColor: 'shadow-red-500/30' },
      BRAVO: { color: 'text-orange-500', bgGradient: 'from-orange-900/80 via-orange-800/60 to-slate-900/90', borderColor: 'border-orange-500/60', glowColor: 'shadow-orange-500/30' },
      CHARLIE: { color: 'text-yellow-500', bgGradient: 'from-yellow-900/80 via-red-800/60 to-slate-900/90', borderColor: 'border-yellow-500/60', glowColor: 'shadow-yellow-500/30' },
      DELTA: { color: 'text-rose-400', bgGradient: 'from-rose-900/80 via-rose-800/60 to-slate-900/90', borderColor: 'border-rose-500/60', glowColor: 'shadow-rose-500/30' },
    },
    teamDescriptions: {
      ALFA: { description: 'Força de Choque', slogan: 'Fogo e Fúria' },
      BRAVO: { description: 'Esquadrão Explosivo', slogan: 'Impacto Máximo' },
      CHARLIE: { description: 'Resposta de Crise', slogan: 'Alerta Vermelho' },
      DELTA: { description: 'Contenção Especial', slogan: 'Zona de Risco' },
    },
    logoStyle: {
      gradient: 'from-red-400 via-orange-500 to-red-400',
      textShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
    },
    subtitle: 'Sistema de Força Especial',
    backgroundEffects: [
      { type: 'flames', intensity: 'high', primaryColor: 'rgba(239, 68, 68, 0.4)', secondaryColor: 'rgba(249, 115, 22, 0.3)', animated: true, speed: 'fast' },
      { type: 'particles', intensity: 'high', primaryColor: 'rgba(239, 68, 68, 0.6)', animated: true, particleCount: 40, speed: 'fast' },
      { type: 'scanlines', intensity: 'medium', primaryColor: 'rgba(239, 68, 68, 0.5)', animated: true, speed: 'fast' },
    ],
    ambientGlow: { primary: 'rgba(239, 68, 68, 0.18)', secondary: 'rgba(249, 115, 22, 0.15)', tertiary: 'rgba(234, 179, 8, 0.1)' },
    cornerAccents: { style: 'flame', color: 'border-red-500/40' },
  },
  arctic: {
    mainIcon: Snowflake,
    decorativeIcons: [Cloud, Compass, Navigation],
    teamIcons: {
      ALFA: Snowflake,
      BRAVO: Navigation,
      CHARLIE: Compass,
      DELTA: Cloud,
    },
    teamColors: {
      ALFA: { color: 'text-sky-400', bgGradient: 'from-sky-900/80 via-sky-800/60 to-slate-900/90', borderColor: 'border-sky-500/60', glowColor: 'shadow-sky-500/30' },
      BRAVO: { color: 'text-cyan-400', bgGradient: 'from-cyan-900/80 via-cyan-800/60 to-slate-900/90', borderColor: 'border-cyan-500/60', glowColor: 'shadow-cyan-500/30' },
      CHARLIE: { color: 'text-teal-400', bgGradient: 'from-teal-900/80 via-teal-800/60 to-slate-900/90', borderColor: 'border-teal-500/60', glowColor: 'shadow-teal-500/30' },
      DELTA: { color: 'text-blue-300', bgGradient: 'from-blue-800/80 via-blue-700/60 to-slate-900/90', borderColor: 'border-blue-400/60', glowColor: 'shadow-blue-400/30' },
    },
    teamDescriptions: {
      ALFA: { description: 'Operações Árticas', slogan: 'Gelo e Precisão' },
      BRAVO: { description: 'Navegação Polar', slogan: 'Norte Verdadeiro' },
      CHARLIE: { description: 'Orientação Extrema', slogan: 'Rumo Glacial' },
      DELTA: { description: 'Cobertura Aérea', slogan: 'Tempestade Branca' },
    },
    logoStyle: {
      gradient: 'from-sky-400 via-cyan-500 to-sky-400',
      textShadow: '0 0 30px rgba(56, 189, 248, 0.5)',
    },
    subtitle: 'Sistema Ártico de Operações',
    backgroundEffects: [
      { type: 'frost', intensity: 'high', primaryColor: 'rgba(56, 189, 248, 0.3)', secondaryColor: 'rgba(6, 182, 212, 0.2)', animated: true, speed: 'slow' },
      { type: 'particles', intensity: 'high', primaryColor: 'rgba(255, 255, 255, 0.8)', animated: true, particleCount: 60, speed: 'slow' },
      { type: 'orbs', intensity: 'medium', primaryColor: 'rgba(56, 189, 248, 0.15)', animated: true, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(56, 189, 248, 0.15)', secondary: 'rgba(6, 182, 212, 0.12)', tertiary: 'rgba(255, 255, 255, 0.08)' },
    cornerAccents: { style: 'frost', color: 'border-sky-400/30' },
  },
  stealth: {
    mainIcon: Eye,
    decorativeIcons: [Moon, Focus, ScanLine],
    teamIcons: {
      ALFA: Eye,
      BRAVO: Focus,
      CHARLIE: ScanLine,
      DELTA: Moon,
    },
    teamColors: {
      ALFA: { color: 'text-purple-400', bgGradient: 'from-purple-900/80 via-purple-800/60 to-slate-950/95', borderColor: 'border-purple-500/40', glowColor: 'shadow-purple-500/20' },
      BRAVO: { color: 'text-violet-400', bgGradient: 'from-violet-900/80 via-violet-800/60 to-slate-950/95', borderColor: 'border-violet-500/40', glowColor: 'shadow-violet-500/20' },
      CHARLIE: { color: 'text-indigo-400', bgGradient: 'from-indigo-900/80 via-indigo-800/60 to-slate-950/95', borderColor: 'border-indigo-500/40', glowColor: 'shadow-indigo-500/20' },
      DELTA: { color: 'text-fuchsia-400', bgGradient: 'from-fuchsia-900/80 via-fuchsia-800/60 to-slate-950/95', borderColor: 'border-fuchsia-500/40', glowColor: 'shadow-fuchsia-500/20' },
    },
    teamDescriptions: {
      ALFA: { description: 'Vigilância Silenciosa', slogan: 'Olhos na Sombra' },
      BRAVO: { description: 'Foco Noturno', slogan: 'Visão Perfeita' },
      CHARLIE: { description: 'Varredura Furtiva', slogan: 'Detectar Invisível' },
      DELTA: { description: 'Operações Lunares', slogan: 'Sob a Lua' },
    },
    logoStyle: {
      gradient: 'from-purple-400 via-violet-500 to-purple-400',
      textShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
    },
    subtitle: 'Sistema Furtivo de Operações',
    backgroundEffects: [
      { type: 'scanlines', intensity: 'low', primaryColor: 'rgba(139, 92, 246, 0.15)', animated: false },
      { type: 'orbs', intensity: 'low', primaryColor: 'rgba(139, 92, 246, 0.08)', secondaryColor: 'rgba(192, 132, 252, 0.06)', animated: true, speed: 'slow' },
      { type: 'particles', intensity: 'low', primaryColor: 'rgba(139, 92, 246, 0.3)', animated: true, particleCount: 15, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(139, 92, 246, 0.08)', secondary: 'rgba(192, 132, 252, 0.06)' },
    cornerAccents: { style: 'minimal', color: 'border-purple-500/20' },
  },
  sentinel: {
    mainIcon: Radar,
    decorativeIcons: [Signal, Satellite, Activity],
    teamIcons: {
      ALFA: Radar,
      BRAVO: Signal,
      CHARLIE: Satellite,
      DELTA: Activity,
    },
    teamColors: {
      ALFA: { color: 'text-green-400', bgGradient: 'from-green-900/80 via-green-800/60 to-black/95', borderColor: 'border-green-500/60', glowColor: 'shadow-green-500/40' },
      BRAVO: { color: 'text-lime-400', bgGradient: 'from-lime-900/80 via-lime-800/60 to-black/95', borderColor: 'border-lime-500/60', glowColor: 'shadow-lime-500/40' },
      CHARLIE: { color: 'text-emerald-400', bgGradient: 'from-emerald-900/80 via-emerald-800/60 to-black/95', borderColor: 'border-emerald-500/60', glowColor: 'shadow-emerald-500/40' },
      DELTA: { color: 'text-teal-400', bgGradient: 'from-teal-900/80 via-teal-800/60 to-black/95', borderColor: 'border-teal-500/60', glowColor: 'shadow-teal-500/40' },
    },
    teamDescriptions: {
      ALFA: { description: 'Radar Principal', slogan: 'Detecção Total' },
      BRAVO: { description: 'Transmissão de Sinal', slogan: 'Comunicação Ativa' },
      CHARLIE: { description: 'Vigilância Orbital', slogan: 'Olho no Céu' },
      DELTA: { description: 'Monitor de Atividade', slogan: 'Pulso Constante' },
    },
    logoStyle: {
      gradient: 'from-green-400 via-lime-500 to-green-400',
      textShadow: '0 0 40px rgba(34, 197, 94, 0.7)',
    },
    subtitle: 'Sistema Sentinela de Vigilância',
    backgroundEffects: [
      { type: 'radar', intensity: 'high', primaryColor: 'rgba(34, 197, 94, 0.5)', animated: true, speed: 'medium' },
      { type: 'grid', intensity: 'low', primaryColor: 'rgba(34, 197, 94, 0.15)', animated: false },
      { type: 'dots', intensity: 'high', primaryColor: 'rgba(34, 197, 94, 0.8)', animated: true, particleCount: 8, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(34, 197, 94, 0.15)', secondary: 'rgba(132, 204, 22, 0.12)', tertiary: 'rgba(16, 185, 129, 0.1)' },
    cornerAccents: { style: 'tech', color: 'border-green-500/40' },
  },
  nightops: {
    mainIcon: Moon,
    decorativeIcons: [Eye, Lock, Focus],
    teamIcons: {
      ALFA: Eye,
      BRAVO: Lock,
      CHARLIE: Focus,
      DELTA: Moon,
    },
    teamColors: {
      ALFA: { color: 'text-gray-300', bgGradient: 'from-gray-900/80 via-gray-800/60 to-black/95', borderColor: 'border-gray-500/30', glowColor: 'shadow-gray-500/10' },
      BRAVO: { color: 'text-slate-300', bgGradient: 'from-slate-900/80 via-slate-800/60 to-black/95', borderColor: 'border-slate-500/30', glowColor: 'shadow-slate-500/10' },
      CHARLIE: { color: 'text-zinc-300', bgGradient: 'from-zinc-900/80 via-zinc-800/60 to-black/95', borderColor: 'border-zinc-500/30', glowColor: 'shadow-zinc-500/10' },
      DELTA: { color: 'text-neutral-300', bgGradient: 'from-neutral-900/80 via-neutral-800/60 to-black/95', borderColor: 'border-neutral-500/30', glowColor: 'shadow-neutral-500/10' },
    },
    teamDescriptions: {
      ALFA: { description: 'Visão Noturna', slogan: 'Olhos na Escuridão' },
      BRAVO: { description: 'Segurança Silenciosa', slogan: 'Bloqueio Total' },
      CHARLIE: { description: 'Foco Discreto', slogan: 'Precisão Muda' },
      DELTA: { description: 'Operações Lunares', slogan: 'Sombra da Lua' },
    },
    logoStyle: {
      gradient: 'from-gray-300 via-slate-400 to-gray-300',
      textShadow: '0 0 10px rgba(150, 150, 150, 0.3)',
    },
    subtitle: 'Sistema de Operações Noturnas',
    backgroundEffects: [
      { type: 'scanlines', intensity: 'low', primaryColor: 'rgba(100, 100, 100, 0.08)', animated: false },
      { type: 'dots', intensity: 'low', primaryColor: 'rgba(150, 150, 150, 0.05)', animated: false },
    ],
    ambientGlow: { primary: 'rgba(100, 100, 100, 0.05)', secondary: 'rgba(80, 80, 80, 0.03)' },
    cornerAccents: { style: 'none', color: 'border-gray-600/10' },
  },
  light: {
    mainIcon: Sun,
    decorativeIcons: [Globe, Home, Heart],
    teamIcons: {
      ALFA: ShieldCheck,
      BRAVO: Star,
      CHARLIE: Award,
      DELTA: Users,
    },
    teamColors: {
      ALFA: { color: 'text-blue-600', bgGradient: 'from-blue-100 via-blue-50 to-white', borderColor: 'border-blue-300', glowColor: 'shadow-blue-200/50' },
      BRAVO: { color: 'text-indigo-600', bgGradient: 'from-indigo-100 via-indigo-50 to-white', borderColor: 'border-indigo-300', glowColor: 'shadow-indigo-200/50' },
      CHARLIE: { color: 'text-sky-600', bgGradient: 'from-sky-100 via-sky-50 to-white', borderColor: 'border-sky-300', glowColor: 'shadow-sky-200/50' },
      DELTA: { color: 'text-violet-600', bgGradient: 'from-violet-100 via-violet-50 to-white', borderColor: 'border-violet-300', glowColor: 'shadow-violet-200/50' },
    },
    teamDescriptions: {
      ALFA: { description: 'Proteção Diurna', slogan: 'Clareza e Segurança' },
      BRAVO: { description: 'Excelência Visível', slogan: 'Brilho Constante' },
      CHARLIE: { description: 'Céu Aberto', slogan: 'Horizonte Limpo' },
      DELTA: { description: 'União da Equipe', slogan: 'Força Coletiva' },
    },
    logoStyle: {
      gradient: 'from-blue-600 via-indigo-600 to-blue-600',
      textShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
    },
    subtitle: 'Sistema Profissional de Escalas',
    backgroundEffects: [
      { type: 'dots', intensity: 'low', primaryColor: 'rgba(59, 130, 246, 0.1)', animated: false },
      { type: 'orbs', intensity: 'low', primaryColor: 'rgba(59, 130, 246, 0.08)', secondaryColor: 'rgba(99, 102, 241, 0.06)', animated: true, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(59, 130, 246, 0.08)', secondary: 'rgba(99, 102, 241, 0.06)' },
    cornerAccents: { style: 'none', color: 'border-blue-200/30' },
  },
  system: {
    mainIcon: Monitor,
    decorativeIcons: [Settings, Cog, RefreshCw],
    teamIcons: {
      ALFA: Shield,
      BRAVO: Sword,
      CHARLIE: Target,
      DELTA: Users,
    },
    teamColors: {
      ALFA: { color: 'text-blue-400', bgGradient: 'from-blue-900/80 via-blue-800/60 to-slate-900/90', borderColor: 'border-blue-500/60', glowColor: 'shadow-blue-500/30' },
      BRAVO: { color: 'text-red-400', bgGradient: 'from-red-900/80 via-red-800/60 to-slate-900/90', borderColor: 'border-red-500/60', glowColor: 'shadow-red-500/30' },
      CHARLIE: { color: 'text-green-400', bgGradient: 'from-green-900/80 via-green-800/60 to-slate-900/90', borderColor: 'border-green-500/60', glowColor: 'shadow-green-500/30' },
      DELTA: { color: 'text-purple-400', bgGradient: 'from-purple-900/80 via-purple-800/60 to-slate-900/90', borderColor: 'border-purple-500/60', glowColor: 'shadow-purple-500/30' },
    },
    teamDescriptions: {
      ALFA: { description: 'Primeira Linha de Defesa', slogan: 'Proteção e Vigilância' },
      BRAVO: { description: 'Força de Resposta Rápida', slogan: 'Ação e Determinação' },
      CHARLIE: { description: 'Operações Especializadas', slogan: 'Precisão e Eficiência' },
      DELTA: { description: 'Suporte e Coordenação', slogan: 'União e Estratégia' },
    },
    logoStyle: {
      gradient: 'from-primary via-accent to-primary',
      textShadow: '0 0 30px hsl(var(--primary) / 0.5)',
    },
    subtitle: 'Sistema Automático de Escalas',
    backgroundEffects: [
      { type: 'grid', intensity: 'low', primaryColor: 'rgba(100, 100, 100, 0.1)', animated: false },
      { type: 'particles', intensity: 'medium', primaryColor: 'rgba(100, 100, 100, 0.3)', animated: true, particleCount: 25, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(100, 100, 100, 0.1)', secondary: 'rgba(80, 80, 80, 0.08)' },
    cornerAccents: { style: 'minimal', color: 'border-gray-500/20' },
  },
};

export function getThemeAssets(theme: ThemeType, resolvedTheme: Exclude<ThemeType, 'system'>): ThemeAssets {
  if (theme === 'system') {
    return themeAssets[resolvedTheme];
  }
  return themeAssets[theme];
}
