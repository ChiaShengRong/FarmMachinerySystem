"use client"

import { useEffect, useRef } from "react"

type Background = "default" | "particles" | "waves" | "geometric" | "farm"

interface BackgroundSelectorProps {
  background: Background
}

export function BackgroundSelector({ background }: BackgroundSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let animationId: number

    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      opacity: number
    }> = []

    // 初始化粒子
    const initParticles = () => {
      particles.length = 0
      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 3 + 1,
          color: `hsl(${Math.random() * 360}, 70%, 60%)`,
          opacity: Math.random() * 0.5 + 0.2,
        })
      }
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        ctx.save()
        ctx.globalAlpha = particle.opacity
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // 更新位置
        particle.x += particle.vx
        particle.y += particle.vy

        // 边界检测
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1
      })
    }

    const drawWaves = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const time = Date.now() * 0.001
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)")
      gradient.addColorStop(0.5, "rgba(147, 51, 234, 0.1)")
      gradient.addColorStop(1, "rgba(236, 72, 153, 0.1)")

      for (let i = 0; i < 3; i++) {
        ctx.save()
        ctx.globalAlpha = 0.3 - i * 0.1
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.beginPath()

        for (let x = 0; x <= canvas.width; x += 10) {
          const y =
            canvas.height / 2 +
            Math.sin(x * 0.01 + time * 2 + (i * Math.PI) / 3) * 50 +
            Math.sin(x * 0.02 + time * 1.5 + (i * Math.PI) / 2) * 30

          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.stroke()
        ctx.restore()
      }
    }

    const drawGeometric = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const time = Date.now() * 0.001

      for (let i = 0; i < 20; i++) {
        ctx.save()
        ctx.globalAlpha = 0.1
        ctx.strokeStyle = `hsl(${(time * 50 + i * 18) % 360}, 70%, 60%)`
        ctx.lineWidth = 1

        const x = canvas.width / 4 + (i % 5) * (canvas.width / 5)
        const y = canvas.height / 4 + Math.floor(i / 5) * (canvas.height / 4)
        const size = 50 + Math.sin(time + i) * 20

        ctx.translate(x, y)
        ctx.rotate(time + i * 0.5)

        ctx.beginPath()
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2
          const px = Math.cos(angle) * size
          const py = Math.sin(angle) * size

          if (j === 0) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        }
        ctx.closePath()
        ctx.stroke()
        ctx.restore()
      }
    }

    const drawFarm = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制田野背景
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, "rgba(34, 197, 94, 0.05)")
      gradient.addColorStop(1, "rgba(22, 163, 74, 0.1)")

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 绘制农田网格
      ctx.strokeStyle = "rgba(34, 197, 94, 0.1)"
      ctx.lineWidth = 1

      for (let x = 0; x < canvas.width; x += 100) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y < canvas.height; y += 80) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
    }

    const animate = () => {
      switch (background) {
        case "particles":
          drawParticles()
          break
        case "waves":
          drawWaves()
          break
        case "geometric":
          drawGeometric()
          break
        case "farm":
          drawFarm()
          break
        default:
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          return
      }

      animationId = requestAnimationFrame(animate)
    }

    if (background === "particles") {
      initParticles()
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      if (background === "particles") {
        initParticles()
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", handleResize)
    }
  }, [background])

  if (background === "default") {
    return null
  }

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.6 }} />
}
