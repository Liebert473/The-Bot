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
            <code className="text-amber-200/90">TELEGRAM_WEBHOOK_SECRET</code>{" "}
            must match Telegram{" "}
            <code className="text-amber-200/90">secret_token</code> exactly. If
            it is set in Vercel but not on the webhook, Telegram gets{" "}
            <code className="text-zinc-400">401</code> and nothing is written to
            Supabase.
          </p>
          <p className="text-zinc-500 text-xs mt-2">
            Register the webhook from your machine (replace{" "}
            <code className="text-zinc-400">BOT_TOKEN</code> and{" "}
            <code className="text-zinc-400">SECRET</code> with real values —{" "}
            <span className="text-zinc-200">do not type</span>{" "}
            <code className="text-zinc-400">&lt;</code> or{" "}
            <code className="text-zinc-400">&gt;</code>; in bash,{" "}
            <code className="text-zinc-400">&lt;</code> means “read from file” and
            breaks <code className="text-zinc-400">curl</code>):
          </p>
          <pre className="text-[11px] leading-snug mt-1 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all">
            {`curl -sS "https://api.telegram.org/botBOT_TOKEN/setWebhook" \\
  -F "url=https://YOUR_VERCEL_DOMAIN/api/webhook" \\
  -F "secret_token=SECRET"`}
          </pre>
          <p className="text-zinc-500 text-xs mt-2">
            After deploy, call{" "}
            <code className="text-zinc-400 break-all">
              GET /api/health/bot
            </code>{" "}
            with{" "}
            <code className="text-zinc-400">
              Authorization: Bearer &lt;CRON_SECRET&gt;
            </code>{" "}
            to see Telegram&apos;s webhook URL, last delivery error, and user
            counts.
          </p>
          <p className="text-zinc-500 text-xs">
            Users: <code className="text-zinc-400">/start</code> (or{" "}
            <code className="text-zinc-400">/start@YourBot</code>) to subscribe. No
            website login — rows appear only after Telegram hits your deployed{" "}
            <code className="text-zinc-400">/api/webhook</code>.
          </p>
          <p className="text-zinc-500 text-xs mt-2">
            Cron <code className="text-zinc-400">200</code> with{" "}
            <code className="text-zinc-400">users: 0</code> means no active subscribers
            yet (no Gemini/Telegram work). Check the JSON body in Vercel logs.
          </p>
        </div>
        <div>
          <h2 className="text-zinc-100 font-medium mb-2">4. Cron</h2>
          <p>
            <code className="text-amber-200/90">vercel.json</code> schedules are
            always in{" "}
            <span className="text-zinc-400">UTC</span> on Vercel; these map to{" "}
            <span className="text-zinc-400">
              Myanmar Time (MMT, UTC+6:30)
            </span>{" "}
            at <code className="text-amber-200/90">08:00</code>,{" "}
            <code className="text-amber-200/90">14:00</code>, and{" "}
            <code className="text-amber-200/90">21:00</code> for Filter, Momentum,
            and Perspective. Set the same{" "}
            <code className="text-amber-200/90">CRON_SECRET</code> in Vercel; cron
            requests must send{" "}
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
