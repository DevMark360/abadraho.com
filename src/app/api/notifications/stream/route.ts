import { resolveNotificationRecipient } from "@/lib/notifications/recipient";
import { subscribeNotifications, type NotificationPayload } from "@/server/notifications/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  let recipient;
  try {
    recipient = await resolveNotificationRecipient();
  } catch (e) {
    console.error("[notifications/stream] resolve error:", e);
    return new Response(JSON.stringify({ error: "Auth failed" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!recipient) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial comment to keep connection open
      try {
        controller.enqueue(encoder.encode(":ok\n\n"));
      } catch {
        return;
      }

      // Subscribe to real-time notifications
      unsubscribe = subscribeNotifications(
        recipient.type,
        recipient.id,
        (notification: NotificationPayload) => {
          if (closed) return;
          try {
            const data = `data: ${JSON.stringify(notification)}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch {
            // Controller closed — clean up
            closed = true;
            cleanup();
          }
        }
      );

      // Heartbeat every 30s to keep connection alive
      heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat!);
          return;
        }
        try {
          controller.enqueue(encoder.encode(":heartbeat\n\n"));
        } catch {
          closed = true;
          cleanup();
        }
      }, 30000);
    },
    cancel() {
      closed = true;
      cleanup();
    },
  });

  function cleanup() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
