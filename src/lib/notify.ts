/**
 * Notifications: email (Resend) + web push (PWA).
 * Episode ready: daily email with thumbnail + watch link; same trigger for push when enabled.
 * Onboarding sequence: Welcome, Day 3 share reminder, Day 7 upgrade prompt.
 */

import { prisma } from "@/lib/prisma";

const baseUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://app.pawcast.com";

async function resendSend(params: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[notify] Resend skipped (no API key):", params.subject);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "PawCast <noreply@pawcast.com>",
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!res.ok) {
    console.warn("[notify] Resend failed:", await res.text());
    return false;
  }
  return true;
}

/** Onboarding sequence: welcome email after first setup. */
export async function sendWelcomeEmail(userEmail: string): Promise<void> {
  await resendSend({
    to: userEmail,
    subject: "Welcome to PawCast 🐾",
    html: `
      <p>Your dog’s show is almost ready!</p>
      <p>We’re generating their Pixar-style avatars. Once that’s done, your first episode will start brewing.</p>
      <p><a href="${baseUrl()}/dashboard" style="display:inline-block;background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Go to dashboard</a></p>
    `,
  });
}

/** Onboarding sequence Day 3: share reminder. */
export async function sendShareReminderEmail(userEmail: string, dashboardUrl: string): Promise<void> {
  await resendSend({
    to: userEmail,
    subject: "Share your episode! 🎬",
    html: `
      <p>Your fans (and your dog) are waiting!</p>
      <p>Share your latest PawCast episode to TikTok or Instagram Reels and let the world see your dog’s inner monologue.</p>
      <p><a href="${dashboardUrl}" style="display:inline-block;background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Open dashboard</a></p>
    `,
  });
}

/** Onboarding sequence Day 7: upgrade prompt. */
export async function sendUpgradePromptEmail(userEmail: string): Promise<void> {
  await resendSend({
    to: userEmail,
    subject: "Unlock daily episodes & more 🐕",
    html: `
      <p>You’ve been with PawCast for a week — thanks for having your dog star in their own show!</p>
      <p>Upgrade to Pro for daily episodes, more dogs and cast, unlimited archive, and no watermark.</p>
      <p><a href="${baseUrl()}/dashboard/account" style="display:inline-block;background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">View plans</a></p>
    `,
  });
}

import webpush from "web-push";

export type NotifyEpisodeReadyParams = {
  episodeTitle: string;
  episodeId: string;
  thumbnailUrl: string | null;
  userId: string;
};

/** Send "Your episode is ready" email (with thumbnail + link) and/or web push based on user preferences. */
export async function notifyEpisodeReady(
  params: NotifyEpisodeReadyParams
): Promise<void> {
  const { episodeTitle, episodeId, thumbnailUrl, userId } = params;
  const message = `🎬 Your episode is ready! ${episodeTitle}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.pawcast.com";
  const watchUrl = `${baseUrl}/dashboard/episodes/${episodeId}`;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { pushSubscriptions: true },
  });
  if (!user) return;

  if (user.notificationEmail && user.email) {
    await sendEpisodeReadyEmail({
      to: user.email,
      subject: message,
      episodeTitle,
      episodeId,
      watchUrl,
      thumbnailUrl,
    });
  }

  if (user.notificationPush && user.pushSubscriptions.length > 0) {
    await sendEpisodeReadyPush({
      subscriptions: user.pushSubscriptions,
      title: message,
      body: "Tap to watch now",
      url: watchUrl,
      thumbnailUrl,
    });
  }
}

async function sendEpisodeReadyEmail(params: {
  to: string;
  subject: string;
  episodeTitle: string;
  episodeId: string;
  watchUrl: string;
  thumbnailUrl: string | null;
}): Promise<void> {
  const { to, subject, watchUrl, thumbnailUrl } = params;

  if (!process.env.RESEND_API_KEY) {
    console.log("[notify] Email skipped (no RESEND_API_KEY):", subject, "->", to);
    return;
  }

  const thumbHtml = thumbnailUrl
    ? `<img src="${thumbnailUrl}" alt="" width="320" style="max-width:100%;border-radius:8px;margin:12px 0;" />`
    : "";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "PawCast <noreply@pawcast.com>",
      to,
      subject,
      html: `
        <p>${subject}</p>
        ${thumbHtml}
        <p><a href="${watchUrl}" style="display:inline-block;background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Watch now</a></p>
      `,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn("[notify] Resend failed:", err);
  }
}

async function sendEpisodeReadyPush(params: {
  subscriptions: { endpoint: string; p256dh: string; auth: string }[];
  title: string;
  body: string;
  url: string;
  thumbnailUrl: string | null;
}): Promise<void> {
  const { subscriptions, title, body, url, thumbnailUrl } = params;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.log("[notify] Push skipped (no VAPID keys)");
    return;
  }

  webpush.setVapidDetails(
    "mailto:support@pawcast.com",
    publicKey,
    privateKey
  );

  const payload = JSON.stringify({
    title,
    body,
    url,
    icon: thumbnailUrl ?? undefined,
  });

  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        { TTL: 86400 }
      )
    )
  );
}
