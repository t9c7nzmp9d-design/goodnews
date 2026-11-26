# goodnews ☀️🌱

Eine Progressive Web App (PWA), die täglich **gute Nachrichten** zu selbst gewählten Themen aus selbst gewählten Quellen sammelt, fremdsprachige Schlagzeilen ins Deutsche übersetzt und alles **lokal auf dem Gerät** speichert. Es gibt kein Backend, kein Konto und kein Tracking.

## Funktionen

- **Themen**: Medizin & Gesundheit, Umwelt & Klimaschutz, Erneuerbare Energien, Artenschutz & Biodiversität, Technologie für Gutes, Menschenrechte & Humanitäre Hilfe, Bildung & Wissenstransfer, Armutsbekämpfung & Wirtschaft, Wasser, Sanitär & Hygiene, Ernährung & Landwirtschaft. Dazu kommen weitere Themen, die anfangs abgewählt sind: Sport, Kultur, Verkehr, Wohnen, Altern, Religion & Dialog, Nachbarschaft, Innovation. Alles ist per Checkbox wählbar und um eigene Themen erweiterbar.
- **Quellen**
  - DE: Tagesschau, ZEIT, FAZ, Süddeutsche, Spiegel, dpa, NZZ
  - International: Reuters, AP, BBC, Guardian, Le Monde, El País
  - Spezial: cleanthinking.de, WWF, Medscape
  - Eigene Quellen mit Name, Domain und Sprache lassen sich ergänzen.
