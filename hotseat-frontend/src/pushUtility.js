function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export async function subscribeToPushNotifications(userId, serverUrl) {
  if (!VAPID_PUBLIC_KEY) {
    console.error('VAPID public key not configured. Set VITE_VAPID_PUBLIC_KEY in .env.');
    return;
  }

  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported by this browser.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const publicVapidKey = VAPID_PUBLIC_KEY;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    await fetch(`${serverUrl}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, subscription })
    });

    console.log('Push notification subscription saved.');
  } catch (error) {
    console.error('Failed to subscribe for push notifications:', error);
  }
}
