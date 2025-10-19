import { BookOpen, Moon, Sun } from "lucide-react"

export interface ThemeConfig {
  name: string
  label: string
  icon: typeof Sun
  description: string
  editorTheme: 'light' | 'vs-dark'
}

export const AVAILABLE_THEMES: ThemeConfig[] = [
  {
    name: "light",
    label: "Light",
    icon: Sun,
    description: "Light theme for bright environments",
    editorTheme: "light"
  },
  {
    name: "dark", 
    label: "Dark",
    icon: Moon,
    description: "Dark theme for low-light environments",
    editorTheme: "vs-dark"
  },
  {
    name: "reading",
    label: "Reading Mode",
    icon: BookOpen,
    description: "Optimized for comfortable reading with warm colors",
    editorTheme: "light"
  }
] as const

export type ThemeName = typeof AVAILABLE_THEMES[number]['name']

export function getThemeConfig(themeName: string): ThemeConfig {
  return AVAILABLE_THEMES.find(theme => theme.name === themeName) || AVAILABLE_THEMES[0]
}

export function getEditorTheme(themeName: string): 'light' | 'vs-dark' {
  return getThemeConfig(themeName).editorTheme
}