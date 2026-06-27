"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Loader2,
  Send,
  AlertTriangle,
  CheckCheck,
  User,
} from "lucide-react";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  subject: string | null;
  content: string;
  type: string;
  isRead: boolean;
  hasConflict: boolean;
  conflictScore: number | null;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    image?: string;
    role: string;
  } | null;
  recipient: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export default function MessagesPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id: string })?.id || "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/messages?caseId=${caseId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("[FETCH_MESSAGES]", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          subject: newSubject.trim() || null,
          content: newMessage.trim(),
          type: "general",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send message");
      }

      setNewMessage("");
      setNewSubject("");
      toast.success("Message sent");
      fetchMessages();
    } catch (error: any) {
      console.error("[SEND_MESSAGE]", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const conflictMessages = messages.filter((m) => m.hasConflict);

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-6 animate-fade-in">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-18rem)]">
              <div className="px-4 pb-4 space-y-1">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">All Messages</span>
                    <Badge variant="secondary">{messages.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Case communication thread
                  </p>
                </div>

                {conflictMessages.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-sm text-red-700">
                        Flagged Messages
                      </span>
                    </div>
                    <p className="text-xs text-red-600">
                      {conflictMessages.length} message(s) with conflict detected
                    </p>
                  </div>
                )}

                <Separator className="my-3" />

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Message Types
                  </p>
                  {["general", "schedule", "agreement", "concern", "notification"].map(
                    (type) => {
                      const count = messages.filter((m) => m.type === type)
                        .length;
                      if (count === 0) return null;
                      return (
                        <div
                          key={type}
                          className="flex items-center justify-between p-2 rounded-md"
                        >
                          <span className="text-sm capitalize">{type}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main chat area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
            <Badge variant="secondary" className="ml-2">
              {messages.length} total
            </Badge>
            {conflictMessages.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {conflictMessages.length} flagged
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Messages Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Start the conversation by sending your first message.
                Practice respectful and constructive communication.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...messages].reverse().map((message) => {
                const isOwn = message.sender?.id === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      isOwn ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={message.sender?.image || ""} />
                      <AvatarFallback>
                        {message.sender?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`max-w-[70%] ${
                        isOwn ? "items-end" : "items-start"
                      } flex flex-col`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {message.sender?.name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(message.createdAt)}
                        </span>
                        {message.hasConflict && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                      </div>

                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : message.hasConflict
                            ? "bg-red-50 border border-red-200"
                            : "bg-muted"
                        }`}
                      >
                        {message.subject && (
                          <p className="text-xs font-semibold mb-1 opacity-80">
                            {message.subject}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {message.type}
                        </Badge>
                        {message.isRead && isOwn && (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Message input */}
        <div className="p-4 border-t">
          <div className="space-y-2">
            <Input
              placeholder="Subject (optional)"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] flex-1"
                rows={2}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                className="self-end"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
