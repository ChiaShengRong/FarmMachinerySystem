import { type NextRequest, NextResponse } from "next/server"

interface Field {
  id: number
  x: number
  y: number
  width: number
  height: number
}

interface ScheduleRequest {
  machineCount: number
  fields: Field[]
  baseStation: { x: number; y: number }
  parameters: {
    fieldWidth: number
    fieldHeight: number
    totalFields: number
    machineCapacity: number
    supplyDuration: number
  }
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

// 道路网络节点
interface RoadNode {
  x: number
  y: number
  connections: RoadNode[]
  id: string
}

// 农机状态
interface MachineState {
  id: number
  currentCapacity: number
  position: { x: number; y: number }
  currentTime: number
  path: Array<{ x: number; y: number; timestamp: number; action: string }>
  supplyEvents: Array<{ time: number; duration: number }>
  isIdle: boolean
}

// 田地工作状态
interface FieldWorkState {
  field: Field
  completedPercentage: number
  isCompleted: boolean
  workingMachine: number | null
  assignedMachines: number[]
  lastWorkPosition: { x: number; y: number } | null
  workPath: Array<{ x: number; y: number }>
}

export async function POST(request: NextRequest) {
  try {
    const data: ScheduleRequest = await request.json()
    const result = generateScheduleWithRoadNetwork(data)
    return NextResponse.json(result)
  } catch (error) {
    console.error("调度计算错误:", error)
    return NextResponse.json({ error: "调度计算失败" }, { status: 500 })
  }
}

// 将坐标对齐到网格
function snapToGrid(position: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
  }
}

// 计算两点之间的距离
function calculateDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
}

// 检查点是否在任何田地内部
function isPointInsideAnyField(point: { x: number; y: number }, fields: Field[]): boolean {
  return fields.some(
    (field) =>
      point.x > field.x && point.x < field.x + field.width && point.y > field.y && point.y < field.y + field.height,
  )
}

// 生成真正的田间道路网络
function generateFieldRoadNetwork(fields: Field[], baseStation: { x: number; y: number }): RoadNode[] {
  const nodes: RoadNode[] = []
  const nodeMap = new Map<string, RoadNode>()

  // 计算田地的边界
  const minX = Math.min(...fields.map((f) => f.x), baseStation.x) - 20
  const maxX = Math.max(...fields.map((f) => f.x + f.width), baseStation.x) + 20
  const minY = Math.min(...fields.map((f) => f.y), baseStation.y) - 20
  const maxY = Math.max(...fields.map((f) => f.y + f.height), baseStation.y) + 20

  // 创建网格道路系统
  const roadSpacing = 10 // 道路间隔10米

  // 生成水平和垂直道路网格
  for (let x = minX; x <= maxX; x += roadSpacing) {
    for (let y = minY; y <= maxY; y += roadSpacing) {
      const point = { x, y }

      // 只在田地外部创建道路节点
      if (!isPointInsideAnyField(point, fields)) {
        const key = `${x},${y}`
        const node: RoadNode = { x, y, connections: [], id: key }
        nodeMap.set(key, node)
        nodes.push(node)
      }
    }
  }

  // 添加基站节点（如果不在田地内）
  if (!isPointInsideAnyField(baseStation, fields)) {
    const baseKey = `${baseStation.x},${baseStation.y}`
    if (!nodeMap.has(baseKey)) {
      const baseNode: RoadNode = { x: baseStation.x, y: baseStation.y, connections: [], id: baseKey }
      nodeMap.set(baseKey, baseNode)
      nodes.push(baseNode)
    }
  }

  // 为每个田地的角落添加道路连接点
  fields.forEach((field) => {
    const corners = [
      { x: field.x, y: field.y },
      { x: field.x + field.width, y: field.y },
      { x: field.x, y: field.y + field.height },
      { x: field.x + field.width, y: field.y + field.height },
    ]

    corners.forEach((corner) => {
      const key = `${corner.x},${corner.y}`
      if (!nodeMap.has(key)) {
        const node: RoadNode = { x: corner.x, y: corner.y, connections: [], id: key }
        nodeMap.set(key, node)
        nodes.push(node)
      }
    })
  })

  // 连接相邻的道路节点
  nodes.forEach((node) => {
    nodes.forEach((otherNode) => {
      if (node !== otherNode) {
        const distance = calculateDistance(node, otherNode)

        // 只连接相邻的节点（水平或垂直相邻）
        if (distance <= roadSpacing * 1.5) {
          // 检查连接路径是否穿过田地
          if (!doesPathCrossFields(node, otherNode, fields)) {
            node.connections.push(otherNode)
          }
        }
      }
    })
  })

  console.log(`生成道路网络: ${nodes.length} 个节点`)
  return nodes
}

