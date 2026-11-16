import {
  Apple, Banknote, Bed, Bike, BookOpen, Brain, Briefcase, Brush, Camera, Check, CigaretteOff, Code, Coffee,
  Droplets, Dumbbell, Flame, Footprints, Gamepad2, GraduationCap, Heart, HeartPulse, Home, Languages, Leaf,
  Moon, Mountain, Music, Notebook, PenLine, PersonStanding, Phone, PiggyBank, Pill, Salad, Smile, Sprout, Sun,
  Target, Timer, TreePine, Utensils, Wallet, Waves, type LucideIcon,
} from 'lucide-react'

/** Icons a habit can use. Keys are stored in user data, so never rename them. */
export const HABIT_ICONS: Record<string, LucideIcon> = {
  check: Check, droplets: Droplets, book: BookOpen, dumbbell: Dumbbell, footprints: Footprints,
  stretch: PersonStanding, bike: Bike, waves: Waves, mountain: Mountain, pulse: HeartPulse,
  heart: Heart, moon: Moon, bed: Bed, sun: Sun, apple: Apple, salad: Salad, utensils: Utensils,
  coffee: Coffee, pill: Pill, nosmoke: CigaretteOff, brain: Brain, languages: Languages,
  graduation: GraduationCap, pen: PenLine, notebook: Notebook, code: Code, briefcase: Briefcase,
  target: Target, timer: Timer, wallet: Wallet, piggy: PiggyBank, banknote: Banknote, leaf: Leaf,
  sprout: Sprout, tree: TreePine, music: Music, brush: Brush, camera: Camera, gamepad: Gamepad2,
  phone: Phone, home: Home, smile: Smile, flame: Flame,
}

export const habitIcon = (key: string): LucideIcon => HABIT_ICONS[key] ?? Check
