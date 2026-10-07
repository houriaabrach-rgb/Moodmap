# MoodMap starten

## Am einfachsten

Öffne die private, veröffentlichte App im Browser:

https://moodmap-patterns.houria-abrach.chatgpt.site

Beim ersten Aufruf meldest du dich mit ChatGPT an. Deine Einträge werden nur im jeweiligen Browser gespeichert. Sie werden nicht zwischen Computern oder Browsern übertragen.

## Lokale Version auf diesem Computer

1. Öffne den Projektordner `moodmap`.
2. Doppelklicke auf `MoodMap starten.command`.
3. Warte, bis im Terminal `Local: http://127.0.0.1:5173/` erscheint.
4. Öffne `http://127.0.0.1:5173/` im Browser.

Zum Beenden wechselst du in das Terminalfenster und drückst `Ctrl` und `C` gleichzeitig.

Falls macOS den Doppelklick blockiert, öffne Codex in diesem Projektordner und schreibe: „Starte MoodMap anhand der STARTANLEITUNG.md.“

Wenn Codex beim Start `listen EPERM` oder „operation not permitted“ meldet, erlaube für diesen Durchlauf den lokalen Netzwerkzugriff. MoodMap öffnet dabei nur die lokale Adresse `127.0.0.1` auf deinem Computer.

## Wo die Daten liegen

MoodMap speichert persönliche Einträge im lokalen Browserspeicher unter dem Schlüssel `moodmap.entries.v1`. Das bedeutet:

- Die Einträge bleiben nach dem Schließen und erneuten Öffnen erhalten.
- Ein anderer Browser oder Computer sieht diese Einträge nicht.
- Werden die Websitedaten des Browsers gelöscht, gehen die Einträge verloren.
- Die Beispieldaten sind nur eine Vorschau. Der erste eigene Eintrag startet das persönliche Profil.