// 检查路径是否穿过田地
function doesPathCrossFields(from: { x: number; y: number }, to: { x: number; y: number }, fields: Field[]): boolean {
  // 检查路径中间的多个点
  const steps = 10
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const checkPoint = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    }

    if (isPointInsideAnyField(checkPoint, fields)) {
      return true
    }
  }
  return false
}

// 使用Dijkstra算法寻找最短路径
function findShortestPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  roadNetwork: RoadNode[],
): Array<{ x: number; y: number }> {
  // 找到最近的起始和结束节点
  const startNode = roadNetwork.reduce((closest, node) => {
    const currentDist = calculateDistance(start, node)
    const closestDist = calculateDistance(start, closest)
    return currentDist < closestDist ? node : closest
  })

  const endNode = roadNetwork.reduce((closest, node) => {
    const currentDist = calculateDistance(end, node)
    const closestDist = calculateDistance(end, closest)
    return currentDist < closestDist ? node : closest
  })

  // Dijkstra算法
  const distances = new Map<RoadNode, number>()
  const previous = new Map<RoadNode, RoadNode | null>()
  const unvisited = new Set<RoadNode>()

  // 初始化
  roadNetwork.forEach((node) => {
    distances.set(node, Number.POSITIVE_INFINITY)
    previous.set(node, null)
    unvisited.add(node)
  })

  distances.set(startNode, 0)

  while (unvisited.size > 0) {
    // 找到距离最小的未访问节点
    let current: RoadNode | null = null
    let minDistance = Number.POSITIVE_INFINITY

    unvisited.forEach((node) => {
      const dist = distances.get(node) || Number.POSITIVE_INFINITY
      if (dist < minDistance) {
        minDistance = dist
        current = node
      }
    })

    if (!current || current === endNode) break

    unvisited.delete(current)

    // 更新邻居节点的距离
    current.connections.forEach((neighbor) => {
      if (unvisited.has(neighbor)) {
        const alt = (distances.get(current!) || Number.POSITIVE_INFINITY) + calculateDistance(current!, neighbor)
        if (alt < (distances.get(neighbor) || Number.POSITIVE_INFINITY)) {
          distances.set(neighbor, alt)
          previous.set(neighbor, current!)
        }
      }
    })
  }

  // 重建路径
  const path: Array<{ x: number; y: number }> = []
  let current: RoadNode | null = endNode

  while (current) {
    path.unshift({ x: current.x, y: current.y })
    current = previous.get(current) || null
  }

  // 如果找到了有效路径
  if (path.length > 0 && path[0].x === startNode.x && path[0].y === startNode.y) {
    return path
  }

  // 如果没有找到路径，返回直线路径作为后备
  console.warn("未找到道路路径，使用直线路径")
  return [
    { x: startNode.x, y: startNode.y },
    { x: endNode.x, y: endNode.y },
  ]
}

