# QG

🇬🇧 [English version](README.md) · 📝 [Changelog](CHANGELOG.md)

**Un QG gratuit pour Windows en quatre onglets : météo et GO / NO-GO drone, actu militaire française, terminal de marché façon Bloomberg, et réglages.**

QG est une application de bureau au style cockpit, sur fond sombre. Tout reste sur ton PC.

## Les onglets

- **[ MÉTÉO / DRONE ]** : deux positions en parallèle (ICI et CIBLE), météo détaillée, conditions mer et GO / NO-GO drone (vent à 10, 80 et 120 m, rafales, pluie, visibilité, indice Kp, nuit), plus carnet de vol et suivi des batteries.
- **[ ACTU MILITAIRE ]** : actu militaire tirée uniquement de sources françaises, classée par armée, sur un globe 3D.
- **[ TERMINAL ]** : terminal de marché au clavier, ambre sur noir : CAC 40 par secteur, valeurs, marchés mondiaux, liste de suivi, et lecture des actus éco pour repérer les secteurs et les actions probablement touchés. Données gratuites Yahoo Finance, différé d'environ 15 min. Ce ne sont pas des conseils d'investissement.
- **[ RÉGLAGES ]** : position automatique (localisation Windows) ou manuelle, favoris, Gmail, sources, sauvegardes.

Navigation complète au clavier : flèches pour se déplacer, Entrée pour activer, Échap pour revenir aux onglets.

## Téléchargement

Télécharge **`QG-portable.zip`** dans les [Releases](../../releases), dézippe-le, puis lance `QG\QG.exe`. Windows 10/11, 64 bits.

L'exe n'est pas signé : à l'avertissement SmartScreen, clique sur « Informations complémentaires », puis sur « Exécuter quand même ». L'empreinte SHA-256 est dans `SHA256.txt`, sur la page de la release.

## Le construire soi-même

Double-clique sur `BUILD-QG.bat` : il télécharge le moteur Electron (~110 Mo) et les bibliothèques du globe, assemble `QG-App\QG.exe` et crée un raccourci « QG » sur le Bureau.

## Vie privée

- Sans compte, sans serveur QG, sans pub, sans pistage.
- Données et mot de passe d'application Gmail chiffrés avec ton compte Windows (DPAPI).
- Interface isolée, aucun script distant, HTTPS uniquement.
- L'app n'appelle que les services publics nécessaires : Open-Meteo, OpenStreetMap, Google News RSS, Yahoo Finance, Gmail.
