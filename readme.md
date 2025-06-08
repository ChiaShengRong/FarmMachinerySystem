# 智能农机调度系统

本项目是一个基于 Next.js + React + Tailwind CSS 的智能农机路径规划与田间道路调度平台，支持 AI 驱动的农机调度、田地布局可视化、道路网络仿真等功能。

## 功能特性
- 田地网格/自定义布局配置
- 农机数量、容量、补给时长等参数自定义
- 基站位置可视化与交互设置
- 智能调度算法，自动分配田地与路径
- 田间道路网络仿真与最短路径规划
- 路径与状态实时可视化，支持动画播放/暂停/重置
- 结果统计与效率评分
- 支持多种主题与背景特效
- 丰富的 UI 组件与交互体验

## 技术栈
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/) 组件库
- [Lucide React](https://lucide.dev/) 图标
- [Bun](https://bun.sh/) 作为包管理与运行环境

## 快速开始

1. **安装依赖**

   ```bash
   bun install
   ```

2. **启动开发服务器**

   ```bash
   bun run dev
   ```

   默认访问地址：http://localhost:3000

## 主要目录结构

```
├── app/                # Next.js 应用目录
│   ├── globals.css     # 全局样式（Tailwind）
│   ├── layout.tsx      # 根布局
│   ├── page.tsx        # 首页与主界面
│   └── api/schedule/   # 智能调度 API 路由
├── components/         # 业务与 UI 组件
│   ├── field-visualization.tsx  # 田地与路径可视化
│   ├── task-bar.tsx    # 顶部任务栏
│   ├── ...             # 其他组件
│   └── ui/             # 通用 UI 组件
├── public/             # 静态资源
├── scripts/            # 辅助脚本（如 farm_scheduler.py）
├── styles/             # 额外样式
├── package.json        # 项目依赖与脚本
├── tailwind.config.ts  # Tailwind 配置
├── postcss.config.mjs  # PostCSS 配置
├── tsconfig.json       # TypeScript 配置
└── bun.lock            # Bun 锁定文件
```

## 主要使用方法

1. **参数配置**：在左侧面板设置农机数量、田地数量、田地尺寸、农机容量、补给时长、田地布局（网格/自定义）等。
2. **基站设置**：点击“设置基站位置”后，在地图上点击选择基站。
3. **智能调度**：点击“开始智能调度”按钮，系统将自动计算最优路径。
4. **结果可视化**：右侧区域展示田地、道路、农机路径与状态动画。
5. **动画控制**：支持播放、暂停、重置、调整速度、显示/隐藏网格与道路。
6. **结果统计**：下方展示农机数量、总用时、补给次数、效率评分等。

## 界面展示

![系统界面展示](img/img.png)

## 依赖与脚本
- 依赖管理：`bun install`
- 启动开发：`bun run dev`
- 构建生产：`bun run build`
- 代码检查：`bun run lint`

## 其他说明
- 支持多主题切换与快捷键操作（如 Ctrl+1~4 切换主题，Ctrl+Enter 计算，Ctrl+R 重置等）
- 田间道路与路径规划算法详见 `app/api/schedule/route.ts`
- 可选用 `scripts/farm_scheduler.py` 进行离线调度算法测试

---

如有问题或建议，欢迎 Issue 或 PR！
