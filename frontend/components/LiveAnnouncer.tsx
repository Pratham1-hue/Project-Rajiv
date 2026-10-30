"use client";

import React from "react";

interface LiveAnnouncerProps {
  assertiveMessage: string;
  politeMessage: string;
}

/**
 * Screen-Reader Live Regions (WCAG AAA ARIA Compliance)
 * Ensures NVDA, JAWS, and VoiceOver announce state changes immediately.
 */
export const LiveAnnouncer: React.FC<LiveAnnouncerProps> = ({
  assertiveMessage,
  politeMessage,
}) => {
  return (
    <>
      <div
        id="sr-assertive-announcements"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
      <div
        id="sr-polite-announcements"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
    </>
  );
};

