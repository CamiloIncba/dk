"use client";

import { Moon, Sun, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const THEMES = ["dark", "light", "dusk"] as const;
type ThemeName = (typeof THEMES)[number];

const themeConfig: Record<
  ThemeName,
  { icon: typeof Moon; label: string; iconClass: string }
> = {
  dark: { icon: Moon, label: "Modo Dark", iconClass: "text-muted-foreground" },
  light: { icon: Sun, label: "Modo Light", iconClass: "text-primary" },
  dusk: { icon: Palette, label: "Modo Dusk", iconClass: "text-primary" },
};

const POSITIONS = [
  "translate-x-1",
  "translate-x-[1.625rem]",
  "translate-x-[3rem]",
];

const LG_POSITIONS = [
  "translate-x-1.5",
  "translate-x-[2.125rem]",
  "translate-x-[3.75rem]",
];

interface ThemeToggleProps {
  size?: "sm" | "default";
  showLabel?: boolean;
}

export function ThemeToggle({ size = "default", showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (mounted ? theme : "dark") as ThemeName;
  const themeIndex = Math.max(0, THEMES.indexOf(currentTheme));

  const nextTheme = THEMES[(themeIndex + 1) % THEMES.length];

  const config = themeConfig[currentTheme] || themeConfig.dark;
  const nextConfig = themeConfig[nextTheme];
  const Icon = config.icon;

  const isSmall = size === "sm";
  const positions = isSmall ? POSITIONS : LG_POSITIONS;

  const toggle = (
    <button
      onClick={() => mounted && setTheme(nextTheme)}
      className={`relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
        isSmall ? "h-7 w-[4.5rem]" : "h-10 w-[5.75rem]"
      } ${
        currentTheme === "light" ? "bg-primary/25" : "bg-muted-foreground/40"
      }`}
      aria-label={`Cambiar a ${nextConfig.label}`}
      title={config.label}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          isSmall ? "h-5 w-5" : "h-7 w-7"
        } ${positions[themeIndex]}`}
      >
        <Icon className={`${isSmall ? "h-3 w-3" : "h-4 w-4"} ${config.iconClass}`} />
      </span>
    </button>
  );

  if (showLabel) {
    return (
      <div className="flex flex-col items-center gap-1">
        {toggle}
        <span className="text-[10px] text-muted-foreground leading-none">{config.label}</span>
      </div>
    );
  }

  return toggle;
}
