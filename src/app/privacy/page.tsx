import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-4">
        <Link href="/" className="font-semibold text-primary">PawCast</Link>
      </header>
      <main className="container mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">
          This is a placeholder. Add your privacy policy here (data collection, use of photos/videos, cookies, etc.).
        </p>
        <Link href="/" className="mt-6 inline-block text-primary hover:underline">Back to home</Link>
      </main>
    </div>
  );
}
