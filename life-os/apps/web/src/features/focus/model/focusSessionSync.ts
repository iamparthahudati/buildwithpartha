const CHANNEL_NAME = "lifeos-focus-session";

let sharedChannel: BroadcastChannel | undefined;

function getChannel(): BroadcastChannel | undefined {
  if (typeof BroadcastChannel === "undefined") return undefined;
  sharedChannel ??= new BroadcastChannel(CHANNEL_NAME);
  return sharedChannel;
}

/** Broadcasts no session content: receiving tabs only know to recover canonical state. */
export function publishFocusSessionChange(): void {
  getChannel()?.postMessage({ type: "focus-session-changed" });
}

export function subscribeToFocusSessionChanges(onChange: () => void): () => void {
  const channel = getChannel();
  if (!channel) return () => undefined;

  const handleMessage = (event: MessageEvent<unknown>) => {
    if (
      typeof event.data === "object" &&
      event.data !== null &&
      "type" in event.data &&
      event.data.type === "focus-session-changed"
    ) {
      onChange();
    }
  };
  channel.addEventListener("message", handleMessage);
  return () => channel.removeEventListener("message", handleMessage);
}
