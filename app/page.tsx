"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Play,
  Fuel,
  Clock,
  MapPin,
  Sparkles,
  Monitor,
  Zap,
  Activity,
  Tractor,
  Wheat,
  Navigation,
  BarChart3,
  Timer,
  Target,
} from "lucide-react"
import { FieldVisualization } from "@/components/field-visualization"
import { TaskBar } from "@/components/task-bar"
import { BackgroundSelector } from "@/components/background-selector"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { toast } from "@/hooks/use-toast"

interface Field {
  id: number
  x: number
  y: number
  width: number
  height: number
}

interface MachineRoute {
  machineId: number
  path: Array<{ x: number; y: number; timestamp: number; action: string }>
  color: string
  supplyEvents: Array<{ time: number; duration: number }>
}

interface ScheduleResult {
  machines: MachineRoute[]
  totalTime: number
  efficiency: number
  totalSupplyEvents: number
  baseStation: { x: number; y: number }
  roadNetwork: Array<{ x: number; y: number }>
}

type Theme = "light" | "dark" | "gradient" | "nature"
type Background = "default" | "particles" | "waves" | "geometric" | "farm"

export default function FarmScheduler() {
  const [machineCount, setMachineCount] = useState(3)
  const [fieldCount, setFieldCount] = useState(4)
  const [fieldWidth, setFieldWidth] = useState(100)
  const [fieldHeight, setFieldHeight] = useState(80)
  const [gridCols, setGridCols] = useState(2)
  const [gridRows, setGridRows] = useState(2)
  const [customLayout, setCustomLayout] = useState("")
  const [layoutType, setLayoutType] = useState<"grid" | "custom">("grid")
  const [machineCapacity, setMachineCapacity] = useState(1.0)
  const [supplyDuration, setSupplyDuration] = useState(30)
  const [baseStation, setBaseStation] = useState<{ x: number; y: number } | null>(null)
  const [isSettingBaseStation, setIsSettingBaseStation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ScheduleResult | null>(null)

  // UI State
  const [theme, setTheme] = useState<Theme>("light")
  const [background, setBackground] = useState<Background>("default")
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // 快捷键处理
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "Enter":
            event.preventDefault()
            if (!isLoading) handleSchedule()
            break
          case "r":
            event.preventDefault()
            resetSchedule()
            break
          case "b":
            event.preventDefault()
            setIsSettingBaseStation(!isSettingBaseStation)
            break
          case "k":
            event.preventDefault()
            setShowKeyboardShortcuts(!showKeyboardShortcuts)
            break
          case "1":
            event.preventDefault()
            setTheme("light")
            break
          case "2":
            event.preventDefault()
            setTheme("dark")
            break
          case "3":
            event.preventDefault()
            setTheme("gradient")
            break
          case "4":
            event.preventDefault()
            setTheme("nature")
            break
        }
      }
    },
    [isLoading, isSettingBaseStation, showKeyboardShortcuts],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress)
    return () => document.removeEventListener("keydown", handleKeyPress)
  }, [handleKeyPress])

  // 主题样式
  const getThemeClasses = () => {
    switch (theme) {
      case "dark":
        return "bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white"
      case "gradient":
        return "bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 text-white"
      case "nature":
        return "bg-gradient-to-br from-green-800 via-emerald-700 to-teal-600 text-white"
      default:
        return "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900"
    }
  }

  const getCardClasses = () => {
    switch (theme) {
      case "dark":
        return "bg-gray-800/80 backdrop-blur-lg border-gray-700/50 text-white shadow-2xl"
      case "gradient":
        return "bg-white/10 backdrop-blur-lg border-white/20 text-white shadow-2xl"
      case "nature":
        return "bg-white/10 backdrop-blur-lg border-white/20 text-white shadow-2xl"
      default:
        return "bg-white/80 backdrop-blur-lg border-white/50 shadow-2xl"
    }
  }

  const generateGridFields = (): Field[] => {
    const fields: Field[] = []
    const spacing = 20

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (fields.length >= fieldCount) break
        fields.push({
          id: fields.length + 1,
          x: col * (fieldWidth + spacing),
          y: row * (fieldHeight + spacing),
          width: fieldWidth,
          height: fieldHeight,
        })
      }
    }
    return fields
  }

  const parseCustomLayout = (): Field[] => {
    try {
      const parsed = JSON.parse(customLayout)
      return parsed.map((field: any, index: number) => ({
        id: index + 1,
        x: field.x || 0,
        y: field.y || 0,
        width: field.width || fieldWidth,
        height: field.height || fieldHeight,
      }))
    } catch {
      return generateGridFields()
    }
  }

  const getCurrentFields = (): Field[] => {
    return layoutType === "grid" ? generateGridFields() : parseCustomLayout()
  }

  const calculateDefaultBaseStation = (fields: Field[]): { x: number; y: number } => {
    if (fields.length === 0) return { x: 0, y: 0 }

    const minX = Math.min(...fields.map((f) => f.x))
    const maxX = Math.max(...fields.map((f) => f.x + f.width))
    const minY = Math.min(...fields.map((f) => f.y))
    const maxY = Math.max(...fields.map((f) => f.y + f.height))

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    }
  }

  const handleMapClick = (clickPosition: { x: number; y: number }) => {
    if (isSettingBaseStation) {
      setBaseStation(clickPosition)
      setIsSettingBaseStation(false)
      toast({
        title: "🎯 基站位置已设置",
        description: `坐标: (${clickPosition.x.toFixed(1)}, ${clickPosition.y.toFixed(1)})`,
      })
    }
  }

  const handleSchedule = async () => {
    setIsLoading(true)
    setIsAnimating(true)

    try {
      const fields = getCurrentFields()

      if (fields.length === 0) {
        toast({
          title: "⚠️ 配置错误",
          description: "请先配置田地布局",
          variant: "destructive",
        })
        return
      }

      const finalBaseStation = baseStation || calculateDefaultBaseStation(fields)

      const requestData = {
        machineCount,
        fields,
        baseStation: finalBaseStation,
        parameters: {
          fieldWidth,
          fieldHeight,
          totalFields: fieldCount,
          machineCapacity,
          supplyDuration,
        },
      }

      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "调度计算失败")
      }

      const scheduleResult = await response.json()
      setResult(scheduleResult)

      toast({
        title: "🎉 调度计算完成",
        description: `成功规划 ${scheduleResult.machines.length} 台农机路径，效率 ${(scheduleResult.efficiency * 100).toFixed(1)}%`,
      })
    } catch (error) {
      toast({
        title: "❌ 计算失败",
        description: error instanceof Error ? error.message : "调度计算失败",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsAnimating(false)
    }
  }

  const resetSchedule = () => {
    setResult(null)
    toast({
      title: "🔄 已重置",
      description: "调度结果已清空",
    })
  }

  const resetBaseStation = () => {
    setBaseStation(null)
    setIsSettingBaseStation(false)
    toast({
      title: "📍 基站已重置",
      description: "基站位置已恢复默认",
    })
  }

  return (
    <div className={`min-h-screen transition-all duration-1000 ${getThemeClasses()}`}>
      {/* 背景特效 */}
      <BackgroundSelector background={background} />

      {/* 任务栏 */}
      <TaskBar
        theme={theme}
        onThemeChange={setTheme}
        background={background}
        onBackgroundChange={setBackground}
        onShowShortcuts={() => setShowKeyboardShortcuts(true)}
      />

      {/* 主要内容 */}
      <div className="pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* 标题区域 */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="relative">
                <Tractor className="w-12 h-12 text-green-500 animate-bounce" />
                <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                智能农机调度系统
              </h1>
              <div className="relative">
                <Wheat className="w-12 h-12 text-amber-500 animate-sway" />
                <Zap className="w-6 h-6 text-blue-400 absolute -top-2 -right-2 animate-ping" />
              </div>
            </div>
            <p className="text-xl opacity-80 font-medium">🚜 AI驱动的智能农机路径规划与田间道路调度平台 🌾</p>
            <div className="flex justify-center gap-2 mt-4">
              <Badge variant="secondary" className="animate-pulse">
                <Activity className="w-4 h-4 mr-1" />
                实时调度
              </Badge>
              <Badge variant="secondary" className="animate-pulse delay-100">
                <Navigation className="w-4 h-4 mr-1" />
                智能导航
              </Badge>
              <Badge variant="secondary" className="animate-pulse delay-200">
                <Target className="w-4 h-4 mr-1" />
                精准作业
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 参数配置面板 */}
            <div className="lg:col-span-1 space-y-6">
              {/* 基站配置卡片 */}
              <Card className={`${getCardClasses()} transform hover:scale-105 transition-all duration-300`}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      基站配置
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setIsSettingBaseStation(true)}
                      variant={isSettingBaseStation ? "default" : "outline"}
                      size="sm"
                      className={`flex-1 transition-all duration-300 ${
                        isSettingBaseStation
                          ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 animate-pulse"
                          : "hover:scale-105"
                      }`}
                    >
                      {isSettingBaseStation ? "🎯 点击地图设置" : "📍 设置基站位置"}
                    </Button>
                    <Button
                      onClick={resetBaseStation}
                      variant="outline"
                      size="sm"
                      className="hover:scale-105 transition-transform duration-200"
                    >
                      🔄
                    </Button>
                  </div>
                  {baseStation && (
                    <div className="p-3 rounded-lg bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 animate-fade-in">
                      <p className="text-sm font-medium">
                        📍 当前基站: ({baseStation.x.toFixed(1)}, {baseStation.y.toFixed(1)})
                      </p>
                    </div>
                  )}
                  {isSettingBaseStation && (
                    <div className="p-3 rounded-lg bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 animate-pulse">
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                        🎯 点击地图上的任意位置设置基站
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 农机配置卡片 */}
              <Card className={`${getCardClasses()} transform hover:scale-105 transition-all duration-300`}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                      <Fuel className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      农机配置
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="machineCount" className="flex items-center gap-2 font-medium">
                      <Tractor className="w-4 h-4" />
                      农机数量
                    </Label>
                    <Input
                      id="machineCount"
                      type="number"
                      min="1"
                      max="100"
                      value={machineCount}
                      onChange={(e) => setMachineCount(Number(e.target.value))}
                      className="transition-all duration-300 focus:scale-105 focus:shadow-lg"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="machineCapacity" className="flex items-center gap-2 font-medium">
                      <Fuel className="w-4 h-4" />
                      农机容量上限
                    </Label>
                    <Input
                      id="machineCapacity"
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={machineCapacity}
                      onChange={(e) => setMachineCapacity(Number(e.target.value))}
                      className="transition-all duration-300 focus:scale-105 focus:shadow-lg"
                    />
                    <p className="text-xs opacity-70 bg-gradient-to-r from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-800 p-2 rounded">
                      💡 1.0 = 可完成1个田地，1.5 = 可完成1个半田地
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="supplyDuration" className="flex items-center gap-2 font-medium">
                      <Timer className="w-4 h-4" />
                      补给时长 (分钟)
                    </Label>
                    <Input
                      id="supplyDuration"
                      type="number"
                      min="5"
                      max="120"
                      value={supplyDuration}
                      onChange={(e) => setSupplyDuration(Number(e.target.value))}
                      className="transition-all duration-300 focus:scale-105 focus:shadow-lg"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 田地配置卡片 */}
              <Card className={`${getCardClasses()} transform hover:scale-105 transition-all duration-300`}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                      <Wheat className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      田地配置
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fieldWidth" className="text-sm font-medium">
                        田地宽度 (m)
                      </Label>
                      <Input
                        id="fieldWidth"
                        type="number"
                        min="10"
                        value={fieldWidth}
                        onChange={(e) => setFieldWidth(Number(e.target.value))}
                        className="transition-all duration-300 focus:scale-105"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fieldHeight" className="text-sm font-medium">
                        田地高度 (m)
                      </Label>
                      <Input
                        id="fieldHeight"
                        type="number"
                        min="10"
                        value={fieldHeight}
                        onChange={(e) => setFieldHeight(Number(e.target.value))}
                        className="transition-all duration-300 focus:scale-105"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="fieldCount" className="flex items-center gap-2 font-medium">
                      <BarChart3 className="w-4 h-4" />
                      田地总数
                    </Label>
                    <Input
                      id="fieldCount"
                      type="number"
                      min="1"
                      max="100"
                      value={fieldCount}
                      onChange={(e) => setFieldCount(Number(e.target.value))}
                      className="transition-all duration-300 focus:scale-105"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="font-medium">布局方式</Label>
                    <Select value={layoutType} onValueChange={(value: "grid" | "custom") => setLayoutType(value)}>
                      <SelectTrigger className="transition-all duration-300 hover:scale-105">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">🔲 网格布局</SelectItem>
                        <SelectItem value="custom">⚙️ 自定义布局</SelectItem>
                      </SelectContent>
                    </Select>

                    {layoutType === "grid" && (
                      <div className="grid grid-cols-2 gap-4 animate-fade-in">
                        <div className="space-y-2">
                          <Label htmlFor="gridCols" className="text-sm">
                            网格列数
                          </Label>
                          <Input
                            id="gridCols"
                            type="number"
                            min="1"
                            max="5"
                            value={gridCols}
                            onChange={(e) => setGridCols(Number(e.target.value))}
                            className="transition-all duration-300 focus:scale-105"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gridRows" className="text-sm">
                            网格行数
                          </Label>
                          <Input
                            id="gridRows"
                            type="number"
                            min="1"
                            max="5"
                            value={gridRows}
                            onChange={(e) => setGridRows(Number(e.target.value))}
                            className="transition-all duration-300 focus:scale-105"
                          />
                        </div>
                      </div>
                    )}

                    {layoutType === "custom" && (
                      <div className="animate-fade-in">
                        <Label htmlFor="customLayout" className="text-sm font-medium">
                          自定义布局 (JSON)
                        </Label>
                        <Textarea
                          id="customLayout"
                          placeholder='[{"x": 0, "y": 0, "width": 100, "height": 80}, ...]'
                          value={customLayout}
                          onChange={(e) => setCustomLayout(e.target.value)}
                          rows={4}
                          className="transition-all duration-300 focus:scale-105 mt-2"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <div className="space-y-3">
                <Button
                  onClick={handleSchedule}
                  disabled={isLoading}
                  className={`w-full h-14 text-lg font-bold transition-all duration-500 transform hover:scale-105 ${
                    isLoading
                      ? "bg-gradient-to-r from-gray-400 to-gray-500"
                      : "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 shadow-lg hover:shadow-2xl"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />🧠 AI计算中...
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6 mr-3" />🚀 开始智能调度
                    </>
                  )}
                </Button>

                {result && (
                  <Button
                    onClick={resetSchedule}
                    variant="outline"
                    className="w-full h-12 transition-all duration-300 hover:scale-105 hover:bg-red-50 hover:border-red-300"
                  >
                    🔄 重置结果
                  </Button>
                )}
              </div>

              {/* 结果统计卡片 */}
              {result && (
                <Card
                  className={`${getCardClasses()} transform hover:scale-105 transition-all duration-300 animate-fade-in`}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        调度结果
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Tractor className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">农机数量</span>
                          </div>
                          <span className="text-2xl font-bold text-blue-600">{result.machines.length}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">预计时间</span>
                          </div>
                          <span className="text-2xl font-bold text-green-600">{result.totalTime.toFixed(1)}h</span>
                        </div>
                        <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Fuel className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium">补给次数</span>
                          </div>
                          <span className="text-2xl font-bold text-yellow-600">{result.totalSupplyEvents}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium">效率评分</span>
                          </div>
                          <span className="text-2xl font-bold text-purple-600">
                            {(result.efficiency * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 可视化区域 */}
            <div className="lg:col-span-2">
              <Card className={`${getCardClasses()} h-full transform hover:scale-[1.02] transition-all duration-300`}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
                      <Monitor className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      🗺️ 田地布局与路径可视化
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldVisualization
                    fields={getCurrentFields()}
                    machineRoutes={result?.machines || []}
                    roadNetwork={result?.roadNetwork || []}
                    baseStation={baseStation || calculateDefaultBaseStation(getCurrentFields())}
                    isSettingBaseStation={isSettingBaseStation}
                    onMapClick={handleMapClick}
                    theme={theme}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷键帮助 */}
      <KeyboardShortcuts isOpen={showKeyboardShortcuts} onClose={() => setShowKeyboardShortcuts(false)} theme={theme} />
    </div>
  )
}
