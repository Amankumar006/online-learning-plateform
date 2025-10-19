
"use client"

import * as React from "react"
import { Palette } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { AVAILABLE_THEMES, getThemeConfig } from "@/lib/themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isAnimating, setIsAnimating] = React.useState(false)
  
  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const cycleTheme = () => {
    if (isAnimating) return
    
    setIsAnimating(true)
    const currentIndex = AVAILABLE_THEMES.findIndex(t => t.name === theme)
    const nextIndex = (currentIndex + 1) % AVAILABLE_THEMES.length
    const nextTheme = AVAILABLE_THEMES[nextIndex]
    
    setTheme(nextTheme.name)
    
    // Reset animation state after transition
    setTimeout(() => setIsAnimating(false), 600)
  }

  if (!mounted) {
    // Show a generic icon during SSR and initial hydration
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        className="relative overflow-hidden"
      >
        <Palette className="h-[1.2rem] w-[1.2rem] transition-all" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const currentTheme = getThemeConfig(theme || "light")
  const CurrentIcon = currentTheme.icon

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        onClick={cycleTheme}
        aria-label={`Switch to next theme (current: ${currentTheme.label})`}
        className="relative overflow-hidden theme-toggle-button"
        disabled={isAnimating}
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 rounded-md"
          animate={{
            background: theme === "light" 
              ? "linear-gradient(135deg, hsl(var(--primary)/0.08), hsl(var(--accent)/0.08))"
              : theme === "dark"
              ? "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--accent)/0.15))"
              : "linear-gradient(135deg, hsl(var(--primary)/0.12), hsl(var(--accent)/0.12))"
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
        
        {/* Icon container with 3D rotation */}
        <div className="relative z-10 theme-toggle-icon">
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ 
                rotateY: -180, 
                scale: 0.6,
                opacity: 0,
                filter: "blur(4px)"
              }}
              animate={{ 
                rotateY: 0, 
                scale: 1,
                opacity: 1,
                filter: "blur(0px)"
              }}
              exit={{ 
                rotateY: 180, 
                scale: 0.6,
                opacity: 0,
                filter: "blur(4px)"
              }}
              transition={{ 
                duration: 0.5, 
                ease: [0.25, 0.46, 0.45, 0.94],
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              className="flex items-center justify-center"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <CurrentIcon className="h-[1.2rem] w-[1.2rem] transition-all duration-300" />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Click ripple effect */}
        <motion.div
          className="absolute inset-0 rounded-md pointer-events-none"
          initial={{ scale: 0, opacity: 0 }}
          animate={isAnimating ? { 
            scale: [0, 1.2, 1.8], 
            opacity: [0.4, 0.2, 0] 
          } : { 
            scale: 0, 
            opacity: 0 
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            background: "radial-gradient(circle, hsl(var(--primary)/0.4) 0%, hsl(var(--primary)/0.1) 50%, transparent 70%)"
          }}
        />

        {/* Hover glow */}
        <motion.div
          className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, hsl(var(--primary)/0.15) 0%, transparent 60%)",
            filter: "blur(8px)"
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />

        {/* Pulse effect during animation */}
        <motion.div
          className="absolute inset-0 rounded-md pointer-events-none"
          animate={isAnimating ? {
            boxShadow: [
              "0 0 0 0 hsl(var(--primary)/0.4)",
              "0 0 0 8px hsl(var(--primary)/0.1)",
              "0 0 0 12px hsl(var(--primary)/0)"
            ]
          } : {
            boxShadow: "0 0 0 0 hsl(var(--primary)/0)"
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />

        <span className="sr-only">
          Current theme: {currentTheme.label}. Click to cycle to next theme.
        </span>
      </Button>

      {/* Theme indicator dots */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5">
        {AVAILABLE_THEMES.map((themeOption, index) => (
          <motion.div
            key={themeOption.name}
            className="w-1.5 h-1.5 rounded-full"
            animate={{
              backgroundColor: theme === themeOption.name 
                ? "hsl(var(--primary))" 
                : "hsl(var(--muted-foreground)/0.25)",
              scale: theme === themeOption.name ? 1.3 : 1,
              boxShadow: theme === themeOption.name 
                ? "0 0 8px hsl(var(--primary)/0.5)" 
                : "none"
            }}
            transition={{ 
              duration: 0.4, 
              ease: "easeInOut",
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          />
        ))}
      </div>

      {/* Tooltip */}
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-md border shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all duration-200 ease-out translate-y-1 group-hover:translate-y-0 scale-95 group-hover:scale-100">
        {currentTheme.label}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover" />
      </div>
    </div>
  )
}
