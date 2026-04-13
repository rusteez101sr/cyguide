import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Profile, ChatSession, Message } from "../lib/types";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";

export default function Chat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [canChat, setCanChat] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const verified = !!(user?.email_confirmed_at);
      setCanChat(verified);

      let profileData: Profile | null = null;
      let sessionsData: ChatSession[] = [];

      if (user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        profileData =
          p ??
          ({
            id: user.id,
            full_name:
              (user.user_metadata as { full_name?: string } | undefined)?.full_name ||
              user.email?.split("@")[0] ||
              "Student",
            net_id: "",
            major: "Complete onboarding",
            class_year: "—",
            created_at: new Date().toISOString(),
          } satisfies Profile);

        const { data: s } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        sessionsData = verified ? s || [] : [];
      } else {
        profileData = {
          id: "guest",
          full_name: "Guest Student",
          net_id: "guest",
          major: "Exploratory",
          class_year: "Freshman",
          created_at: new Date().toISOString(),
        };
        sessionsData = [];
      }

      setProfile(profileData);
      setSessions(sessionsData);

      // If sessionId exists and we have a user, fetch messages
      if (sessionId && user && verified) {
        const { data: messagesData } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });
        
        setMessages(messagesData || []);
      } else {
        setMessages([]);
      }

      setLoading(false);
    }
    init();
  }, [sessionId, navigate]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCanChat(!!session?.user?.email_confirmed_at);
    });
    return () => subscription.unsubscribe();
  }, []);

  const canUseChat = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    return !!(user && user.email_confirmed_at);
  };

  const handleNewChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const verified = !!(user?.email_confirmed_at);

    if (!user || !verified) {
      navigate("/auth");
      return;
    }

    const { data: session } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        title: "New Chat",
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (session) {
      setSessions([session, ...sessions]);
      navigate(`/chat/${session.id}`);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    setChatError(null);

    if (!(await canUseChat())) {
      setChatError("Sign in with email and verify your code to use CyGuide chat.");
      navigate("/auth");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    let currentSessionId = sessionId;

    // Create session if it doesn't exist and user is logged in
    if (!currentSessionId && user) {
      const { data: session } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (session) {
        currentSessionId = session.id;
        setSessions([session, ...sessions]);
        navigate(`/chat/${session.id}`, { replace: true });
      } else {
        return;
      }
    }

    // Add user message to UI
    const userMessage: Message = {
      id: crypto.randomUUID(),
      session_id: currentSessionId || "guest-session",
      role: "user",
      content,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);

    // Save user message to DB if logged in
    if (user && currentSessionId) {
      await supabase.from("chat_messages").insert(userMessage);
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages,
          profile,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Chat request failed.";
        setChatError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        return;
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        session_id: currentSessionId || "guest-session",
        role: "assistant",
        content: data.reply,
        model_used: data.model,
        intent: data.intent,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (user && currentSessionId) {
        await supabase.from("chat_messages").insert(aiMessage);
      }
    } catch (error: unknown) {
      console.error("Failed to get AI response:", error);
      setChatError(error instanceof Error ? error.message : "Something went wrong.");
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sessions={sessions}
        currentSessionId={sessionId}
        profile={profile}
        onNewChat={handleNewChat}
        isGuestPreview={!canChat}
      />
      <main className="flex-1 flex flex-col min-w-0 relative">
        <ChatArea
          messages={messages}
          onSendMessage={handleSendMessage}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          guestPreview={!canChat}
          isSending={isSending}
          chatError={chatError}
          onDismissError={() => setChatError(null)}
        />
      </main>
    </div>
  );
}
