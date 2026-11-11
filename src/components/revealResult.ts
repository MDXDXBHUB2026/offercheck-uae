// After a check completes, the result renders below the form and is often off screen. This brings
// the result card's header into view and moves focus to its heading, so the score and the actions
// (Save to Encrypted Vault among them) are where the person is. The "Results ready" live message is
// separate and unchanged. Smooth scrolling only when the person's system allows motion and the
// site's Pause animations is off; otherwise the jump is instant.

export const RESULT_HEADING_ID = "results-heading";

type MotionQuery = { matchMedia?: (query: string) => { matches: boolean } };
type Root = { dataset?: { motion?: string } } | null | undefined;

export function scrollBehaviorFor(win: MotionQuery | undefined, root: Root): ScrollBehavior {
  const allowsMotion = win?.matchMedia?.("(prefers-reduced-motion: no-preference)").matches === true;
  const paused = root?.dataset?.motion === "paused";
  return allowsMotion && !paused ? "smooth" : "auto";
}

type Heading = {
  focus: (options?: FocusOptions) => void;
  closest: (selector: string) => { scrollIntoView: (options?: ScrollIntoViewOptions) => void } | null;
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
};

// Returns false when there is no result heading (nothing to bring into view).
export function revealResult(doc: { getElementById: (id: string) => unknown }, behavior: ScrollBehavior): boolean {
  const heading = doc.getElementById(RESULT_HEADING_ID) as Heading | null;
  if (!heading) return false;
  const header = heading.closest(".result-head") ?? heading;
  header.scrollIntoView({ behavior, block: "start" });
  // preventScroll: the scroll above decides where the page goes, including its smoothness.
  heading.focus({ preventScroll: true });
  return true;
}
