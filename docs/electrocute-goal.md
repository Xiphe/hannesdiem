# ElectroCute Ziel

Stand: 18. November 2026. Funktionaler Rahmen vom Künstler bestätigt und
UI-Gestaltung anschließend konkretisiert.

ElectroCute wird als zweijähriges Live-Looping-Projekt vollständig auf
hannesdiem.de zugänglich. Die langen Sessions zeigen auch den Aufbau und die
Experimente zwischen den musikalischen Höhepunkten. Benannte Highlights machen
die interessanten Passagen direkt auffindbar und teilbar.

Das Highlight-Werkzeug ist in erster Linie für den Künstler gedacht. Angemeldete
Besucher können es ebenfalls nutzen und zum Erschließen des Archivs beitragen.
Laufende Kosten und Einrichtungsaufwand sollen bei voraussichtlich sehr geringer
Nutzung klein bleiben.

## Erste Ausbaustufe

### Projekt und Archiv

- Work umfasst neben Alben und Singles auch Projekte. ElectroCute erhält dort
  einen eigenen Eintrag, eine eigene Ästhetik und eine eigene Projektwelt.
- Eine Übersichtsseite enthält Hintergrundtext zum Projekt und die vollständige
  Sessionliste. Hintergrundtext und musikalische Titel liefert der Künstler.
- Die Sessionliste zeigt Titel, Aufnahmedatum und gegebenenfalls ein Vorschaubild.
  Sie beginnt mit der ältesten Aufnahme; die Reihenfolge lässt sich umkehren.
- Jede Session erhält eine eigene Adresse und einen Player für die vollständige
  Aufnahme. Das Archiv und veröffentlichte Highlights sind öffentlich zugänglich.
- Dateien mit „ignore this“ im Namen sind von der Veröffentlichung ausgeschlossen.

### UI und gestalterische Grundlage

Die UI bleibt sehr dicht an der bestehenden Website. Das blau-pinke Logo und die
Linktree-Seite stammen gestalterisch aus der ElectroCute-Zeit und sind die
Referenzen für diesen Projektbereich. Das vorhandene ElectroCute-Theme bleibt
für die Projektübersicht und die Sessionseiten fest eingestellt.

Neue Bedienelemente dürfen technisch wirken und werden tendenziell kantiger
gestaltet. Runde, organische Formen treten zurück. Die Gestaltung bleibt
zurückhaltend und wird nicht überladen.

Inhaltliches Opening, Sprache und Bildarbeit werden in einer gesonderten Session
bearbeitet. Für die UI ist die vorhandene Gestaltung bereits die Grundlage.

### Videoquelle

Die Videos kommen zunächst als direkte MP4-Links aus dem pCloud Public Folder.
Player, Gestaltung und Highlight-Oberfläche gehören zur Website. Cloudflare
Stream wurde für dieses Archiv wegen der Speicherkosten verworfen. Eine weitere
Streamingplattform ist zunächst nicht vorgesehen.

Der vorhandene Tarif heißt „Custom 4TB (Lifetime)“. Das Link-Traffic-Kontingent ist
unbekannt; aus der Speicherkapazität ergibt sich keine bestätigte Traffic-Zusage.

### Fortsetzen

- Die Abspielposition wird lokal auf dem jeweiligen Gerät pro Session gespeichert.
- Zusätzlich wird die zuletzt gehörte Session gemerkt. Sie bleibt oberhalb der
  sortierten Sessionliste als Fortsetzen-Eintrag erreichbar.
- Beim erneuten Öffnen einer Session wird Fortsetzen angeboten. Der Wechsel zu
  einer anderen Session verwirft den Fortschritt früherer Sessions nicht.
- Direkte Highlight-Links öffnen die verlinkte Passage und haben Vorrang vor der
  gespeicherten Abspielposition.
- Geräteübergreifende Synchronisierung gehört nicht zur ersten Ausbaustufe.

### Highlights erstellen und anhören

- Ein Highlight ist ein Zeitbereich in einer Originalaufnahme mit Anfang, Ende,
  Titel und öffentlicher Zuordnung zur Person, die es gesetzt hat.
- „Highlight setzen“ übernimmt die aktuelle Abspielposition als Anfang und
  schlägt eine Minute Dauer vor, begrenzt durch das Sessionende.
- Die Auswahl erfolgt direkt unten im Player auf einer Zeitleiste, angelehnt
  an Twitch-Clips. Anfang und Ende lassen sich an Griffen ziehen; der gesamte
  Ausschnitt ist verschiebbar. Eine vergrößerte Zeitskala ermöglicht genaue
  Auswahl auch in langen Sessions. Titel und Speichern bleiben im Player.
