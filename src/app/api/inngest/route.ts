import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  generateEpisodeFunction,
  generateAvatarsFunction,
  dailyEpisodeCron,
  onboardingSequenceCron,
  previewGenerateFunction,
  dogLoraTrainFunction,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateEpisodeFunction,
    generateAvatarsFunction,
    dailyEpisodeCron,
    onboardingSequenceCron,
    previewGenerateFunction,
    dogLoraTrainFunction,
  ],
});
