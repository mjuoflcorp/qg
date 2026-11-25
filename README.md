# QG

🇫🇷 [Version française](README.fr.md) · 📝 [Changelog](CHANGELOG.md)

**A free Windows HQ in four tabs: weather and drone GO / NO-GO, French military news, a Bloomberg-style market terminal, and settings.**

QG ("HQ" in French) is a desktop app with a dark, cockpit-style interface. Everything stays on your PC.

## Tabs

- **[ MÉTÉO / DRONE ]**: two locations side by side (HERE and TARGET), detailed weather, sea conditions, and drone GO / NO-GO (wind at 10, 80 and 120 m, gusts, rain, visibility, Kp index, night), plus a flight log and battery tracking.
- **[ ACTU MILITAIRE ]**: military news from French sources only, sorted by branch, on a 3D globe.
- **[ TERMINAL ]**: keyboard-driven market terminal, amber on black: CAC 40 by sector, stocks, world markets, watchlist, and economic news read to flag the sectors and stocks likely affected. Free Yahoo Finance data, about 15 minutes delayed. Not investment advice.
- **[ RÉGLAGES ]**: automatic (Windows location) or manual position, saved places, Gmail, sources, backups.

Full keyboard navigation: arrows to move, Enter to activate, Esc to go back to the tabs. The interface is in French.

## Download

Get **`QG-portable.zip`** from [Releases](../../releases), unzip it, then run `QG\QG.exe`. Windows 10/11, 64-bit.

The exe is not code-signed: on the SmartScreen warning, click "More info", then "Run anyway". The SHA-256 hash is in `SHA256.txt` on the release page.

## Build it yourself

Double-click `BUILD-QG.bat`: it downloads the Electron engine (~110 MB) and the globe libraries, builds `QG-App\QG.exe` and adds a "QG" shortcut to your desktop.

## Privacy

- No account, no QG server, no ads, no tracking.
- Data and Gmail app password encrypted with your Windows account (DPAPI).
- Isolated interface, no remote scripts, HTTPS only.
- The app only calls the public services it needs: Open-Meteo, OpenStreetMap, Google News RSS, Yahoo Finance, Gmail.