// 选择最优的田地起点
function selectOptimalFieldEntryPoint(
  field: Field,
  baseStation: { x: number; y: number },
  lastWorkPosition: { x: number; y: number } | null,
): { x: number; y: number } {
  if (lastWorkPosition) {
    return lastWorkPosition
  }

  const corners = [
    { x: field.x, y: field.y },
    { x: field.x + field.width, y: field.y },
    { x: field.x, y: field.y + field.height },
    { x: field.x + field.width, y: field.y + field.height },
  ]

  let closestCorner = corners[0]
  let minDistance = calculateDistance(baseStation, closestCorner)

  corners.forEach((corner) => {
    const distance = calculateDistance(baseStation, corner)
    if (distance < minDistance) {
      minDistance = distance
      closestCorner = corner
    }
  })

  console.log(
    `田地 ${field.id} 选择起点: (${closestCorner.x}, ${closestCorner.y})，距离基站: ${minDistance.toFixed(1)}`,
  )
  return closestCorner
}

// 带道路网络的调度算法
function generateScheduleWithRoadNetwork(data: ScheduleRequest): ScheduleResult {
  const { machineCount, fields, baseStation, parameters } = data
  const { machineCapacity, supplyDuration } = parameters
  const colors = ["#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1"]

  const gridBaseStation = snapToGrid(baseStation)

  if (fields.length === 0) {
    return {
      machines: [],
      totalTime: 0,
      efficiency: 0,
      totalSupplyEvents: 0,
      baseStation: gridBaseStation,
      roadNetwork: [],
    }
  }

  // 生成田间道路网络
  const roadNetwork = generateFieldRoadNetwork(fields, gridBaseStation)

  // 初始化农机状态
  const machines: MachineState[] = Array.from({ length: machineCount }, (_, i) => ({
    id: i + 1,
    currentCapacity: machineCapacity,
    position: { ...gridBaseStation },
    currentTime: 0,
    path: [{ x: gridBaseStation.x, y: gridBaseStation.y, timestamp: 0, action: "start" }],
    supplyEvents: [],
    isIdle: true,
  }))

  // 初始化田地工作状态
  const fieldStates: FieldWorkState[] = fields.map((field) => ({
    field,
    completedPercentage: 0,
    isCompleted: false,
    workingMachine: null,
    assignedMachines: [],
    lastWorkPosition: null,
    workPath: [],
  }))

  // 调度逻辑
  let currentTime = 0
  const maxTime = 3600 * 8

  while (currentTime < maxTime && fieldStates.some((fs) => !fs.isCompleted)) {
    for (const machine of machines) {
      if (machine.currentTime > currentTime) continue

      const availableField = fieldStates.find((fs) => !fs.isCompleted)
      if (!availableField) break

      // 检查是否需要补给
      if (machine.currentCapacity < 0.1) {
        console.log(`农机 ${machine.id} 需要补给，从 (${machine.position.x}, ${machine.position.y}) 返回基站`)

        // 使用道路网络返回基站
        const returnPath = findShortestPath(machine.position, gridBaseStation, roadNetwork)

        returnPath.forEach((point, index) => {
          if (index > 0) {
            // 跳过起始点
            const travelTime = calculateDistance(machine.position, point) / 5
            machine.currentTime += travelTime
            machine.position = point

            machine.path.push({
              x: point.x,
              y: point.y,
              timestamp: machine.currentTime,
              action: "road_travel",
            })
          }
        })

        machine.path.push({
          x: gridBaseStation.x,
          y: gridBaseStation.y,
          timestamp: machine.currentTime,
          action: "supply",
        })

        machine.supplyEvents.push({
          time: machine.currentTime,
          duration: supplyDuration,
        })

        machine.currentTime += supplyDuration
        machine.currentCapacity = machineCapacity
        machine.position = { ...gridBaseStation }

        machine.path.push({
          x: gridBaseStation.x,
          y: gridBaseStation.y,
          timestamp: machine.currentTime,
          action: "supply_complete",
        })
      }

      // 执行田地工作
      const workResult = executeFieldWorkWithRoadNetwork(
        machine,
        availableField,
        machineCapacity,
        roadNetwork,
        gridBaseStation,
      )

      machine.currentCapacity -= workResult.capacityUsed
      machine.currentTime += workResult.workTime
      machine.position = workResult.endPosition
      machine.path.push(...workResult.pathSegments)

      availableField.completedPercentage += workResult.capacityUsed
      availableField.lastWorkPosition = workResult.endPosition
      availableField.workPath.push(...workResult.workPath)

      if (availableField.completedPercentage >= 0.99) {
        availableField.isCompleted = true
      }
    }

    currentTime += 60
  }

  // 让所有农机返回基站
  machines.forEach((machine) => {
    if (machine.position.x !== gridBaseStation.x || machine.position.y !== gridBaseStation.y) {
      const returnPath = findShortestPath(machine.position, gridBaseStation, roadNetwork)

      returnPath.forEach((point, index) => {
        if (index > 0) {
          machine.currentTime += calculateDistance(machine.position, point) / 5
          machine.position = point

          machine.path.push({
            x: point.x,
            y: point.y,
            timestamp: machine.currentTime,
            action: "road_travel",
          })
        }
      })

      machine.path.push({
        x: gridBaseStation.x,
        y: gridBaseStation.y,
        timestamp: machine.currentTime,
        action: "return",
      })
    }
  })

  const machineRoutes: MachineRoute[] = machines.map((machine) => ({
    machineId: machine.id,
    path: machine.path,
    color: colors[(machine.id - 1) % colors.length],
    supplyEvents: machine.supplyEvents,
  }))

  const totalSupplyEvents = machines.reduce((sum, machine) => sum + machine.supplyEvents.length, 0)
  const totalTime = Math.max(...machines.map((m) => m.currentTime)) / 60
  const efficiency = calculateEfficiency(machines, fieldStates)

  return {
    machines: machineRoutes,
    totalTime,
    efficiency,
    totalSupplyEvents,
    baseStation: gridBaseStation,
    roadNetwork: roadNetwork.map((node) => ({ x: node.x, y: node.y })),
  }
}

