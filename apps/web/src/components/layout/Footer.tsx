import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-stroke/50 bg-bg-0/50">
      <div className="container-app py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-text-muted">
            &copy; {currentYear} FluxBoard — hackathon prototype.
          </p>
          <p className="text-sm text-text-muted">
            Built for fast live workflows: streams, podcasts, writers rooms,
            brainstorms, debates.
          </p>
        </div>

        {/* Optional: Additional footer links */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-text-dim">
          <Link href="/" className="link hover:text-text-muted">
            Home
          </Link>
          <span className="text-stroke">|</span>
          <Link href="#features" className="link hover:text-text-muted">
            Features
          </Link>
          <span className="text-stroke">|</span>
          <Link href="#workflows" className="link hover:text-text-muted">
            Workflows
          </Link>
          <span className="text-stroke">|</span>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="link hover:text-text-muted"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
