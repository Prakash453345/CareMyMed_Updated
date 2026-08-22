import { create } from 'zustand';
import { apiService } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const globalChatCache = {};

export const useChatStore = create((set, get) => ({
  sessions: [],
  deletedSessionIds: new Set(),
  isLoading: false,
  activeSessionId: null,

  setSessions: (sessions) => {
    const deleted = get().deletedSessionIds;
    const filtered = (sessions || []).filter((s) => !deleted.has(s._id));
    set({ sessions: filtered });
  },

  setActiveSessionId: (id) => set({ activeSessionId: id }),

  fetchSessions: async (params = {}) => {
    set({ isLoading: true });
    try {
      const res = await apiService.chatbot.getSessions(params);
      const fetched = res.data || [];
      const deleted = get().deletedSessionIds;
      const filtered = fetched.filter((s) => !deleted.has(s._id));
      set({ sessions: filtered, isLoading: false });
      return filtered;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  deleteSession: async (sessionId, params = {}) => {
    if (!sessionId) return;

    // 1. Snapshot state before optimistic deletion
    const previousSessions = get().sessions;
    const previousActiveId = get().activeSessionId;
    const previousDeletedSet = new Set(get().deletedSessionIds);

    // 2. Immediately track deleted session ID atomically
    const deletedSet = new Set(previousDeletedSet);
    deletedSet.add(sessionId);

    // 3. Immediately update local state
    const nextSessions = previousSessions.filter((s) => s._id !== sessionId);

    set({
      deletedSessionIds: deletedSet,
      sessions: nextSessions,
      activeSessionId: previousActiveId === sessionId ? null : previousActiveId,
    });

    // 4. Clear local storage caches
    delete globalChatCache[sessionId];
    AsyncStorage.removeItem(`chatbot_session_${sessionId}`).catch(() => {});

    // 5. Perform background server deletion with rollback on failure
    try {
      await apiService.chatbot.deleteSession(sessionId, params);
    } catch (err) {
      console.warn('[useChatStore] Delete session API failed, rolling back state:', err?.message);
      set({
        deletedSessionIds: previousDeletedSet,
        sessions: previousSessions,
        activeSessionId: previousActiveId,
      });
      throw err;
    }
  },
}));

export default useChatStore;
