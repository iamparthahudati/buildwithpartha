import { Button, LiveRegion } from "@components/ui";
import { useAnnouncer } from "@hooks/useAnnouncer";

/**
 * Interactive demos for the structural catalog entries. They live apart from
 * the entry registry so that file exports only data and this one only
 * components, which keeps React Fast Refresh working.
 */

export function AnnouncerDemo() {
  const { message, announce, clear } = useAnnouncer(500);

  return (
    <div className="specimen-stack">
      <div className="specimen-row">
        <Button
          onClick={() => {
            // Five in a row, as a filter panel would produce.
            for (let applied = 1; applied <= 5; applied += 1) {
              announce(`${applied} filters applied`);
            }
          }}
        >
          Announce five changes at once
        </Button>
        <Button variant="secondary" onClick={clear}>
          Clear
        </Button>
      </div>

      <p className="lifeos-field__description">
        A screen reader hears the first and the last, half a second apart — not all five.
      </p>

      <LiveRegion message={message} visible />
    </div>
  );
}
