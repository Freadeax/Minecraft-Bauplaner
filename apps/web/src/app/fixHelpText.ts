/** Texte für „Was tun?“ direkt an Fehlermeldungen (UX-02); ohne JSX, damit der Einheitstest sie prüfen kann. */
export const FIX_HELP = {
  save: { title: 'Speichern klappt nicht', steps: ['Ist das Projekt in einem zweiten Tab offen? Dort weiterarbeiten oder hier „Gespeicherten Stand laden“.', 'Ist der Browserspeicher voll? Unter Projekte › Speicher & Sicherung „Alles sichern“ und alte Projekte löschen.'] },
  resolve: { title: 'Projekt lässt sich nicht berechnen', steps: ['Meist fehlt die Version eines Bauteils. Im Editor das markierte Bauteil entfernen oder über „Updates“ eine vorhandene Version wählen.', '„Neu berechnen“ oben versucht es erneut.'] },
  conflict: { title: 'Blöcke überschneiden sich', steps: ['Im Konfliktbericht unter dem Editor auf eine Koordinate klicken: das Bauteil wird gewählt.', 'Bauteil verschieben (Pfeile im Inspektor oder „Ziehen“) oder „Vorrang bei Überschneidung“ setzen, wenn es gewinnen soll.'], guide: '#/anleitung?weg=erstes-projekt&schritt=3' },
  review: { title: 'Schritte erneut prüfen', steps: ['Der Plan hat sich geändert, nachdem du diese Schicht abgehakt hast.', 'In „Bauen“ die gelb markierten Schritte im Spiel ansehen und wieder abhaken oder zurücksetzen.'], guide: '#/anleitung?weg=erstes-projekt&schritt=5' },
  webgl: { title: 'Keine 3D-Grafik', steps: ['Der Browser stellt hier kein WebGL bereit (Energiesparmodus, Remote-Desktop, alte Grafiktreiber).', 'Die isometrische Ersatzansicht und die 2D-Schichtansicht funktionieren trotzdem; für 3D Hardwarebeschleunigung in den Browser-Einstellungen einschalten und neu laden.'] },
  computation: { title: 'Berechnung abgebrochen', steps: ['Sehr große Projekte brauchen länger. „Neu berechnen“ startet die Berechnung erneut.', 'Hilft das nicht: Schichtfilter im Editor nutzen oder große Bauteile in eigene Projekte aufteilen.'] },
} as const satisfies Record<string, { title: string; steps: readonly string[]; guide?: string }>;
export type FixTopic = keyof typeof FIX_HELP;
