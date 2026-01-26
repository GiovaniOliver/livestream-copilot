const features = [
  {
    badge: "Capture",
    title: "OBS or Mobile",
    description:
      "Use OBS for replay-buffer clips and source screenshots, or run a mobile-only session when you're away from your desktop.",
  },
  {
    badge: "Modes",
    title: "Audio / Video / A+V",
    description:
      "Pick what you want to capture for each session. Audio-only is fast and transcript-first; video enables clips and thumbnails.",
  },
  {
    badge: "Actions",
    title: "Copy, approve, share",
    description:
      "Every output card is built for speed: copy to clipboard, quick edits, and a queue for what to publish next.",
  },
] as const;

export function FeaturesSection() {
  return (
    <section id="features" className="border-t border-stroke/30 py-16 md:py-20">
      <div className="container-app">
        <div className="mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Workflow-first features
          </h2>
          <p className="mt-3 max-w-3xl text-text-muted">
            Instead of a generic &ldquo;transcript viewer,&rdquo; FluxBoard
            gives each session type its own visual dashboard—Producer Desk,
            Script Studio, Mind Map, or Claims &amp; Evidence Board. Under the
            hood, every workflow uses the same event model so agents can
            generate outputs consistently.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card group transition-all duration-300 hover:border-teal/30 hover:shadow-glow"
            >
              <span className="badge badge-teal mb-3">{feature.badge}</span>
              <h3 className="text-lg font-semibold text-text">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
