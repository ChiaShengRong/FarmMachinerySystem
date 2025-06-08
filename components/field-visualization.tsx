"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, RotateCcw, Clock, Grid, Route, Zap, Activity } from "lucide-react"

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

type Theme = "light" | "dark" | "gradient" | "nature"

interface FieldVisualizationProps {
  fields: Field[]
  machineRoutes: MachineRoute[]
  roadNetwork?: Array<{ x: number; y: number }>
  baseStation: { x: number; y: number }
  isSettingBaseStation?: boolean
  onMapClick?: (position: { x: number; y: number }) => void
  theme?: Theme
}

export function FieldVisualization({
  fields,
  machineRoutes,
  roadNetwork = [],
  baseStation,
  isSettingBaseStation = false,
  onMapClick,
  theme = "light",
}: FieldVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [maxTime, setMaxTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  const [showRoads, setShowRoads] = useState(true)

  const canvasWidth = 800
  const canvasHeight = 600
  const padding = 50
  const gridSize = 10

  // 主题相关的颜色配置
  const getThemeColors = () => {
    switch (theme) {
      case "dark":
        return {
          background: "#1f2937",
          grid: "#374151",
          field: "#10b981",
          fieldBorder: "#065f46",
          text: "#ffffff",
          road: "#6b7280",
        }
      case "gradient":
        return {
          background: "rgba(139, 92, 246, 0.1)",
          grid: "rgba(255, 255, 255, 0.2)",
          field: "#8b5cf6",
          fieldBorder: "#6d28d9",
          text: "#ffffff",
          road: "#a855f7",
        }
      case "nature":
        return {
          background: "rgba(34, 197, 94, 0.1)",
          grid: "rgba(255, 255, 255, 0.2)",
          field: "#22c55e",
          fieldBorder: "#16a34a",
          text: "#ffffff",
          road: "#4ade80",
        }
      default:
        return {
          background: "#f8fafc",
          grid: "#e5e7eb",
          field: "#10b981",
          fieldBorder: "#065f46",
          text: "#1f2937",
          road: "#9ca3af",
        }
    }
  }

  useEffect(() => {
    if (machineRoutes.length > 0) {
      const maxTimestamp = Math.max(...machineRoutes.flatMap((route) => route.path.map((point) => point.timestamp)))
      setMaxTime(maxTimestamp)
    }
  }, [machineRoutes])

  const calculateScale = () => {
    if (fields.length === 0) return gridSize

    const maxX = Math.max(...fields.map((f) => f.x + f.width))
    const maxY = Math.max(...fields.map((f) => f.y + f.height))

    const scaleX = (canvasWidth - padding * 2) / maxX
    const scaleY = (canvasHeight - padding * 2) / maxY

    return Math.min(scaleX, scaleY, gridSize)
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSettingBaseStation || !onMapClick) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const scale = calculateScale()

    const actualX = Math.round((x - padding) / scale)
    const actualY = Math.round((y - padding) / scale)

    onMapClick({ x: actualX, y: actualY })
  }

  const drawGrid = (ctx: CanvasRenderingContext2D, scale: number) => {
    if (!showGrid) return

    const colors = getThemeColors()
    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 0.5

    for (let x = 0; x <= canvasWidth; x += scale) {
      ctx.beginPath()
      ctx.moveTo(padding + x, padding)
      ctx.lineTo(padding + x, canvasHeight - padding)
      ctx.stroke()
    }

    for (let y = 0; y <= canvasHeight; y += scale) {
      ctx.beginPath()
      ctx.moveTo(padding, padding + y)
      ctx.lineTo(canvasWidth - padding, padding + y)
      ctx.stroke()
    }
  }

  const drawRoadNetwork = (ctx: CanvasRenderingContext2D, scale: number) => {
    if (!showRoads || roadNetwork.length === 0) return

    const colors = getThemeColors()

    // 绘制道路节点
    ctx.fillStyle = colors.road
    roadNetwork.forEach((node) => {
      const x = node.x * scale + padding
      const y = node.y * scale + padding
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, 2 * Math.PI)
      ctx.fill()
    })

    // 绘制道路连接
    ctx.strokeStyle = colors.road
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])

    const roadSpacing = 10
    const minX = Math.min(...fields.map((f) => f.x), baseStation.x) - 20
    const maxX = Math.max(...fields.map((f) => f.x + f.width), baseStation.x) + 20
    const minY = Math.min(...fields.map((f) => f.y), baseStation.y) - 20
    const maxY = Math.max(...fields.map((f) => f.y + f.height), baseStation.y) + 20

    for (let y = minY; y <= maxY; y += roadSpacing) {
      ctx.beginPath()
      ctx.moveTo(minX * scale + padding, y * scale + padding)
      ctx.lineTo(maxX * scale + padding, y * scale + padding)
      ctx.stroke()
    }

    for (let x = minX; x <= maxX; x += roadSpacing) {
      ctx.beginPath()
      ctx.moveTo(x * scale + padding, minY * scale + padding)
      ctx.lineTo(x * scale + padding, maxY * scale + padding)
      ctx.stroke()
    }

    ctx.setLineDash([])
  }

  const drawFields = (ctx: CanvasRenderingContext2D, scale: number) => {
    const colors = getThemeColors()

    fields.forEach((field) => {
      const x = field.x * scale + padding
      const y = field.y * scale + padding
      const width = field.width * scale
      const height = field.height * scale

      // 绘制田地
      ctx.fillStyle = colors.field
      ctx.fillRect(x, y, width, height)

      // 绘制边框
      ctx.strokeStyle = colors.fieldBorder
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, width, height)

      // 绘制田地编号
      ctx.fillStyle = "#ffffff"
      ctx.font = "14px Arial"
      ctx.textAlign = "center"
      ctx.fillText(field.id.toString(), x + width / 2, y + height / 2 + 5)

      // 绘制角落标记
      if (showRoads) {
        ctx.fillStyle = colors.text
        const cornerSize = 4
        ctx.fillRect(x - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize)
        ctx.fillRect(x + width - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize)
        ctx.fillRect(x - cornerSize / 2, y + height - cornerSize / 2, cornerSize, cornerSize)
        ctx.fillRect(x + width - cornerSize / 2, y + height - cornerSize / 2, cornerSize, cornerSize)
      }
    })

    // 绘制基站
    const baseX = baseStation.x * scale + padding
    const baseY = baseStation.y * scale + padding

    // 基站光环效果
    if (isSettingBaseStation) {
      const gradient = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, 30)
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.3)")
      gradient.addColorStop(1, "rgba(239, 68, 68, 0)")
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(baseX, baseY, 30, 0, 2 * Math.PI)
      ctx.fill()
    }

    ctx.fillStyle = isSettingBaseStation ? "#ef4444" : "#fbbf24"
    ctx.beginPath()
    ctx.arc(baseX, baseY, 15, 0, 2 * Math.PI)
    ctx.fill()

    ctx.strokeStyle = isSettingBaseStation ? "#dc2626" : "#f59e0b"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(baseX, baseY, 15, 0, 2 * Math.PI)
    ctx.stroke()

    // 基站图标
    ctx.fillStyle = colors.text
    ctx.fillRect(baseX - 6, baseY - 2, 12, 8)
    ctx.beginPath()
    ctx.moveTo(baseX - 8, baseY - 2)
    ctx.lineTo(baseX, baseY - 8)
    ctx.lineTo(baseX + 8, baseY - 2)
    ctx.closePath()
    ctx.fill()

    // 标注基站
    ctx.fillStyle = colors.text
    ctx.font = "12px Arial"
    ctx.textAlign = "center"
    ctx.fillText("🏠 基站", baseX, baseY + 25)
  }

  const drawMachineRoutes = (ctx: CanvasRenderingContext2D, scale: number, currentTime: number) => {
    machineRoutes.forEach((route) => {
      if (route.path.length < 2) return

      // 绘制路径
      route.path.forEach((point, index) => {
        if (index === 0) return

        const prevPoint = route.path[index - 1]
        const isCurrentSegment =
          prevPoint.timestamp <= currentTime &&
          (index === route.path.length - 1 || route.path[index].timestamp > currentTime)

        // 根据动作类型设置样式
        if (point.action === "road_travel" || point.action === "emergency_road_travel") {
          ctx.strokeStyle = "#f59e0b"
          ctx.lineWidth = 4
          ctx.setLineDash([8, 4])
          ctx.shadowColor = "#f59e0b"
          ctx.shadowBlur = 5
        } else if (point.action === "working") {
          ctx.strokeStyle = route.color
          ctx.lineWidth = 3
          ctx.setLineDash([])
          ctx.shadowColor = route.color
          ctx.shadowBlur = 3
        } else {
          ctx.strokeStyle = route.color
          ctx.lineWidth = 2
          ctx.setLineDash([5, 3])
          ctx.shadowBlur = 0
        }

        if (prevPoint.timestamp <= currentTime) {
          ctx.beginPath()
          ctx.moveTo(prevPoint.x * scale + padding, prevPoint.y * scale + padding)

          if (isCurrentSegment && index < route.path.length - 1) {
            const timeDiff = point.timestamp - prevPoint.timestamp
            const timeProgress = timeDiff > 0 ? (currentTime - prevPoint.timestamp) / timeDiff : 0

            const interpolatedX = prevPoint.x + (point.x - prevPoint.x) * timeProgress
            const interpolatedY = prevPoint.y + (point.y - prevPoint.y) * timeProgress

            ctx.lineTo(interpolatedX * scale + padding, interpolatedY * scale + padding)
          } else if (point.timestamp <= currentTime) {
            ctx.lineTo(point.x * scale + padding, point.y * scale + padding)
          }

          ctx.stroke()
        }
      })

      // 绘制农机当前位置
      const currentPathIndex = route.path.findIndex((point, index) => {
        if (index === route.path.length - 1) return true
        return point.timestamp <= currentTime && route.path[index + 1].timestamp > currentTime
      })

      if (currentPathIndex >= 0) {
        let machineX, machineY

        if (currentPathIndex < route.path.length - 1) {
          const currentPoint = route.path[currentPathIndex]
          const nextPoint = route.path[currentPathIndex + 1]

          const timeDiff = nextPoint.timestamp - currentPoint.timestamp
          const timeProgress = timeDiff > 0 ? (currentTime - currentPoint.timestamp) / timeDiff : 0

          machineX = (currentPoint.x + (nextPoint.x - currentPoint.x) * timeProgress) * scale + padding
          machineY = (currentPoint.y + (nextPoint.y - currentPoint.y) * timeProgress) * scale + padding
        } else {
          const lastPoint = route.path[route.path.length - 1]
          machineX = lastPoint.x * scale + padding
          machineY = lastPoint.y * scale + padding
        }

        const isSupplying = route.supplyEvents.some(
          (event) => currentTime >= event.time && currentTime <= event.time + event.duration,
        )

        const currentPoint = route.path[currentPathIndex]
        const isCapacityFull = currentPoint && currentPoint.action === "capacity_full"
        const isOnRoad =
          currentPoint && (currentPoint.action === "road_travel" || currentPoint.action === "emergency_road_travel")

        // 农机光环效果
        if (isSupplying || isCapacityFull || isOnRoad) {
          const gradient = ctx.createRadialGradient(machineX, machineY, 0, machineX, machineY, 20)
          const color = isSupplying ? "#fbbf24" : isCapacityFull ? "#ef4444" : "#f59e0b"
          gradient.addColorStop(0, `${color}40`)
          gradient.addColorStop(1, `${color}00`)
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(machineX, machineY, 20, 0, 2 * Math.PI)
          ctx.fill()
        }

        // 农机图标
        ctx.fillStyle = isSupplying ? "#fbbf24" : isCapacityFull ? "#ef4444" : isOnRoad ? "#f59e0b" : route.color
        ctx.beginPath()
        ctx.arc(machineX, machineY, 10, 0, 2 * Math.PI)
        ctx.fill()

        if (isSupplying || isCapacityFull || isOnRoad) {
          ctx.strokeStyle = isSupplying ? "#f59e0b" : isCapacityFull ? "#dc2626" : "#ea580c"
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(machineX, machineY, 14, 0, 2 * Math.PI)
          ctx.stroke()
        }

        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 12px Arial"
        ctx.textAlign = "center"
        ctx.fillText(route.machineId.toString(), machineX, machineY + 4)
      }
    })

    ctx.setLineDash([])
    ctx.shadowBlur = 0
  }

  const draw = (currentTime: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const colors = getThemeColors()

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // 设置背景
    if (isSettingBaseStation) {
      const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight)
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.1)")
      gradient.addColorStop(1, "rgba(220, 38, 38, 0.05)")
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = colors.background
    }
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const scale = calculateScale()

    drawGrid(ctx, scale)
    drawRoadNetwork(ctx, scale)
    drawFields(ctx, scale)

    if (machineRoutes.length > 0) {
      drawMachineRoutes(ctx, scale, currentTime)
    }

    // 绘制现代化图例
    if (machineRoutes.length > 0) {
      const legendWidth = 280
      const legendHeight = machineRoutes.length * 30 + 140
      const legendX = canvasWidth - legendWidth - 15
      const legendY = canvasHeight - legendHeight - 15

      // 图例背景
      const gradient = ctx.createLinearGradient(legendX, legendY, legendX + legendWidth, legendY + legendHeight)
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)")
      gradient.addColorStop(1, "rgba(248, 250, 252, 0.95)")
      ctx.fillStyle = gradient
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight)

      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)"
      ctx.lineWidth = 1
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight)

      ctx.fillStyle = "#1f2937"
      ctx.font = "bold 14px Arial"
      ctx.textAlign = "left"
      ctx.fillText("🚜 农机状态监控", legendX + 15, legendY + 25)
      ctx.fillText(`⏰ 时间: ${(currentTime / 60).toFixed(1)} 分钟`, legendX + 15, legendY + 45)

      ctx.font = "11px Arial"
      ctx.fillText("🟢 实线: 田地工作", legendX + 15, legendY + 65)
      ctx.fillText("🟡 虚线: 其他移动", legendX + 140, legendY + 65)
      ctx.fillText("🟠 粗线: 道路移动", legendX + 15, legendY + 80)
      ctx.fillText("🔴 红色: 容量满", legendX + 140, legendY + 80)
      ctx.fillText("🟡 黄色: 补给中", legendX + 15, legendY + 95)
      ctx.fillText("🟠 橙色: 道路上", legendX + 140, legendY + 95)

      machineRoutes.forEach((route, index) => {
        const y = legendY + 115 + index * 25

        const isSupplying = route.supplyEvents.some(
          (event) => currentTime >= event.time && currentTime <= event.time + event.duration,
        )

        const currentPoint = route.path.find((point, idx) => {
          if (idx === route.path.length - 1) return point.timestamp <= currentTime
          return point.timestamp <= currentTime && route.path[idx + 1].timestamp > currentTime
        })
        const isCapacityFull = currentPoint && currentPoint.action === "capacity_full"
        const isOnRoad =
          currentPoint && (currentPoint.action === "road_travel" || currentPoint.action === "emergency_road_travel")

        // 农机状态指示器
        ctx.fillStyle = route.color
        ctx.beginPath()
        ctx.arc(legendX + 20, y, 6, 0, 2 * Math.PI)
        ctx.fill()

        ctx.strokeStyle = route.color
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(legendX + 35, y)
        ctx.lineTo(legendX + 55, y)
        ctx.stroke()

        ctx.fillStyle = "#1f2937"
        ctx.font = "12px Arial"
        let status = ""
        if (isSupplying) status = " 🟡 (补给中)"
        else if (isCapacityFull) status = " 🔴 (容量满)"
        else if (isOnRoad) status = " 🟠 (道路上)"
        else status = " 🟢 (工作中)"

        ctx.fillText(`农机 ${route.machineId}${status}`, legendX + 65, y + 4)
      })
    }

    // 设置基站提示
    if (isSettingBaseStation) {
      ctx.fillStyle = "rgba(239, 68, 68, 0.1)"
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      ctx.fillStyle = "#dc2626"
      ctx.font = "bold 18px Arial"
      ctx.textAlign = "center"
      ctx.fillText("🎯 点击地图设置基站位置", canvasWidth / 2, 35)
    }
  }

  const animate = () => {
    if (!isAnimating) return

    setCurrentTime((prev) => {
      const newTime = prev + playbackSpeed * 2
      if (newTime >= maxTime) {
        setIsAnimating(false)
        return maxTime
      }
      return newTime
    })

    animationRef.current = requestAnimationFrame(animate)
  }

  const startAnimation = () => {
    setIsAnimating(true)
  }

  const pauseAnimation = () => {
    setIsAnimating(false)
  }

  const resetAnimation = () => {
    setIsAnimating(false)
    setCurrentTime(0)
  }

  const handleTimelineChange = (value: number[]) => {
    setCurrentTime(value[0])
    setIsAnimating(false)
  }

  useEffect(() => {
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isAnimating, playbackSpeed])

  useEffect(() => {
    draw(currentTime)
  }, [fields, machineRoutes, roadNetwork, baseStation, currentTime, isSettingBaseStation, showGrid, showRoads, theme])

  const getButtonClasses = () => {
    switch (theme) {
      case "dark":
        return "bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
      case "gradient":
        return "bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm"
      case "nature":
        return "bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm"
      default:
        return "bg-white hover:bg-gray-50 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {machineRoutes.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <Button
              onClick={isAnimating ? pauseAnimation : startAnimation}
              size="sm"
              className={`${getButtonClasses()} transition-all duration-300 hover:scale-105 shadow-lg`}
            >
              {isAnimating ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  ⏸️ 暂停
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  ▶️ 播放
                </>
              )}
            </Button>

            <Button
              onClick={resetAnimation}
              size="sm"
              className={`${getButtonClasses()} transition-all duration-300 hover:scale-105 shadow-lg`}
            >
              <RotateCcw className="w-4 h-4 mr-2" />🔄 重置
            </Button>

            <Button
              onClick={() => setShowGrid(!showGrid)}
              size="sm"
              className={`${getButtonClasses()} transition-all duration-300 hover:scale-105 shadow-lg`}
            >
              <Grid className="w-4 h-4 mr-2" />
              {showGrid ? "🔲 隐藏网格" : "⬜ 显示网格"}
            </Button>

            <Button
              onClick={() => setShowRoads(!showRoads)}
              size="sm"
              className={`${getButtonClasses()} transition-all duration-300 hover:scale-105 shadow-lg`}
            >
              <Route className="w-4 h-4 mr-2" />
              {showRoads ? "🛣️ 隐藏道路" : "🗺️ 显示道路"}
            </Button>

            <div className="flex items-center gap-3 ml-6">
              <span className="text-sm font-medium flex items-center gap-1">
                <Zap className="w-4 h-4" />
                播放速度:
              </span>
              <Select value={playbackSpeed.toString()} onValueChange={(value) => setPlaybackSpeed(Number(value))}>
                <SelectTrigger className={`w-24 ${getButtonClasses()}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                  <SelectItem value="8">8x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 ml-6 px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {(currentTime / 60).toFixed(1)} / {(maxTime / 60).toFixed(1)} 分钟
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium w-16 flex items-center gap-1">
                <Activity className="w-4 h-4" />
                时间轴:
              </span>
              <Slider
                value={[currentTime]}
                onValueChange={handleTimelineChange}
                max={maxTime}
                step={1}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden bg-white shadow-2xl">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className={`w-full h-auto transition-all duration-300 ${
            isSettingBaseStation ? "cursor-crosshair" : "cursor-default"
          }`}
          onClick={handleCanvasClick}
        />
      </div>

      {fields.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <div className="text-6xl mb-4">🌾</div>
          <p className="text-lg">请配置田地参数以查看布局</p>
        </div>
      )}

      {fields.length > 0 && machineRoutes.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-lg">点击"开始智能调度"按钮计算农机路径</p>
        </div>
      )}
    </div>
  )
}
