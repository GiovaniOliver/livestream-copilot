# Skill: Social From Live

## Purpose
Convert a rolling transcript + moment markers into platform-ready social drafts.

## Inputs
- Transcript window (default: last 8 minutes)
- Top moments in the window
- Optional clip/frame thumbnails

## Procedure
1. Identify the 1–3 strongest takeaways (novelty, utility, controversy, humor).
2. Generate per-platform drafts:
   - X: 1–2 single posts and optional thread (3–5)
   - LinkedIn: 1 post (professional) + CTA
   - IG: 1 caption + hashtags
   - YouTube Community: 1 post (engagement question)
3. Enforce constraints:
   - no private info
   - mark `NEEDS_VERIFY` for factual claims without sources
   - keep tone consistent
4. Output as structured objects (see `packages/shared` schemas)
