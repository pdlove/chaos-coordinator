import { api } from "./api/client";

/** True in any browser that could plausibly support Web Push (Safari on iOS only once
 * installed to the home screen — that's a runtime check the caller does, not this one). */
export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

async function registerServiceWorker() {
  return navigator.serviceWorker.register("/sw.js");
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Whether this browser already has an active push subscription (independent of Notification
 * permission, though in practice they track together). */
export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** Requests Notification permission, registers the service worker, subscribes with the
 * server's VAPID key, and registers the subscription with the backend. Throws if permission is
 * denied — the caller (NotificationsSettings) surfaces that to the user. */
export async function enablePushNotifications() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("permission_denied");

  const registration = await registerServiceWorker();
  const { publicKey } = await api.getVapidPublicKey();
  if (!publicKey) throw new Error("push_not_configured");

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const keys = subscription.toJSON().keys;
  await api.subscribeToPush({ endpoint: subscription.endpoint, p256dh: keys?.p256dh ?? "", auth: keys?.auth ?? "" });
}

export async function disablePushNotifications() {
  const subscription = await getPushSubscription();
  if (!subscription) return;

  await subscription.unsubscribe();
  await api.unsubscribeFromPush({ endpoint: subscription.endpoint });
}
