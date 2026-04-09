import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  generateEpisodeFunction,
  generateAvatarsFunction,
  generateCastAvatarFunction,
  dailyEpisodeCron,
  weeklyEpisodeCron,
  onboardingSequenceCron,
  previewGenerateFunction,
  dogLoraTrainFunction,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateEpisodeFunction,
    generateAvatarsFunction,
    generateCastAvatarFunction,
    dailyEpisodeCron,
    weeklyEpisodeCron,
    onboardingSequenceCron,
    previewGenerateFunction,
    dogLoraTrainFunction,
  ],
});
