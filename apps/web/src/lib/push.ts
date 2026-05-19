import { api } from './api';

const VAPID_PUBLIC_KEY_STORAGE = 'vapidPublicKey';

async function getVapidPublicKey(): Promise<string | null> {
  const cached = sessionStorage.getItem(VAPID_PUBLIC_KEY_STORAGE);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${api.baseUrl}/api/notifications/vapid-public-key`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { key: string };
    if (data.key) sessionStorage.setItem(VAPID_PUBLIC_KEY_STORAGE, data.key);
    return data.key || null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) return null;

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  });

  return subscription;
}

export async function subscribeToEvent(eventId: string, minutesBefore: number): Promise<void> {
  const subscription = await subscribeToPush();
  if (!subscription) {
    throw new Error('Notificacoes nao disponiveis neste dispositivo');
  }

  const p256dh = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');
  if (!p256dh || !auth) {
    throw new Error('Chaves de push nao disponiveis');
  }

  await api.subscribeToNotification({
    eventId,
    minutesBefore,
    subscription: {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(p256dh),
        auth: arrayBufferToBase64(auth)
      }
    }
  });
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
