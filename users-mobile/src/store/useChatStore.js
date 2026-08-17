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

    // 1. Immediately track deleted session ID atomically
    const deletedSet = new Set(get().deletedSessionIds);
    deletedSet.add(sessionId);

    // 2. Immediately update local state
    const currentSessions = get().sessions;
    const nextSessions = currentSessions.filter((s) => s._id !== sessionId);

    set({
      deletedSessionIds: deletedSet,
      sessions: nextSessions,
      activeSessionId: get().activeSessionId === sessionId ? null : get().activeSessionId,
    });

    // 3. Clear local storage caches
    delete globalChatCache[sessionId];
    AsyncStorage.removeItem(`chatbot_session_${sessionId}`).catch(() => {});

    // 4. Perform background server deletion
    try {
      await apiService.chatbot.deleteSession(sessionId, params);
    } catch (err) {
      console.warn('[useChatStore] Background delete session error:', err?.message);
    }
  },
}));

export default useChatStore;
