import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChatMessage {
  id: number;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface ChatRoom {
  id: string;
  name: string;
  is_default: boolean;
}

export const useChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [defaultRoom, setDefaultRoom] = useState<ChatRoom | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch default room
  useEffect(() => {
    const fetchDefaultRoom = async () => {
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("is_default", true)
        .single();

      if (error) {
        console.error("Error fetching default room:", error);
        return;
      }

      setDefaultRoom(data);
    };

    fetchDefaultRoom();
  }, []);

  // Fetch initial messages and set up realtime subscription
  useEffect(() => {
    if (!defaultRoom || !user) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", defaultRoom.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    };

    fetchMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel(`chat:${defaultRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${defaultRoom.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [defaultRoom, user]);

  // Calculate unread count
  useEffect(() => {
    if (!defaultRoom || !user) return;

    const calculateUnread = async () => {
      // Get last read timestamp
      const { data: readData } = await supabase
        .from("chat_reads")
        .select("last_read_at")
        .eq("room_id", defaultRoom.id)
        .eq("user_id", user.id)
        .single();

      const lastReadAt = readData?.last_read_at || "epoch";

      // Count unread messages
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("room_id", defaultRoom.id)
        .gt("created_at", lastReadAt)
        .neq("user_id", user.id); // Don't count own messages

      setUnreadCount(count || 0);
    };

    calculateUnread();
  }, [messages, defaultRoom, user]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!defaultRoom || !user) return;

    const { error } = await supabase
      .from("chat_reads")
      .upsert({
        room_id: defaultRoom.id,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Error marking as read:", error);
    } else {
      setUnreadCount(0);
    }
  }, [defaultRoom, user]);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!defaultRoom || !user || !content.trim()) return;

      // Optimistic update
      const optimisticMessage: ChatMessage = {
        id: Date.now(), // Temporary ID
        room_id: defaultRoom.id,
        user_id: user.id,
        content,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      const { error } = await supabase.from("chat_messages").insert({
        room_id: defaultRoom.id,
        user_id: user.id,
        content,
      });

      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      }
    },
    [defaultRoom, user]
  );

  return {
    messages,
    unreadCount,
    loading,
    onlineCount,
    sendMessage,
    markAsRead,
    defaultRoom,
  };
};