- Anfang und Ende sind vor dem Speichern veränderbar. Die ausgewählte Passage
  kann probegehört werden; diese Vorschau stoppt am gesetzten Ende.
- Highlights dürfen sich überschneiden und bleiben eigenständige Beiträge.
  Lange unmarkierte Strecken sind erlaubt. Es gibt keine zusätzlichen Kapitel,
  Freitextkommentare oder automatische Musikerkennung.
- Veröffentlichte Highlights erscheinen als Markierungen an der Zeitleiste und
  in einer nach Startzeit geordneten Auswahl, ähnlich einer YouTube-Kapitelliste.
  Diese zeigt Titel, Zeitbereich und Person, ohne Highlight-Thumbnails. Sie muss
  auch auf Mobilgeräten ohne Hover bedienbar sein.
- Jedes Highlight erhält einen teilbaren Link zur markierten Passage in der
  Session.
- Beim Anspringen eines Highlights im Sessionplayer läuft die vollständige
  Session anschließend auch über das Highlight-Ende hinaus weiter. Ein separater
  automatischer Highlights-Modus im Sessionplayer ist zunächst nicht nötig.

### Identität und Rechte

- Der bestehende Website-Login wird verwendet. Das Erstellen von Highlights setzt
  einen angemeldeten Nutzer voraus, keinen Platz im Sharing Circle.
- Der öffentliche Anzeigename wird als gemeinsamer Baustein eines künftigen
  Website-Profils angelegt. Ein vorhandener Circle-Alias wird beim ersten
  Highlight zur bestätigten Übernahme vorgeschlagen.
- Menschen ohne Circle-Alias können einen öffentlichen Anzeigenamen wählen. Die
  private Login-Adresse wird nicht veröffentlicht.
- Eine dedizierte Profilverwaltung und Avatare gehören nicht zur ersten
  Ausbaustufe.
- Mitwirkende können ihre eigenen Highlights bearbeiten und zurückziehen.
  Der Künstler kann sämtliche Highlights bearbeiten oder ausblenden. Sein
  bestätigter Login ist serverseitig zugeordnet; seine Adresse erscheint nicht
  in öffentlichen Highlight-Daten.

### Kleiner Agentic Check

- Fremde Titel und öffentlich eingereichte Anzeigenamen werden vor ihrer
  Veröffentlichung automatisch auf beleidigende beziehungsweise rechtswidrige
  Inhalte geprüft. Der Check beurteilt Texte, nicht die musikalische Auswahl.
- Nach bestandenem Check wird der Beitrag ohne zusätzliche manuelle Freigabe
  sichtbar. Beanstandete Texte können überarbeitet werden.
- Bei einem technischen Ausfall bleibt der Beitrag ausstehend und unveröffentlicht.
- Textänderungen durch die jeweiligen Mitwirkenden durchlaufen erneut den Check.
  Beiträge des Künstlers erscheinen direkt.
- Nachträgliches Korrigieren und Ausblenden bleibt möglich. Darüber hinaus ist
  kein umfangreiches Vorabmoderationssystem vorgesehen.

## Spätere Feed-Erweiterung

Der bisher auf Temple of Sound ausgerichtete Feed nimmt auch andere Arbeiten und
Projekte auf. ElectroCute-Highlights werden dort als Passagen mit genau dem
gesetzten Anfang und Ende abgespielt. Fremde Highlights benötigen nach dem
bestandenen automatischen Check keine zusätzliche redaktionelle Freigabe für den
Feed.

Der gemeinsame Feed soll chronologisches Durchsehen, Zufallswiedergabe und Filtern
nach Projekt ermöglichen. Übergänge zwischen Passagen und das genaue Verhalten
der Feed-Wiedergabe werden in diesem Ausbauschritt konkretisiert.

## Nächster Schritt und offene Voraussetzungen

Der funktionale Rahmen und die UI-Richtung stehen. Die weitere Arbeit kann auf
dem vorhandenen ElectroCute-Design aufbauen. Inhaltliches Opening, Sprache und
Bildarbeit bleiben für die gesonderte Session offen.

Die technische Integration beginnt mit der vom Künstler bereitgestellten Session
XLV vom 23. April 2023, „outside to ovations“. Ihr Dateiname folgt dem Schema
`{yymmdd}_electrocute_{session_number_roman}_{session_name}`. Der native CMX-Eintrag
liegt in [Sessions](../content/pages/electrocute/_sessions.ts). Die MP4 ist
47:51,1 Minuten lang und enthält H.264-Video mit 1280×720 sowie Stereo-AAC-Audio
mit 48 kHz. Der direkte pCloud-Link unterstützt HTTP-Teilabrufe.

