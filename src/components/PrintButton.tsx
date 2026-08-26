"use client";

export function PrintButton() {
  return (
    <button className="btn btn-secondary btn-sm no-print mb-4" onClick={() => window.print()}>
      ⎙ Εκτύπωση / Αποθήκευση PDF
    </button>
  );
}
