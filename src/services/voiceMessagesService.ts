import api from './api';
import { getApiBaseUrl } from '../config/api.config';

export interface CoachVoiceMessage {
  id: string;
  exerciseId: string;
  body: string;
  hasAudio: boolean;
  durationSec: number;
  createdAt: string;
  read: boolean;
  /** 'exercise' = written once for everyone on this exercise; 'client' = written for this client only. */
  scope: 'exercise' | 'client';
}

export const voiceMessagesService = {
  forExercise: async (exerciseId: string): Promise<CoachVoiceMessage[]> =>
    (await api.get<{ messages: CoachVoiceMessage[] }>(`/voice-messages/exercises/${exerciseId}`)).data.messages,

  unreadCount: async (): Promise<{ unread: number; byExercise: Record<string, number> }> =>
    (await api.get('/voice-messages/unread-count')).data,

  markRead: async (ids: string[]): Promise<void> => {
    if (ids.length) await api.post('/voice-messages/read', { ids });
  },

  /** Private audio: the player must send the user's token with the request. */
  audioUrl: (id: string): string => `${getApiBaseUrl()}/voice-messages/${id}/audio`,
};
