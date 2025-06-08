import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '农机App',
  description: '智能农机调度系统',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
