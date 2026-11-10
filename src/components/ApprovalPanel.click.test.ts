import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { draftReply } from "@/lib/agents/drafter";
import type { GateAction, GateState } from "@/lib/approvalGate";
import { ApprovalPanel } from "./ApprovalPanel";
import { Button } from "./ui";

// No DOM in these tests: the hooks are stubbed so the component can be called as a function. The
// approve button is the shared <Button>, so it is rendered one level down to the native <button>
// and that element's click handler is run, which is where a blocked button ignores the click.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: () => {},
  useRef: () => ({ current: null }),
  // The language store: the server snapshot, English, since there is no DOM.
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown, getServerSnapshot?: () => unknown) =>
    (getServerSnapshot ?? getSnapshot)(),
}));

type Props = { children?: ReactNode; onClick?: (event: { preventDefault: () => void }) => void };

function findButton(node: ReactNode, label: string): ReactElement<Props> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButton(child, label);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== "object" || !("props" in node)) return null;
  const element = node as ReactElement<Props>;
  if (element.type === Button && element.props.children === label) {
    return Button(element.props as Parameters<typeof Button>[0]) as ReactElement<Props>;
  }
  if (element.type === "button" && element.props.children === label) return element;
  return findButton(element.props.children, label);
}

async function clickApprove(gate: GateState): Promise<GateAction[]> {
  const actions: GateAction[] = [];
  const tree = ApprovalPanel({ gate, dispatch: (action) => actions.push(action) });
  const button = findButton(tree, "Approve and copy reply");
  expect(button).not.toBeNull();
  expect(button?.type).toBe("button");
  button?.props.onClick?.({ preventDefault: () => {} });
  await new Promise((resolve) => setTimeout(resolve, 0));
  return actions;
}

describe("ApprovalPanel approve button", () => {
  it.each<[string, GateState]>([
    ["names unfilled", { status: "pending", draft: draftReply(), editing: false }],
    ["blank draft", { status: "pending", draft: "  ", editing: true }],
  ])("does nothing when clicked while blocked: %s", async (_name, gate) => {
    expect(await clickApprove(gate)).toEqual([]);
  });

  it("approves once the names are filled in", async () => {
    const filled = draftReply().replace("[Recipient name]", "Ms Example").replace("[Your name]", "Sam");
    const actions = await clickApprove({ status: "pending", draft: filled, editing: true });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: "approve" });
  });
});
