"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Bell, Menu, LogOut, User, Settings, ChevronDown } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  onMenuToggle?: () => void;
  showMobileMenu?: boolean;
}

export function Header({ user, onMenuToggle, showMobileMenu }: HeaderProps) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Welcome back,</h2>
          <p className="text-sm font-semibold text-gray-900">{user.name ?? "User"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 py-2">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                </div>
                <div className="py-2 px-4 text-sm text-gray-500">No new notifications</div>
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-medium">
              {initials}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 py-1">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name ?? "User"}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email ?? ""}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full capitalize">
                    {user.role ?? "user"}
                  </span>
                </div>
                <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setShowDropdown(false)}>
                  <Settings className="w-4 h-4" />Settings
                </Link>
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" />Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
