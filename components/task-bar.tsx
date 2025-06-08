"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Palette, Keyboard, Monitor, Sparkles, Zap, Cpu, Activity, Settings, Home } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

type Theme = "light" | "dark" | "gradient" | "nature"
type Background = "default" | "particles" | "waves" | "geometric" | "farm"

interface TaskBarProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
  background: Background
  onBackgroundChange: (background: Background) => void
  onShowShortcuts: () => void
}

export function TaskBar({ theme, onThemeChange, background, onBackgroundChange, onShowShortcuts }: TaskBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // 更新时间
  setInterval(() => {
    setCurrentTime(new Date())
  }, 1000)

  const getTaskBarClasses = () => {
    switch (theme) {
      case "dark":
        return "bg-gray-900/80 backdrop-blur-lg border-gray-700/50 text-white"
      case "gradient":
        return "bg-black/20 backdrop-blur-lg border-white/20 text-white"
      case "nature":
        return "bg-green-900/80 backdrop-blur-lg border-green-700/50 text-white"
      default:
        return "bg-white/80 backdrop-blur-lg border-gray-200/50 text-gray-900"
    }
  }

  const themeIcons = {
    light: Sun,
    dark: Moon,
    gradient: Sparkles,
    nature: Zap,
  }

  const backgroundIcons = {
    default: Monitor,
    particles: Sparkles,
    waves: Activity,
    geometric: Cpu,
    farm: Home,
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 h-16 ${getTaskBarClasses()} border-b transition-all duration-300`}>
      <div className="flex items-center justify-between h-full px-6">
        {/* 左侧 - Logo和标题 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">🚜</span>
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              智能农机调度
            </span>
          </div>
        </div>

        {/* 中间 - 状态指示器 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">系统运行中</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">实时监控</span>
          </div>
        </div>

        {/* 右侧 - 控制按钮和时间 */}
        <div className="flex items-center gap-4">
          {/* 主题切换 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:scale-110 transition-transform duration-200">
                {(() => {
                  const Icon = themeIcons[theme]
                  return <Icon className="w-5 h-5" />
                })()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onThemeChange("light")}>
                <Sun className="w-4 h-4 mr-2" />
                明亮主题
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onThemeChange("dark")}>
                <Moon className="w-4 h-4 mr-2" />
                深色主题
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onThemeChange("gradient")}>
                <Sparkles className="w-4 h-4 mr-2" />
                渐变主题
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onThemeChange("nature")}>
                <Zap className="w-4 h-4 mr-2" />
                自然主题
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 背景切换 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:scale-110 transition-transform duration-200">
                <Palette className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onBackgroundChange("default")}>
                <Monitor className="w-4 h-4 mr-2" />
                默认背景
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBackgroundChange("particles")}>
                <Sparkles className="w-4 h-4 mr-2" />
                粒子特效
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBackgroundChange("waves")}>
                <Activity className="w-4 h-4 mr-2" />
                波浪动画
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBackgroundChange("geometric")}>
                <Cpu className="w-4 h-4 mr-2" />
                几何图形
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBackgroundChange("farm")}>
                <Home className="w-4 h-4 mr-2" />
                农场主题
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 快捷键帮助 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowShortcuts}
            className="hover:scale-110 transition-transform duration-200"
          >
            <Keyboard className="w-5 h-5" />
          </Button>

          {/* 设置 */}
          <Button variant="ghost" size="sm" className="hover:scale-110 transition-transform duration-200">
            <Settings className="w-5 h-5" />
          </Button>

          <DropdownMenuSeparator />

          {/* 时间显示 */}
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold">
              {currentTime.toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-xs opacity-70">
              {currentTime.toLocaleDateString("zh-CN", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
