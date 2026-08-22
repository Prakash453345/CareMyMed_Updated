import useChatStore from '../../src/store/useChatStore';
import { apiService } from '../../src/lib/api';

jest.mock('../../src/lib/api', () => ({
  apiService: {
    chatbot: {
      getSessions: jest.fn(),
      deleteSession: jest.fn().mockResolvedValue({ data: { success: true } }),
    },
  },
}));

describe('useChatStore Atomic Deletion & Stale Response Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.setState({
      sessions: [],
      deletedSessionIds: new Set(),
      isLoading: false,
      activeSessionId: null,
    });
  });

  it('atomically tracks deleted session IDs and removes session from state', async () => {
    const s1 = { _id: 'chat_1', title: 'Chat 1' };
    const s2 = { _id: 'chat_2', title: 'Chat 2' };

    useChatStore.setState({ sessions: [s1, s2] });

    await useChatStore.getState().deleteSession('chat_1');

    const state = useChatStore.getState();
    expect(state.sessions).toEqual([s2]);
    expect(state.deletedSessionIds.has('chat_1')).toBe(true);
    expect(apiService.chatbot.deleteSession).toHaveBeenCalledWith('chat_1', {});
  });

  it('filters out deleted sessions from stale incoming API responses', async () => {
    // Session chat_1 was deleted locally
    const deletedSet = new Set(['chat_1']);
    useChatStore.setState({ deletedSessionIds: deletedSet });

    // Stale API response arrives containing chat_1 and chat_2
    const staleResponseData = [{ _id: 'chat_1', title: 'Chat 1' }, { _id: 'chat_2', title: 'Chat 2' }];
    apiService.chatbot.getSessions.mockResolvedValueOnce({ data: staleResponseData });

    const result = await useChatStore.getState().fetchSessions();

    expect(result).toEqual([{ _id: 'chat_2', title: 'Chat 2' }]);
    expect(useChatStore.getState().sessions).toEqual([{ _id: 'chat_2', title: 'Chat 2' }]);
  });

  it('rolls back session state and removes deleted marker when delete API fails', async () => {
    const s1 = { _id: 'chat_1', title: 'Chat 1' };
    const s2 = { _id: 'chat_2', title: 'Chat 2' };

    useChatStore.setState({
      sessions: [s1, s2],
      activeSessionId: 'chat_1',
      deletedSessionIds: new Set(),
    });

    apiService.chatbot.deleteSession.mockRejectedValueOnce(new Error('Network error'));

    await expect(useChatStore.getState().deleteSession('chat_1')).rejects.toThrow('Network error');

    const state = useChatStore.getState();
    expect(state.sessions).toEqual([s1, s2]);
    expect(state.activeSessionId).toBe('chat_1');
    expect(state.deletedSessionIds.has('chat_1')).toBe(false);
  });
});
