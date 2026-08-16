import { createContext } from "react";

/**
 * Tells a row which element to render (LOS-0330).
 *
 * A list's rows must be `<li>` and a plain group's rows must not be, and
 * getting it wrong produces markup a screen reader reads as a list with one
 * item or as no list at all. Passing the decision down from the list means a
 * call site cannot mismatch the two.
 *
 * It lives in its own module because a file that exports both a component and a
 * value loses React Fast Refresh.
 */
export const DividerListElementContext = createContext<"li" | "div">("div");
