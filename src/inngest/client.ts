import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "pawcast",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
