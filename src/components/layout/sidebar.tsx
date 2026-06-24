"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  HelpCircle,
  ClipboardCheck,
  BarChart3,
  Settings,
  Shield,
  UserCog,
  Heart,
  ChevronLeft,
  X,
  Scale,
  Activity,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  role?: string;
  onNavClick?: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/cases", label: "Cases", icon: Users },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/agreements", label: "Agreements", icon: FileText },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/help-requests", label: "Help Requests", icon: HelpCircle },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminItems = [
  { href: "/admin/users", label: "User Management", icon: UserCog },
  { href: "/admin/mediators", label: "Mediators", icon: Scale },
  { href: "/admin/assessments", label: "Assessments Config", icon: ClipboardCheck },
  { href: "/admin/analytics", label: "Platform Analytics", icon: Activity },
  { href: "/admin/reports", label: "Admin Reports", icon: FileText },
  { href: "/admin/audit", label: "Audit Log", icon: Shield },
];

const mediatorItems = [
  { href: "/mediator", label: "Mediator Dashboard", icon: Scale },
];

export function Sidebar({ role, onNavClick }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = role === "ADMIN";
  const isMediator = role === "MEDIATOR";
  const isElevated = isAdmin || isMediator;

  return (
    <aside
      className={cn(
        "h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-60 lg:w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
          <Heart className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-lg text-gray-900 whitespace-nowrap">
            CoParent
          </span>
        )}
        {/* Mobile close button */}
        <button
          onClick={onNavClick}
          className="lg:hidden ml-auto p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          // Hide Cases from parents — they access case context via dashboard
          if (item.href === "/cases" && !isElevated) return null;

          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Mediator section */}
        {isMediator && (
          <>
            <div className={cn("pt-4 pb-2", collapsed && "sr-only")}>
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Mediator
              </p>
            </div>
            {mediatorItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavClick}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}

        {/* Admin section */}
        {isElevated && (
          <div className={cn("pt-4 pb-2", collapsed && "sr-only")}>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Administration
            </p>
          </div>
        )}
        {isElevated &&
          adminItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
      </nav>

      {/* Settings & Collapse */}
      <div className="border-t border-gray-200 p-2 space-y-1">
        <Link
          href="/settings"
          onClick={onNavClick}
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-emerald-50 text-emerald-700"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft
            className={cn(
              "w-5 h-5 flex-shrink-0 transition-transform",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
