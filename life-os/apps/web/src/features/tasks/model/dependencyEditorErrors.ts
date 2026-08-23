export type DependencyEditorErrorReason =
  "self" | "cycle" | "permission" | "conflict" | "unavailable" | "unknown";

export function dependencyEditorErrorMessage(reason: DependencyEditorErrorReason): string {
  switch (reason) {
    case "self":
      return "Choose a different Task. A Task can't block itself.";
    case "cycle":
      return "This dependency would create a loop. Choose a Task outside this dependency chain.";
    case "permission":
    case "unavailable":
      return "This Task isn't available. It may have been removed, or you may not have access.";
    case "conflict":
      return "This Task dependency changed elsewhere. The saved relationships are still shown. Try again.";
    case "unknown":
      return "We couldn't add this blocker. Your selection is still here. Try again.";
  }
}
