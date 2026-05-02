'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { 
  Menu, 
  X, 
  Home, 
  BarChart3, 
  Upload, 
  Activity, 
  Table2, 
  Info,
  LogOut,
  Lock
} from 'lucide-react'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, detectionComplete, logout } = useAuth()

  const links = [
    { href: '/', label: 'Home', icon: Home, requiresAuth: false, requiresDetection: false },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3, requiresAuth: true, requiresDetection: true },
    { href: '/upload', label: 'Upload', icon: Upload, requiresAuth: true, requiresDetection: false },
    { href: '/live-monitoring', label: 'Live Monitor', icon: Activity, requiresAuth: true, requiresDetection: true },
    { href: '/results', label: 'Results', icon: Table2, requiresAuth: true, requiresDetection: true },
    { href: '/about', label: 'About', icon: Info, requiresAuth: false, requiresDetection: false },
  ]

  const isActive = (href: string) => pathname === href

  const handleLogout = () => {
    logout()
    router.push('/')
    setIsOpen(false)
  }

  const isLinkDisabled = (link: typeof links[0]) => {
    if (link.requiresAuth && !isAuthenticated) return true
    if (link.requiresDetection && !detectionComplete) return true
    return false
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 md:hidden p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-border transition-transform duration-300 ease-out md:translate-x-0 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-teal flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-dark-bg" />
            </div>
            <div>
              <h1 className="text-lg font-bold glow-neon-blue">SENTINEL</h1>
              <p className="text-xs text-muted-foreground">Anomaly Detection</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href)
            const disabled = isLinkDisabled(link)
            
            return (
              <div key={link.href}>
                {disabled ? (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground opacity-50 cursor-not-allowed"
                    title={link.requiresDetection ? 'Complete upload and detection first' : 'Sign in to access'}
                  >
                    {disabled && link.requiresDetection ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">{link.label}</span>
                  </div>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-primary text-primary-foreground glow-box-blue'
                        : 'text-sidebar-foreground hover:bg-secondary/50 hover:text-accent'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        {/* Logout Button */}
        {isAuthenticated && (
          <div className="p-4 border-t border-border">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        )}
      </aside>

      {/* Spacer for mobile */}
      <div className="h-16 md:hidden" />
    </>
  )
}
