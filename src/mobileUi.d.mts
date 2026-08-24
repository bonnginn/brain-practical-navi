export const PHONE_MAX_WIDTH: 760;
export function isPhoneCapability(input?: {width?: number; hover?: "none" | "hover"; pointer?: "coarse" | "fine"}): boolean;
export function phoneCapabilityFromMedia(input?: {width?: number; hoverMatches?: boolean; pointerMatches?: boolean}): boolean;
