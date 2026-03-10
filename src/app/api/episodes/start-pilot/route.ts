import { getOrCreateDbUser } from "@/lib/clerk-user";
import { runStartPilot, type StartPilotBody } from "@/lib/start-pilot";

export async function POST(req: Request) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as StartPilotBody;
    return runStartPilot(user, body);
  } catch (e) {
    console.error("episodes/start-pilot error:", e);
    const message = e instanceof Error ? e.message : "Failed to start pilot generation";
    const isInngestKeyError =
      message.includes("Event key not found") ||
      message.includes("401") ||
      message.toLowerCase().includes("inngest");
    return Response.json(
      {
        error: isInngestKeyError
          ? "Inngest event key missing or invalid. Add INNGEST_EVENT_KEY to .env.local (get it from the Inngest dev UI when you run npm run inngest:dev) and restart the app."
          : message,
      },
      { status: 500 }
    );
  }
}
