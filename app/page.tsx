export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-16 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">
        The Synthesis
      </h1>
      <p className="text-zinc-400 text-sm mb-10">
        Telegram motivation bot — Next.js, Supabase, Gemini 2.5 Flash, Vercel
        Cron.
      </p>
      <section className="space-y-6 text-sm leading-relaxed text-zinc-300">
        <div>
          <h2 className="text-zinc-100 font-medium mb-2">1. Env</h2>
          <p>
            Copy <code className="text-amber-200/90">.env.example</code> to{" "}
            <code className="text-amber-200/90">.env.local</code> and fill
            Supabase, Telegram, Google AI, and{" "}
            <code className="text-amber-200/90">CRON_SECRET</code>.
          </p>
        </div>
        <div>
          <h2 className="text-zinc-100 font-medium mb-2">2. Database</h2>
          <p>
            Link the project and run{" "}
            <code className="text-amber-200/90">npm run db:push</code> to apply{" "}
            <code className="text-amber-200/90">supabase/migrations/</code>.
          </p>
        </div>
        <div>
          <h2 className="text-zinc-100 font-medium mb-2">3. Telegram webhook</h2>
          <p className="mb-2">
            Point your bot webhook to{" "}
            <code className="text-amber-200/90 break-all">
              https://&lt;your-domain&gt;/api/webhook
            </code>
            . Optional: set{" "}
            <code className="text-amber-200/90">secret_token</code> matching{" "}
            <code className="text-amber-200/90">TELEGRAM_WEBHOOK_SECRET</code>.
          </p>
          <p className="text-zinc-500 text-xs">
            Users: <code className="text-zinc-400">/start</code> to subscribe,{" "}
            <code className="text-zinc-400">/stop</code> to pause.
          </p>
        </div>
        <div>
          <h2 className="text-zinc-100 font-medium mb-2">4. Cron</h2>
          <p>
            <code className="text-amber-200/90">vercel.json</code> runs
            broadcasts at 08:00, 14:00, and 21:00{" "}
            <span className="text-zinc-500">(UTC on Vercel — adjust if needed)</span>
            . Set the same <code className="text-amber-200/90">CRON_SECRET</code>{" "}
            in Vercel; cron requests must send{" "}
            <code className="text-amber-200/90">
              Authorization: Bearer &lt;CRON_SECRET&gt;
            </code>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
