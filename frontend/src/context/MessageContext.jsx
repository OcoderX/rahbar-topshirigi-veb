import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { messageApi } from '../api/endpoints';

const MessageContext = createContext(null);

export function MessageProvider({ children }) {
  const { user } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialUser, setComposeInitialUser] = useState(null);
  const [composeInitialTask, setComposeInitialTask] = useState(null);

  const prevUnreadRef = useRef(0);

  // Fetch unread count & conversations
  const refreshInbox = useCallback(async () => {
    if (!user) return;
    try {
      const [count, inboxData] = await Promise.all([
        messageApi.unreadCount(),
        messageApi.inbox(),
      ]);
      setUnreadCount(count);
      setConversations(inboxData || []);

      // If new unread message arrived, optional subtle sound/vibration could trigger
      if (count > prevUnreadRef.current && count > 0) {
        try {
          if ('vibrate' in navigator) navigator.vibrate(100);
        } catch (_) {}
      }
      prevUnreadRef.current = count;
    } catch (err) {
      // Quiet fail on network blips
    }
  }, [user]);

  // Periodic polling every 5 seconds
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setConversations([]);
      return;
    }

    refreshInbox();
    const interval = setInterval(refreshInbox, 5000);
    return () => clearInterval(interval);
  }, [user, refreshInbox]);

  const openMessenger = useCallback((options = {}) => {
    setIsMessengerOpen(true);
    if (options.partner) {
      setActivePartner(options.partner);
    }
    if (options.task !== undefined) {
      setActiveTask(options.task);
    }
    if (options.compose) {
      setIsComposeOpen(true);
    }
  }, []);

  const closeMessenger = useCallback(() => {
    setIsMessengerOpen(false);
  }, []);

  const toggleMessenger = useCallback(() => {
    setIsMessengerOpen((prev) => !prev);
  }, []);

  const openChatWithUser = useCallback((partnerUser, task = null) => {
    if (!partnerUser) return;
    setActivePartner(partnerUser);
    setActiveTask(task || null);
    setIsMessengerOpen(true);
    setIsComposeOpen(false);
  }, []);

  const openCompose = useCallback((initialUser = null, initialTask = null) => {
    setComposeInitialUser(initialUser);
    setComposeInitialTask(initialTask);
    setIsComposeOpen(true);
  }, []);

  const closeCompose = useCallback(() => {
    setIsComposeOpen(false);
    setComposeInitialUser(null);
    setComposeInitialTask(null);
  }, []);

  const selectConversation = useCallback((partner, task = null) => {
    setActivePartner(partner);
    setActiveTask(task || null);
  }, []);

  const backToInboxList = useCallback(() => {
    setActivePartner(null);
    setActiveTask(null);
    refreshInbox();
  }, [refreshInbox]);

  return (
    <MessageContext.Provider
      value={{
        unreadCount,
        conversations,
        activePartner,
        setActivePartner,
        activeTask,
        setActiveTask,
        isMessengerOpen,
        isComposeOpen,
        composeInitialUser,
        composeInitialTask,
        openMessenger,
        closeMessenger,
        toggleMessenger,
        openChatWithUser,
        openCompose,
        closeCompose,
        selectConversation,
        backToInboxList,
        refreshInbox,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export function useMessenger() {
  const ctx = useContext(MessageContext);
  if (!ctx) {
    throw new Error('useMessenger must be used within a MessageProvider');
  }
  return ctx;
}
