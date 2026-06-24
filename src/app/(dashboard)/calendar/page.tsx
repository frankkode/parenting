import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, User } from "lucide-react";

const EVENT_COLORS: Record<string, string> = {
  pickup: "bg-blue-100 border-blue-300 text-blue-800",
  dropoff: "bg-purple-100 border-purple-300 text-purple-800",
  appointment: "bg-green-100 border-green-300 text-green-800",
  school: "bg-amber-100 border-amber-300 text-amber-800",
  activity: "bg-pink-100 border-pink-300 text-pink-800",
  holiday: "bg-red-100 border-red-300 text-red-800",
  other: "bg-gray-100 border-gray-300 text-gray-800",
};

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; role: string };
  const isAdmin = user.role === "ADMIN" || user.role === "MEDIATOR";

  const caseWhere = isAdmin ? {} : {
    OR: [{ parentAId: user.id }, { parentBId: user.id }, { mediatorId: user.id }],
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const events = await prisma.calendarEvent.findMany({
    orderBy: { startDate: "asc" },
    where: {
      AND: [
        {
          OR: [
            { startDate: { gte: startOfMonth, lte: endOfMonth } },
            { startDate: { gte: now } },
          ],
        },
        ...(isAdmin ? [] : [{ familyCase: caseWhere }]),
      ],
    },
    include: {
      user: { select: { id: true, name: true } },
      familyCase: { select: { id: true, title: true } },
    },
    take: 50,
  });

  const upcomingEvents = events.filter(
    (e) => new Date(e.startDate) >= now
  );
  const monthEvents = events.filter(
    (e) =>
      new Date(e.startDate) >= startOfMonth &&
      new Date(e.startDate) <= endOfMonth
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-500 mt-1">
          View scheduled events across all your cases.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <CalendarIcon className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {monthEvents.length}
          </p>
          <p className="text-sm text-gray-500">
            Events This Month
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <Clock className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-emerald-600">
            {upcomingEvents.length}
          </p>
          <p className="text-sm text-gray-500">Upcoming Events</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <User className="w-5 h-5 text-violet-600 mb-2" />
          <p className="text-2xl font-bold text-violet-600">
            {new Set(events.map((e) => e.familyCaseId)).size}
          </p>
          <p className="text-sm text-gray-500">Active Cases</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Upcoming Events
          </h2>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/cases/${event.familyCaseId}/calendar`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-1 h-10 rounded-full flex-shrink-0 ${
                    {
                      pickup: "bg-blue-500",
                      dropoff: "bg-purple-500",
                      appointment: "bg-green-500",
                      school: "bg-amber-500",
                      activity: "bg-pink-500",
                      holiday: "bg-red-500",
                      other: "bg-gray-500",
                    }[event.type] || "bg-gray-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{formatDate(event.startDate)}</span>
                    <span className="text-gray-300">|</span>
                    <span>{event.familyCase.title}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={`capitalize ${EVENT_COLORS[event.type] || EVENT_COLORS.other}`}
                  >
                    {event.type}
                  </Badge>
                  {event.user && (
                    <span className="text-xs text-gray-400">
                      {event.user.name}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">
              No upcoming events
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Events from your cases will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