Die operative Chromium-Prüfung der echten Quelle hat Wiedergabe mit dekodiertem
Bild und Audio, Zeitsprünge bis Minute 45 und den Stopp am Ende der ausgewählten
Passage bestätigt, auch in der Touch-Vorschau. Physische Mobilgeräte, Safari,
eine längere Hörprobe und die Bildauswahl bleiben offen.

Nach Prüfung der Wiedergabe und Zeitsprünge auf Desktop und Mobilgeräten werden weitere
veröffentlichbare Sessions angebunden. Vorschaubilder für neue oder ersetzte
Aufnahmen wählt der Künstler gemäß [Video-Workflow](agents/video.md).

Der pCloud-Handoff berichtet von einem erfolgreichen einzelnen Desktop-Test mit
anonymer Wiedergabe, HTTP-Teilabrufen und Zeitsprüngen. Audioqualität,
Mobilgeräte und Dauerwiedergabe sind noch zu prüfen. Die dort genannten Dateien
liegen auf dieser Agent-Maschine nicht vor:

- Artefaktwurzel auf dem ursprünglichen Rechner:
  `$HOME/Documents/Codex/2026-11-17/i-have-a-question-i-do`.
- `outputs/pcloud-test-results.json`: Testergebnisse und erprobter Direktlink.
- `outputs/pcloud-player-test.html`: technischer Testplayer; dessen Sprungpunkte
  sind keine musikalischen Highlights.
- `outputs/pcloud-player-test.jpg`: Screenshot des Tests.
- `outputs/pcloud-hosting-notes.md`: Hosting-Nachweise aus dem Handoff.
- `work/video-duration-inventory.json`: Dateiliste, Laufzeiten und Ausschlüsse.
- Ursprünglicher Videoordner: `/Volumes/Video/Electrocute`.

Für diese erste Aufnahme liegen Direktlink und Session-Metadaten nun vor. Für
weitere Aufnahmen fehlt noch das vollständige Inventar aus dem Handoff. Das
persönliche pCloud-Traffic-Limit bleibt bei Bedarf anhand des Vertrags oder beim Support zu
bestätigen.

## Technischer Anschluss

Ein erster lokaler UI-Stand ist umgesetzt: Archivsortierung, Sessionplayer,
Highlight-Auswahl, Bereichseditor und gespeicherter Hörfortschritt. Die Vorschau
verwendet jetzt die bereitgestellte echte Aufnahme. Öffentliche Beiträge sind an
Login, serverseitige Speicherung, bestätigten Alias und Künstlerrechte angebunden.
Der Agentic Check ist über Workers AI angeschlossen und mit acht synthetischen
Textbeispielen am echten Modell geprüft: neutrale Texte und begeisterte Flüche
werden angenommen, gezielte Beleidigungen, Drohungen, illegale Angebote und ein
Umgehungsversuch werden abgelehnt. Lokal werden keine
Modellanfragen versendet, fremde Beiträge bleiben deshalb ausstehend. Die
synthetische Vorschau mit gerätelokalen Entwürfen bleibt separat verfügbar. Start und Grenzen des Stands:
[ElectroCute Player](../website/app/electrocute/README.md).

Die Linktree-Seite verwendet bereits `theme: 'electrocute'`. Dieses Theme wird
derzeit auf das bestehende `defaultTheme` mit seinen hellen und dunklen
Farbvarianten abgebildet. Es ist die Grundlage für den festen ElectroCute-Bereich.

Der vorhandene Feedplayer verwendet bereits ein HTML-Videoelement; sein aktueller
Inhaltsvertrag ist jedoch an Cloudflare Stream gebunden. Direkte MP4-Quellen und
Highlight-Bereiche brauchen eine entsprechende Erweiterung. Der Circle-Alias ist
weiterhin Teil der Reservierungsdaten und wird nur zur bestätigten Übernahme
vorgeschlagen. Der neue öffentliche Alias-Baustein ist von Circle-Mitgliedschaft
und privatem Kontaktnamen unabhängig. Eine Profilverwaltung folgt später.

Bei der Umsetzung sind zuerst vorhandene CMX-Primitiven zu prüfen. Fehlende
Primitiven werden als CMX-Lücke sichtbar gemacht, bevor eigene Implementierungen
eingeführt werden. Tests verwenden synthetische Sessions und Medien; Website-Checks
müssen auch ohne `content/` ausführbar bleiben.
