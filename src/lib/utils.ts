import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Placeholder title the backend auto-renames after the first message (see routers/chat.py). */
export const DEFAULT_SESSION_TITLE = 'New Chat';

/** Session title for display; the stored placeholder must stay "New Chat" so auto-naming still works. */
export function displaySessionTitle(title?: string | null): string {
  return !title || title === DEFAULT_SESSION_TITLE ? 'Percakapan baru' : title;
}
