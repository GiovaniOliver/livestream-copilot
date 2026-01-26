const observabilityFeatures = [
  {
    title: "Trace every step",
    description:
      "Log traces/spans for session start, clip capture, output generation, and validation.",
  },
  {
    title: "Annotate and iterate",
    description:
      "Use the trace history to find bottlenecks, prompt regressions, and tool failures—fast.",
  },
  {
    title: "Hackathon-friendly",
    description:
      "Turn observability on with env vars. Keep it off for a local-only demo.",
  },
] as const;

export function ObservabilitySection() {
  return (
    <section
      id="observability"
      className="border-t border-stroke/30 py-16 md:py-20"
    >
      <div className="container-app">
        <div className="mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Agent observability (Comet Opik)
          </h2>
          <p className="mt-3 max-w-3xl text-text-muted">
            FluxBoard is instrumented for trace-level visibility so you can
            debug agent behavior and measure improvements. Opik supports agent
            observability via its TypeScript SDK, OpenTelemetry, and REST APIs.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {observabilityFeatures.map((feature) => (
            <div
              key={feature.title}
              className="card transition-all duration-300 hover:border-teal/30"
            >
              <h3 className="text-base font-semibold text-text">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-text-muted">
          Configure <span className="kbd">OPIK_API_KEY</span>,{" "}
          <span className="kbd">OPIK_WORKSPACE_NAME</span>, and optional{" "}
          <span className="kbd">OPIK_URL_OVERRIDE</span> to log traces to Opik.
        </p>
      </div>
    </section>
  );
}