// 执行田地工作（使用道路网络）
function executeFieldWorkWithRoadNetwork(
  machine: MachineState,
  fieldState: FieldWorkState,
  machineCapacity: number,
  roadNetwork: RoadNode[],
  baseStation: { x: number; y: number },
): {
  pathSegments: Array<{ x: number; y: number; timestamp: number; action: string }>
  endPosition: { x: number; y: number }
  capacityUsed: number
  workTime: number
  workPath: Array<{ x: number; y: number }>
} {
  const field = fieldState.field
  const pathSegments: Array<{ x: number; y: number; timestamp: number; action: string }> = []
  const workPath: Array<{ x: number; y: number }> = []

  const remainingWork = Math.max(0, 1.0 - fieldState.completedPercentage)
  const availableCapacity = Math.min(machine.currentCapacity, remainingWork)

  if (availableCapacity <= 0.05) {
    return {
      pathSegments: [],
      endPosition: machine.position,
      capacityUsed: 0,
      workTime: 0,
      workPath: [],
    }
  }

  // 选择田地起点
  const workStartPoint = selectOptimalFieldEntryPoint(field, baseStation, fieldState.lastWorkPosition)

  console.log(`农机 ${machine.id} 使用道路网络前往田地 ${field.id}`)

  // 使用道路网络移动到田地
  const travelPath = findShortestPath(machine.position, workStartPoint, roadNetwork)

  travelPath.forEach((point, index) => {
    if (index > 0) {
      // 跳过起始点
      const travelTime = calculateDistance(machine.position, point) / 5
      machine.currentTime += travelTime
      machine.position = point

      const gridPoint = snapToGrid(point)
      pathSegments.push({
        x: gridPoint.x,
        y: gridPoint.y,
        timestamp: machine.currentTime,
        action: "road_travel",
      })
    }
  })

  // 到达田地起点
  const gridStartPoint = snapToGrid(workStartPoint)
  machine.position = gridStartPoint

  pathSegments.push({
    x: gridStartPoint.x,
    y: gridStartPoint.y,
    timestamp: machine.currentTime,
    action: "field_start",
  })

  // 生成田地内工作路径
  const fieldWorkPath = generateContinuousFieldWorkPath(field, fieldState.completedPercentage, availableCapacity)

  if (fieldWorkPath.length === 0) {
    return {
      pathSegments,
      endPosition: gridStartPoint,
      capacityUsed: 0,
      workTime: 0,
      workPath: [],
    }
  }

  const capacityPerPoint = availableCapacity / fieldWorkPath.length
  const timePerPoint = (availableCapacity * 180) / fieldWorkPath.length

  let currentCapacityUsed = 0
  let workTime = 0
  let endPosition = gridStartPoint

  // 工作路径处理
  for (let i = 0; i < fieldWorkPath.length; i++) {
    const point = fieldWorkPath[i]
    const gridPoint = snapToGrid(point)

    const nextCapacityUsed = currentCapacityUsed + capacityPerPoint

    if (machine.currentCapacity - nextCapacityUsed < 0.05) {
      console.log(`农机 ${machine.id} 容量不足，使用道路网络返回基站`)

      pathSegments.push({
        x: gridPoint.x,
        y: gridPoint.y,
        timestamp: machine.currentTime + workTime + timePerPoint,
        action: "capacity_full",
      })

      // 使用道路网络返回基站
      const returnPath = findShortestPath(gridPoint, baseStation, roadNetwork)
      let returnTime = workTime + timePerPoint

      returnPath.forEach((returnPoint, index) => {
        if (index > 0) {
          const segmentTime = calculateDistance(gridPoint, returnPoint) / 5
          returnTime += segmentTime

          pathSegments.push({
            x: returnPoint.x,
            y: returnPoint.y,
            timestamp: machine.currentTime + returnTime,
            action: "emergency_road_travel",
          })
        }
      })

      endPosition = gridPoint
      workPath.push(gridPoint)
      currentCapacityUsed = nextCapacityUsed
      workTime = returnTime
      break
    }

    workTime += timePerPoint
    currentCapacityUsed = nextCapacityUsed

    pathSegments.push({
      x: gridPoint.x,
      y: gridPoint.y,
      timestamp: machine.currentTime + workTime,
      action: "working",
    })

    endPosition = gridPoint
    workPath.push(gridPoint)
  }

  return {
    pathSegments,
    endPosition,
    capacityUsed: currentCapacityUsed,
    workTime,
    workPath,
  }
}

