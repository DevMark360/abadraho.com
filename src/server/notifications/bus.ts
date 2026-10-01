import { EventEmitter } from "events";

export type NotificationPayload = {
  id: number;
  recipientType: string;
  recipientId: number;
  actorType?: string | null;
  actorId?: number | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

type Listener = (notification: NotificationPayload) => void;

const bus = new EventEmitter();
bus.setMaxListeners(100);

export function emitNotification(n: NotificationPayload) {
  bus.emit(`notification:${n.recipientType}:${n.recipientId}`, n);
}

export function subscribeNotifications(
  recipientType: string,
  recipientId: number,
  cb: Listener
): () => void {
  // Admin always receives broadcast (id=0) notifications
  const keys =
    recipientType === "admin"
      ? [`notification:admin:0`]
      : [`notification:${recipientType}:${recipientId}`];

  keys.forEach((key) => bus.on(key, cb));
  return () => keys.forEach((key) => bus.off(key, cb));
}
