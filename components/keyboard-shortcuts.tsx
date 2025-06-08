"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Keyboard, Zap, Palette, Play, MapPin } from "lucide-react"

type Theme = "light" | "dark" | "gradient" | "nature"

interface KeyboardShortcutsProps {
  isOpen: boolean
  onClose: () => void
  theme: Theme
}

export function KeyboardShortcuts({ isOpen, onClose, theme }: KeyboardShortcutsProps) {
  const getDialogClasses = () => {
    switch (theme) {
      case "dark":
        return "bg-gray-800 border-gray-700 text-white"
      case "gradient":
        return "bg-purple-900/90 backdrop-blur-lg border-purple-700 text-white"
      case "nature":
        return "bg-green-900/90 backdrop-blur-lg border-green-700 text-white"
      default:
        return "bg-white border-gray-200"
    }
  }

  const shortcuts = [
    {
      category: "调度控制",
      icon: <Play className="w-4 h-4" />,
      items: [
        { keys: ["Ctrl", "Enter"], description: "开始调度计算" },
        { keys: ["Ctrl", "R"], description: "重置调度结果" },
      ],
    },
    {
      category: "基站设置",
      icon: <MapPin className="w-4 h-4" />,
      items: [{ keys: ["Ctrl", "B"], description: "切换基站设置模式" }],
    },
    {
      category: "主题切换",
      icon: <Palette className="w-4 h-4" />,
      items: [
        { keys: ["Ctrl", "1"], description: "明亮主题" },
        { keys: ["Ctrl", "2"], description: "深色主题" },
        { keys: ["Ctrl", "3"], description: "渐变主题" },
        { keys: ["Ctrl", "4"], description: "自然主题" },
      ],
    },
    {
      category: "帮助",
      icon: <Keyboard className="w-4 h-4" />,
      items: [{ keys: ["Ctrl", "K"], description: "显示/隐藏快捷键帮助" }],
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl ${getDialogClasses()}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
              <Keyboard className="w-6 h-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ⌨️ 快捷键指南
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {shortcuts.map((category, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold">
                {category.icon}
                <span>{category.category}</span>
              </div>

              <div className="space-y-2 ml-6">
                {category.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <span className="text-sm">{item.description}</span>
                    <div className="flex gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <Badge
                          key={keyIndex}
                          variant="secondary"
                          className="px-2 py-1 text-xs font-mono bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-600">💡 提示</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            使用快捷键可以大大提高操作效率！所有快捷键都支持 Cmd（Mac）或 Ctrl（Windows/Linux）。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
