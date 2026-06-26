import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import ComposeMessageDialog from "@/components/compose-message-dialog";
import {
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  CheckCheck,
} from "lucide-react";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; role: string };

  const messages = await prisma.message.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    where: {
      OR: [{ senderId: user.id }, { recipientId: user.id }],
    },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
      familyCase: { select: { id: true, title: true } },
    },
  });

  const conflictCount = messages.filter((m) => m.hasConflict).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500 mt-1">
            View and send messages across all your cases.
          </p>
        </div>
        <ComposeMessageDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <MessageSquare className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
          <p className="text-sm text-gray-500">Total Messages</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
          <p className="text-2xl font-bold text-red-600">{conflictCount}</p>
          <p className="text-sm text-gray-500">Flagged for Conflict</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <CheckCheck className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-emerald-600">
            {messages.filter((m) => m.isRead).length}
          </p>
          <p className="text-sm text-gray-500">Read Messages</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            All Messages
          </h2>
        </div>

        {messages.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {messages.map((message) => (
              <Link
                key={message.id}
                href={`/cases/${message.familyCaseId}/messages`}
                className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                  {message.sender?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {message.subject || "No subject"}
                    </p>
                    {message.hasConflict && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {message.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {message.familyCase.title}
                    </span>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs text-gray-400">
                      {message.sender?.name || "Unknown"}
                    </span>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(message.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs capitalize">
                    {message.type}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No messages yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Messages from your cases will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
