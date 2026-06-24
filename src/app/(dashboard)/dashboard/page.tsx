import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  Calendar,
  FileText,
  MessageSquare,
  ArrowRight,
  Plus,
  AlertCircle,
  Activity,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; name?: string; role: string };

  // Fetch dashboard stats
  const activeCases = await prisma.familyCase.count({
    where: { status: "active" },
  });

  const pendingAssessments = await prisma.assessment.count({
    where: { status: "pending" },
  });

  const upcomingEvents = await prisma.calendarEvent.count({
    where: {
      startDate: { gte: new Date() },
    },
  });

  const activeAgreements = await prisma.agreement.count({
    where: { status: "active" },
  });

  const recentMessages = await prisma.message.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { name: true, image: true } },
    },
    where: {
      OR: [{ senderId: user.id }, { recipientId: user.id }],
    },
  });

  const nextEvents = await prisma.calendarEvent.findMany({
    take: 5,
    orderBy: { startDate: "asc" },
    where: {
      startDate: { gte: new Date() },
    },
    include: {
      user: { select: { name: true } },
    },
  });

  const statsCards = [
    {
      label: "Active Cases",
      value: activeCases,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/cases",
    },
    {
      label: "Pending Assessments",
      value: pendingAssessments,
      icon: ClipboardCheck,
      color: "text-amber-600",
      bg: "bg-amber-50",
      link: "/assessments",
    },
    {
      label: "Upcoming Events",
      value: upcomingEvents,
      icon: Calendar,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      link: "/calendar",
    },
    {
      label: "Active Agreements",
      value: activeAgreements,
      icon: FileText,
      color: "text-violet-600",
      bg: "bg-violet-50",
      link: "/agreements",
    },
  ];

  const isAdmin = user.role === "ADMIN" || user.role === "MEDIATOR";

  const quickActions = [
    ...(isAdmin
      ? [
          {
            label: "Create New Case" as const,
            description: "Start a new family case",
            icon: Plus,
            href: "/cases/new",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ]
      : []),
    {
      label: "Send Message",
      description: "Communicate with co-parent",
      icon: MessageSquare,
      href: "/messages",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Schedule Event",
      description: "Add to shared calendar",
      icon: Calendar,
      href: "/calendar",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "View Reports",
      description: "Check analytics and insights",
      icon: Activity,
      href: "/reports",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name ?? "User"}
        </h1>
        <p className="text-gray-500 mt-1">
          Here is an overview of your co-parenting coordination.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.link}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bg)}>
                  <Icon className={cn("w-5 h-5", stat.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-3">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent messages */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Recent Messages
            </h2>
            <Link
              href="/messages"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentMessages.length > 0 ? (
              recentMessages.map((message) => (
                <div
                  key={message.id}
                  className="px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                      {message.sender.name
                        ? message.sender.name.charAt(0).toUpperCase()
                        : "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {message.subject ?? "No subject"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        From {message.sender.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatRelativeTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No messages yet</p>
                <Link
                  href="/messages"
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1 inline-block"
                >
                  Send your first message
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Upcoming Events
            </h2>
            <Link
              href="/calendar"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {nextEvents.length > 0 ? (
              nextEvents.map((event) => (
                <div
                  key={event.id}
                  className="px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(event.startDate)} -{" "}
                        {event.user.name ?? "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No upcoming events</p>
                <Link
                  href="/calendar"
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1 inline-block"
                >
                  Schedule an event
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center gap-4"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    action.bg
                  )}
                >
                  <Icon className={cn("w-5 h-5", action.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