- **Automatische tägliche Suche**: Beim ersten Öffnen eines Tages (und zur Benachrichtigungszeit) sucht die App nach neuen Meldungen.
- **Automatische Übersetzung** ins Deutsche über die kostenlose [MyMemory API](https://mymemory.translated.net/doc/spec.php). Übersetzungen werden lokal zwischengespeichert. Der Originaltitel lässt sich einblenden.
- **Gute-Nachrichten-Filter**: Jede Schlagzeile wird bewertet, nach der Übersetzung auf Deutsch:
  - **Themen-Begriffe** (je Thema, z. B. „Windkraft“, „Seeadler“, „Stipendium“) zeigen nur, worum es geht.
  - **Generische Wörter** („Rekord“, „Erfolg“, „erstmals“, „Durchbruch“, schwächer: „neu“, „Kooperation“) zählen **nur zusammen mit einem Themen-Begriff**. „Rekord · Windkraft“ ist positiv, „Bundesliga-Rekord“ nicht.
  - **Eindeutig positive Wendungen** („Population erholt“, „Wilderei gestoppt“, „Friedensabkommen“) zählen allein.
  - **Negative Begriffe** („Krieg“, „Insolvenz“, „Hitzewelle“) ziehen ab. Ein **Umkehr-Wort** hebt sie auf: „Arbeitslosigkeit sinkt“, „Waldbrände verhindert“ und „Polio ausgerottet“ gelten als positiv.
  - Klar negative Meldungen werden nie gespeichert. Im strengen Modus (Standard) erscheinen nur eindeutig positive. Jede Karte zeigt mit 🌱, warum die Meldung als positiv erkannt wurde.
  - Alle Wortlisten stehen in `data.json` (`topics[].terms`, `topics[].strong`, `scoring`) und lassen sich dort erweitern. Die Regeln stehen in `scoring._info`.
- **Duplikat-Vermeidung** über Stichwort-Matching: Titel werden normalisiert, Stoppwörter entfernt, Wortstämme verglichen. Ab 60 % Überschneidung gilt eine Meldung als Duplikat. Der Abgleich läuft auch nach der Übersetzung noch einmal, damit dieselbe Meldung aus BBC und Tagesschau nur einmal erscheint.
- **IndexedDB**: Einstellungen, Nachrichten und Übersetzungen liegen lokal im Browser. Nachrichten älter als 30 Tage werden automatisch entfernt.
- **Tägliche Benachrichtigung** zu einer wählbaren Uhrzeit (Browser-Benachrichtigung).
- **Dunkelmodus** per Sonne/Mond-Button. Die Wahl wird in IndexedDB gespeichert. Ohne eigene Wahl folgt die App der Systemeinstellung.
- **Offline-fähig**: Die App-Shell wird vom Service Worker gecacht, gespeicherte Nachrichten sind auch ohne Netz lesbar.
- Mobil-first, responsiv, freundliches Grün. Jede Nachricht verlinkt auf ihre Quelle.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette App (HTML + inline CSS/JS) |
| `manifest.json` | PWA-Konfiguration (Name, Icons, Farben) |
| `service-worker.js` | Offline-Cache, tägliche Erinnerung (Periodic Background Sync), Klick auf Benachrichtigung |
| `data.json` | Vorlage: Themen inkl. Suchbegriffen je Sprache, Quellen, Sprach-Einstellungen, Schema einer News |
| `icons/` | App-Icons (SVG + PNG) |

## So funktioniert die Suche

Für jedes Thema und jede Sprache der gewählten Quellen stellt die App eine Anfrage an den **Google-News-RSS-Feed**, eingeschränkt auf die Domains der gewählten Quellen. Beispiel:

```
(Solarenergie OR Windkraft …) (Rekord OR Ausbau OR Durchbruch) (site:tagesschau.de OR site:zeit.de …) -Krieg -Tote … when:2d
```

Positive Signalwörter und Ausschlusswörter (z. B. „Krieg“, „Anschlag“) richten schon die Suche auf gute Nachrichten aus, auch bei eigenen Themen. Anschließend prüft der Gute-Nachrichten-Filter jede einzelne Schlagzeile. Die Suchbegriffe lassen sich in `data.json` anpassen. Browser dürfen fremde RSS-Feeds wegen CORS nicht direkt lesen, deshalb läuft der Abruf über einen öffentlichen **CORS-Proxy** (allorigins.win, mit corsproxy.io und codetabs.com als Ausweichoption).

## Starten / Hosten

Die App braucht nur einen statischen Webserver mit HTTPS (für Service Worker und Benachrichtigungen; `localhost` geht auch ohne HTTPS):

```bash
python3 -m http.server 8080
```

Danach http://localhost:8080 öffnen. Zum Veröffentlichen eignet sich z. B. **GitHub Pages**: Repository → Settings → Pages → Branch wählen. Alle Pfade sind relativ, die App läuft also auch unter `https://<user>.github.io/goodnews/`.

Installation auf dem Handy: Seite öffnen → „Zum Startbildschirm hinzufügen“ bzw. „App installieren“.

## Grenzen von Benachrichtigungen ohne Server

Ohne Backend gibt es keine echten Server-Push-Nachrichten. Die App nutzt daher lokale Mechanismen:

- **App offen oder im Hintergrund-Tab**: Die App prüft jede Minute, ob die gewählte Uhrzeit erreicht ist, sucht dann nach neuen Meldungen und zeigt eine Benachrichtigung.
- **Installierte App in Chrome/Edge (Android, Desktop)**: Über *Periodic Background Sync* weckt der Browser den Service Worker regelmäßig. Wie oft, entscheidet der Browser (meist abhängig davon, wie häufig die App genutzt wird). Die Erinnerung kommt deshalb nicht immer minutengenau.
- **iOS/Safari** unterstützt Periodic Background Sync nicht. Benachrichtigungen gibt es dort nur bei geöffneter App (ab iOS 16.4 und nur, wenn die App zum Home-Bildschirm hinzugefügt wurde).

Die Suche selbst läuft immer in der geöffneten App, spätestens beim Antippen der Benachrichtigung.

## Datenschutz

**Kurz gesagt: Deine Daten bleiben auf deinem Gerät.**

- **Kein eigener Server, kein Konto, kein Tracking, keine Cookies, keine Analyse-Tools, keine Werbung.**
- Alle Einstellungen (Themen, Quellen, Uhrzeit, Dunkelmodus), gefundene Nachrichten und Übersetzungen liegen ausschließlich in der **IndexedDB deines Browsers**. Zusätzlich steht die Theme-Wahl in `localStorage`, damit die App beim Start nicht kurz hell aufblitzt.
- Über „Einstellungen → Alles zurücksetzen“ löschst du sämtliche lokalen Daten. Das Deinstallieren der App bzw. das Löschen der Website-Daten im Browser hat denselben Effekt.

Um Nachrichten zu finden, nimmt die App **direkt von deinem Gerät aus** Kontakt mit folgenden Drittanbietern auf. Dabei sehen diese technisch bedingt deine **IP-Adresse** und den **User-Agent** deines Browsers:

| Dienst | Was wird übertragen | Zweck |
|---|---|---|
| CORS-Proxy (api.allorigins.win, ersatzweise corsproxy.io / api.codetabs.com) | Die Google-News-Such-URL, also deine gewählten Themen-Suchbegriffe und Quell-Domains | Weiterleitung der RSS-Abfrage |
| Google News (news.google.com, über den Proxy) | Suchbegriffe + Quell-Domains (vom Proxy abgefragt, nicht von deinem Gerät) | Nachrichtensuche |
| MyMemory (api.mymemory.translated.net) | Fremdsprachige Schlagzeilen, eigene Themen-Begriffe, **optional** deine E-Mail-Adresse, falls du sie für ein höheres Tageslimit einträgst | Übersetzung |
| Nachrichtenseiten | Nur wenn du einen Artikel antippst | Lesen des Artikels |

Hinweise:

- Die Übersetzung lässt sich in den Einstellungen abschalten. Dann wird MyMemory nicht kontaktiert. Ausnahme: Beim Hinzufügen eines eigenen Themas werden die Suchbegriffe einmalig übersetzt, damit auch internationale Quellen durchsucht werden können.
- Wer keinen öffentlichen Proxy nutzen möchte, kann in `index.html` (Konstante `PROXIES`) einen eigenen CORS-Proxy eintragen, z. B. einen kleinen Cloudflare Worker.
- Für die Inhalte der verlinkten Artikel und die Datenverarbeitung der genannten Dienste sind die jeweiligen Anbieter verantwortlich. Bitte deren Datenschutzerklärungen beachten.
- Benachrichtigungen werden lokal vom Browser erzeugt. Es wird keine Push-Subscription an einen Server übermittelt.

## Lizenz

MIT
