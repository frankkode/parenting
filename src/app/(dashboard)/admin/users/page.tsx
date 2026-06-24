"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  X,
  Shield,
  UserCog,
  Mail,
  Phone,
  Calendar,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

// ---------- Types ----------
type Role = "PARENT" | "MEDIATOR" | "ADMIN";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  profession: string | null;
  createdAt: string;
  active: boolean;
}

// ---------- Mock Data ----------
const mockUsers: UserData[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@example.com",
    role: "PARENT",
    phone: "+1 (555) 123-4567",
    profession: "Software Engineer",
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    active: true,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    role: "PARENT",
    phone: "+1 (555) 987-6543",
    profession: "Teacher",
    createdAt: new Date(Date.now() - 85 * 86400000).toISOString(),
    active: true,
  },
  {
    id: "3",
    name: "Dr. Sarah Johnson",
    email: "sarah.j@example.com",
    role: "MEDIATOR",
    phone: "+1 (555) 456-7890",
    profession: "Family Mediator",
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    active: true,
  },
  {
    id: "4",
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
    phone: null,
    profession: null,
    createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
    active: true,
  },
  {
    id: "5",
    name: "Michael Brown",
    email: "michael.b@example.com",
    role: "PARENT",
    phone: "+1 (555) 222-3333",
    profession: "Architect",
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    active: false,
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  // Create form
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<Role>("PARENT");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("PARENT");
  const [editPassword, setEditPassword] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleCounts = {
    total: users.length,
    admin: users.filter((u) => u.role === "ADMIN").length,
    mediator: users.filter((u) => u.role === "MEDIATOR").length,
    parent: users.filter((u) => u.role === "PARENT").length,
  };

  const handleCreateUser = async () => {
    if (!createName || !createEmail || !createPassword) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    const newUser: UserData = {
      id: Math.random().toString(36).substring(7),
      name: createName,
      email: createEmail,
      role: createRole,
      phone: null,
      profession: null,
      createdAt: new Date().toISOString(),
      active: true,
    };
    setUsers((prev) => [newUser, ...prev]);
    setIsSubmitting(false);
    setShowCreateDialog(false);
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("PARENT");
    toast.success("User created successfully");
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    if (editPassword) {
      toast.success("Password reset successfully");
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editingUser.id
          ? { ...u, name: editName, email: editEmail, role: editRole, phone: editPhone }
          : u
      )
    );
    setIsSubmitting(false);
    setShowEditDialog(false);
    setEditingUser(null);
    toast.success("User updated successfully");
  };

  const handleToggleActive = async (user: UserData) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, active: !u.active } : u
      )
    );
    toast.success(
      user.active
        ? "User deactivated successfully"
        : "User activated successfully"
    );
  };

  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setEditName(user.name ?? "");
    setEditEmail(user.email);
    setEditRole(user.role as Role);
    setEditPhone(user.phone ?? "");
    setEditPassword("");
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">
            Manage platform users, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Role Count Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RoleCountCard label="Total Users" value={roleCounts.total} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <RoleCountCard label="Admins" value={roleCounts.admin} icon={Shield} color="text-violet-600" bg="bg-violet-50" />
        <RoleCountCard label="Mediators" value={roleCounts.mediator} icon={UserCog} color="text-amber-600" bg="bg-amber-50" />
        <RoleCountCard label="Parents" value={roleCounts.parent} icon={Users} color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {(["ALL", "PARENT", "MEDIATOR", "ADMIN"] as const).map(
              (role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    roleFilter === role
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {role === "ALL" ? "All" : role.charAt(0) + role.slice(1).toLowerCase()}
                </button>
              )
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                          {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.name ?? "Unnamed"}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          user.role === "ADMIN"
                            ? "bg-violet-50 text-violet-700"
                            : user.role === "MEDIATOR"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700"
                        )}
                      >
                        {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {user.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </span>
                        ) : (
                          <span className="text-gray-400">No phone</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditDialog(user)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={cn(
                            "text-sm font-medium",
                            user.active
                              ? "text-red-600 hover:text-red-700"
                              : "text-emerald-600 hover:text-emerald-700"
                          )}
                        >
                          {user.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No Users Found
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {searchQuery
              ? "No users match your search criteria. Try adjusting your filters."
              : "No users have been created yet. Click &quot;Create User&quot; to add one."}
          </p>
        </div>
      )}

      {/* Create User Dialog */}
      {showCreateDialog && (
        <DialogOverlay onClose={() => setShowCreateDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Create User
              </h3>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="PARENT">Parent</option>
                  <option value="MEDIATOR">Mediator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isSubmitting}
                className={cn(
                  "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors",
                  isSubmitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  "Create User"
                )}
              </button>
            </div>
          </div>
        </DialogOverlay>
      )}

      {/* Edit User Dialog */}
      {showEditDialog && editingUser && (
        <DialogOverlay onClose={() => setShowEditDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit User
              </h3>
              <button
                onClick={() => setShowEditDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="PARENT">Parent</option>
                  <option value="MEDIATOR">Mediator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reset Password
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                disabled={isSubmitting}
                className={cn(
                  "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors",
                  isSubmitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </DialogOverlay>
      )}
    </div>
  );
}

// ---------- Sub Components ----------
function RoleCountCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div
          className={cn("w-9 h-9 rounded-lg flex items-center justify-center", bg)}
        >
          <Icon className={cn("w-4.5 h-4.5", color)} />
        </div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function DialogOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 mx-4">{children}</div>
    </div>
  );
}
