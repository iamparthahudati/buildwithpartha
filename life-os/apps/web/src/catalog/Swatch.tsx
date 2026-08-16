import { COLOR_TOKENS } from "@styles/tokens";

interface SwatchProps {
  readonly token: string;
  /**
   * Surface swatches are nearly white, so they need a border to be visible at
   * all. Colored swatches do not, and a border would misrepresent them.
   */
  readonly bordered?: boolean;
}

export function Swatch({ token, bordered = false }: SwatchProps) {
  const value = COLOR_TOKENS[token as keyof typeof COLOR_TOKENS] ?? "";

  return (
    <div className="specimen-swatch">
      <div
        className={
          bordered
            ? "specimen-swatch__chip specimen-swatch__chip--bordered"
            : "specimen-swatch__chip"
        }
        style={{ background: `var(${token})` }}
      />
      <code>{token}</code>
      <span className="specimen-swatch__value">{value}</span>
    </div>
  );
}