// 生成连续的田地工作路径
function generateContinuousFieldWorkPath(
  field: Field,
  startPercentage: number,
  workPercentage: number,
): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = []

  const rowSpacing = 5
  const totalRows = Math.max(1, Math.floor(field.height / rowSpacing))
  const startRow = Math.floor(startPercentage * totalRows)
  const endRow = Math.min(totalRows, Math.ceil((startPercentage + workPercentage) * totalRows))

  for (let i = startRow; i < endRow; i++) {
    const y = field.y + (i * field.height) / totalRows

    if (i % 2 === 0) {
      if (i === startRow && startPercentage > 0) {
        const startX = field.x + (startPercentage * totalRows - startRow) * field.width
        path.push({ x: startX, y })
      } else {
        path.push({ x: field.x, y })
      }
      path.push({ x: field.x + field.width, y })
    } else {
      if (i === startRow && startPercentage > 0) {
        const startX = field.x + field.width - (startPercentage * totalRows - startRow) * field.width
        path.push({ x: startX, y })
      } else {
        path.push({ x: field.x + field.width, y })
      }
      path.push({ x: field.x, y })
    }
  }

  return path
}

// 计算效率
function calculateEfficiency(machines: MachineState[], fieldStates: FieldWorkState[]): number {
  const completedFields = fieldStates.filter((fs) => fs.isCompleted).length
  const totalFields = fieldStates.length
  const completionRate = completedFields / totalFields

  const avgTime = machines.reduce((sum, machine) => sum + machine.currentTime, 0) / machines.length
  const timeVariance =
    machines.reduce((sum, machine) => sum + Math.pow(machine.currentTime - avgTime, 2), 0) / machines.length

  const balanceScore = Math.max(0.5, 1 - timeVariance / (avgTime * avgTime + 1))

  return completionRate * balanceScore
}
