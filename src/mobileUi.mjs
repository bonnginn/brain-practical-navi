export const PHONE_MAX_WIDTH = 760;

/**
 * A phone is a narrow, touch-first viewport.  Width alone is deliberately not
 * enough: a narrow desktop window with a mouse keeps the compact desktop UI.
 */
export function isPhoneCapability({width, hover, pointer} = {}) {
  return Number.isFinite(width)
    && width <= PHONE_MAX_WIDTH
    && hover === "none"
    && pointer === "coarse";
}

export function phoneCapabilityFromMedia({width, hoverMatches, pointerMatches} = {}) {
  return isPhoneCapability({
    width,
    hover: hoverMatches ? "none" : "hover",
    pointer: pointerMatches ? "coarse" : "fine",
  });
}

/** A QR entry may explicitly select the device-specific learner UI. */
export function phoneUiOverride(search = "") {
  const value = new URLSearchParams(search).get("ui");
  return value === "phone" ? true : value === "desktop" ? false : null;
}
