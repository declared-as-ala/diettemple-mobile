import api from './api';
import { getApiBaseUrl } from '../config/api.config';

export type ComplaintStatus = 'new' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed';
export type ComplaintCategory = 'technical' | 'training' | 'nutrition' | 'billing' | 'order' | 'other';

export const COMPLAINT_CATEGORIES: Array<{ key: ComplaintCategory; label: string; icon: string }> = [
  { key: 'technical', label: 'Problème technique', icon: 'bug-outline' },
  { key: 'training', label: "Programme d'entraînement", icon: 'barbell-outline' },
  { key: 'nutrition', label: 'Programme nutritionnel', icon: 'nutrition-outline' },
  { key: 'billing', label: 'Abonnement et paiement', icon: 'card-outline' },
  { key: 'order', label: 'Commande et livraison', icon: 'cube-outline' },
  { key: 'other', label: 'Autre', icon: 'help-circle-outline' },
];

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  new: 'Nouvelle',
  in_progress: 'En cours de traitement',
  waiting_client: 'En attente de réponse',
  resolved: 'Résolue',
  closed: 'Fermée',
};

export interface ComplaintAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
}

export interface ComplaintMessage {
  id: string;
  authorType: 'client' | 'admin';
  body: string;
  createdAt: string;
  attachments: ComplaintAttachment[];
}

export interface ComplaintSummary {
  id: string;
  reference: string;
  category: ComplaintCategory;
  categoryLabel: string;
  subject: string;
  status: ComplaintStatus;
  statusLabel: string;
  unread: number;
  createdAt: string;
  lastMessageAt: string;
  resolvedAt: string | null;
  lastMessagePreview: string;
  messageCount?: number;
}

export interface ComplaintDetail extends ComplaintSummary {
  messages: ComplaintMessage[];
}

/** A picked image, as expo-image-picker returns it. */
export interface PickedImage {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
}

function toForm(fields: Record<string, string>, images: PickedImage[]): FormData {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  images.forEach((img, i) => {
    const name = img.name || `photo-${i + 1}.jpg`;
    // React Native's FormData accepts { uri, name, type } as a file part.
    form.append('attachments', { uri: img.uri, name, type: img.mimeType || 'image/jpeg' } as unknown as Blob);
  });
  return form;
}

// Same upload style as the existing check-in photo (React Native FormData with { uri, name, type } parts).
const multipart = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 } as const;

export const complaintsService = {
  list: async (): Promise<ComplaintSummary[]> => (await api.get<{ complaints: ComplaintSummary[] }>('/complaints')).data.complaints,

  get: async (id: string): Promise<ComplaintDetail> => (await api.get<{ complaint: ComplaintDetail }>(`/complaints/${id}`)).data.complaint,

  unreadCount: async (): Promise<number> => (await api.get<{ unread: number }>('/complaints/unread-count')).data.unread,

  create: async (data: { category: ComplaintCategory; subject: string; description: string; images: PickedImage[] }): Promise<ComplaintDetail> => {
    const form = toForm({ category: data.category, subject: data.subject, description: data.description }, data.images);
    return (await api.post<{ complaint: ComplaintDetail }>('/complaints', form, multipart)).data.complaint;
  },

  reply: async (id: string, body: string, images: PickedImage[]): Promise<ComplaintDetail> => {
    const form = toForm({ body }, images);
    return (await api.post<{ complaint: ComplaintDetail }>(`/complaints/${id}/messages`, form, multipart)).data.complaint;
  },

  /** Attachments are private: the image request must carry the user's token. */
  attachmentUrl: (complaintId: string, attachmentId: string): string => `${getApiBaseUrl()}/complaints/${complaintId}/attachments/${attachmentId}`,
};

export function complaintErrorMessage(e: unknown): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || 'Une erreur est survenue. Vérifiez votre connexion et réessayez.';
}
