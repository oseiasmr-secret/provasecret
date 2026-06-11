export async function trackEvent(
  event_name: string,
  metadata: Record<string, any> = {},
  user_id?: string
) {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_name,
        metadata,
        user_id,
      }),
    });
  } catch (error) {
    console.error("Erro ao registrar evento:", error);
  }
}