import { useState } from "react";

import { accentIndexForName, initialsForName } from "./avatarIdentity";
import type { AvatarSize } from "./scales";
import "./avatar.css";

/**
 * Avatar (LOS-0310).
 *
 * An avatar is a picture of a person, which makes it decoration next to their
 * name in almost every layout. It is therefore hidden from assistive
 * technology by default; pass `standalone` only when no name accompanies it.
 */

interface AvatarProps {
  /** The person's name. Drives initials, accent color and accessible name. */
  readonly name: string;
  readonly imageUrl?: string;
  readonly size?: AvatarSize;
  /**
   * Exposes the avatar to assistive technology as a named image. Use only when
   * the name is not already visible beside it, otherwise it is announced twice.
   */
  readonly standalone?: boolean;
  readonly className?: string;
}

export function Avatar({
  name,
  imageUrl,
  size = "md",
  standalone = false,
  className,
}: AvatarProps) {
  /*
   * A broken image URL must not leave a blank hole where a person should be,
   * so a load failure falls back to initials rather than rendering nothing.
   */
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  const initials = initialsForName(name);
  const classes = [
    "lifeos-avatar",
    `lifeos-avatar--${size}`,
    !showImage && `lifeos-avatar--accent-${accentIndexForName(name)}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const accessibility = standalone
    ? ({ role: "img", "aria-label": name } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <span className={classes} {...accessibility}>
      {showImage ? (
        <img
          className="lifeos-avatar__image"
          src={imageUrl}
          // The wrapper carries the name; an alt here would duplicate it.
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="lifeos-avatar__initials" aria-hidden="true">
          {initials}
        </span>
      )}
    </span>
  );
}

interface AvatarGroupProps {
  readonly people: readonly { readonly name: string; readonly imageUrl?: string }[];
  /** Renders at most this many avatars; the rest become a "+N" chip. */
  readonly max?: number;
  readonly size?: AvatarSize;
  /** Names the group, e.g. "Assigned to". Announced instead of each face. */
  readonly label: string;
  readonly className?: string;
}

export function AvatarGroup({ people, max = 4, size = "md", label, className }: AvatarGroupProps) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <span
      className={["lifeos-avatar-group", className].filter(Boolean).join(" ")}
      role="img"
      /*
       * One accessible name for the whole group. Announcing each face
       * individually turns a glanceable summary into a long list.
       */
      aria-label={`${label}: ${people.map((person) => person.name).join(", ")}`}
    >
      {visible.map((person) => (
        <Avatar
          key={person.name}
          name={person.name}
          size={size}
          {...(person.imageUrl ? { imageUrl: person.imageUrl } : {})}
        />
      ))}
      {overflow > 0 ? (
        <span
          className={`lifeos-avatar lifeos-avatar--${size} lifeos-avatar--overflow`}
          aria-hidden="true"
        >
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}
