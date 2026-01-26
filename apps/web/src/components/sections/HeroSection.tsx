import Link from "next/link";

const realTimeFeatures = [
  {
    title: "Clip queue",
    description:
      "Start/end clip intent markers, replay-buffer saves, and titles/hooks ready for Shorts/Reels.",
  },
  {
    title: "Post drafts",
    description:
      "Platform-ready captions and threads generated from the last segment of the session.",
  },
  {
    title: "Attribution",
    description:
      "Idea ledger and quote bank with timestamps and speaker tags (when available).",
  },
  {
    title: "Debate cards",
    description:
      "Claims map, verification queue, and evidence-card drafts for structured debates.",
  },
  {
    title: "Podcast packaging",
    description:
      "Chapters, promos, show notes, and a highlight list for post-production.",
  },
  {
    title: "Operator controls",
    description:
      "Approve, edit, copy, and share outputs instantly—no waiting for post-processing.",
  },
] as const;

export function HeroSection() {
  return (
    <section className="container-app py-16 md:py-24">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left column - Hero content */}
        <div className="animate-slide-up">
          <div className="badge mb-4">
            Capture mode: <strong className="text-text">Audio</strong> /{" "}
            <strong className="text-text">Video</strong> /{" "}
            <strong className="text-text">Audio+Video</strong>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
            Turn live sessions into publishable assets—
            <span className="text-gradient">while they happen.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-text-muted">
            FluxBoard is a workflow-first copilot for streamers, podcast teams,
            writers rooms, brainstorms, and debates. Pick a workflow, capture
            from OBS or mobile, and review agent outputs on dashboards that
            match the moment.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <span>Launch Dashboard</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="#workflows" className="btn">
              Explore workflows
            </Link>
            <Link href="#observability" className="btn">
              See Observability
            </Link>
          </div>

          <p className="mt-4 text-sm text-text-muted">
            Tip: use <span className="kbd">gesture</span> or{" "}
            <span className="kbd">voice</span> markers to start/end clips, then
            export the best cuts.
          </p>
        </div>

        {/* Right column - Feature card */}
        <div className="card animate-in lg:p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">
            What you get in real time
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {realTimeFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-stroke/50 bg-bg-1/50 p-3 transition-colors hover:border-stroke hover:bg-bg-2/50"
              >
                <h3 className="text-sm font-medium text-text">
                  {feature.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
