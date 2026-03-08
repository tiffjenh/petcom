import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fredoka, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const fontHeading = Fredoka({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const fontBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PawCast — Your Dog Stars in a Pixar-Style Sitcom",
  description:
    "Your dog is the main character with an inner monologue. Your household is the supporting cast. A new ~5-minute episode every day. Share to TikTok and Instagram Reels.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secretKey = process.env.CLERK_SECRET_KEY ?? "";
  const hasClerk =
    !!secretKey &&
    !!publishableKey &&
    (publishableKey.startsWith("pk_test_") || publishableKey.startsWith("pk_live_"));
  const content = (
    <html lang="en" className={`${fontHeading.variable} ${fontBody.variable}`}>
      <body className="min-h-screen antialiased" data-has-clerk={hasClerk ? "true" : "false"}>
        {children}
        <Toaster />
      </body>
    </html>
  );
  return hasClerk ? (
    <ClerkProvider afterSignUpUrl="/onboarding" afterSignInUrl="/dashboard">
      {content}
    </ClerkProvider>
  ) : (
    content
  );
}
