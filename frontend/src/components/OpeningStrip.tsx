"use client";

import { BookOpen, HelpCircle } from "lucide-react";

interface OpeningStripProps {
  name: string;
  recognized: boolean;
}

export default function OpeningStrip({ name, recognized }: OpeningStripProps) {
  return (
    <div className={`opening-strip ${recognized ? "opening-strip--known" : "opening-strip--unknown"}`}>
      {recognized ? (
        <BookOpen className="opening-strip__icon" />
      ) : (
        <HelpCircle className="opening-strip__icon opening-strip__icon--muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="opening-strip__label">{recognized ? "Opening" : "Not in book"}</p>
        <p className="opening-strip__name truncate" title={name}>
          {name}
        </p>
      </div>
    </div>
  );
}
