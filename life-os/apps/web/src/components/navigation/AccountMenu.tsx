import { Avatar, Text } from "@components/ui";

import { Menu, type MenuItemDescriptor } from "./Menu";
import type { MenuAlign } from "./menuPosition";
import "./account-menu.css";

/**
 * AccountMenu (LOS-0415).
 *
 * `Menu` with a fixed shape: a trigger that shows the signed-in person, and a
 * header identity block above the items so "who am I signed in as" never
 * depends on remembering what was typed into a settings page earlier.
 * `items` stays caller-supplied — profile, settings, sign out and their
 * copy belong to the screen that knows the product's actual account actions,
 * not to this component.
 */

export interface AccountMenuProps {
  readonly name: string;
  readonly email?: string;
  readonly imageUrl?: string;
  readonly items: readonly MenuItemDescriptor[];
  readonly align?: MenuAlign;
  readonly className?: string;
}

export function AccountMenu({
  name,
  email,
  imageUrl,
  items,
  align = "end",
  className,
}: AccountMenuProps) {
  return (
    <Menu
      trigger={
        <button
          type="button"
          className={["lifeos-account-menu__trigger", className].filter(Boolean).join(" ")}
          aria-label={`${name} account menu`}
        >
          <Avatar name={name} {...(imageUrl ? { imageUrl } : {})} />
        </button>
      }
      items={items}
      label={`${name} account menu`}
      align={align}
      header={
        <div className="lifeos-account-menu__identity">
          <Avatar name={name} size="lg" {...(imageUrl ? { imageUrl } : {})} />
          <div className="lifeos-account-menu__identity-text">
            <Text weight="medium">{name}</Text>
            {email ? (
              <Text tone="secondary" size="sm">
                {email}
              </Text>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
