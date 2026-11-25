/* QG 1.0 — langue de l'interface (français / anglais)
   L'interface est écrite en français ; en anglais, chaque texte affiché est traduit à la volée. */
'use strict';
// langue : choix enregistré, sinon langue de Windows (français si Windows est en français, anglais sinon)
const QG_LANG = 'fr'; const _QG_LANG_AUTO = (() => { let v = null; try { v = localStorage.getItem('qg-lang'); } catch (e) {} if (v === 'en' || v === 'fr') return v; return /^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en'; })();
const QG_LOCALE = QG_LANG === 'en' ? 'en-GB' : 'fr-FR';
document.documentElement.lang = QG_LANG;
function setLang(l) { return; try { localStorage.setItem('qg-lang', l === 'en' ? 'en' : 'fr'); } catch (e) {} }

const EN = {
  // navigation, titres
  '[ QG ]': '[ HQ ]', '[ TOPICS ]': '[ TOPICS ]', '[ PROJETS ]': '[ PROJECTS ]', '[ SPORT ]': '[ FITNESS ]', '[ AGENDA ]': '[ AGENDA ]', '[ SYSTÈME ]': '[ SYSTEM ]', '[ RÉGLAGES ]': '[ SETTINGS ]',
  '[ SITUATION MONDIALE ]': '[ WORLD SITUATION ]', "[ FIL D'ACTUS ]": '[ NEWS FEED ]', '[ MAILS ]': '[ MAIL ]', '[ MÉTÉO //': '[ WEATHER //', '[ MES TOPICS ]': '[ MY TOPICS ]',
  '[ FICHE PROJET ]': '[ PROJECT ]', '[ JOURNAL DE BORD ]': '[ LOGBOOK ]', '[ OBJECTIFS ]': '[ GOALS ]', '[ NOUVELLE SÉANCE ]': '[ NEW SESSION ]', '[ PROGRESSION ]': '[ PROGRESS ]', '[ HISTORIQUE ]': '[ HISTORY ]',
  '[ ÉCHÉANCES ]': '[ DEADLINES ]', '[ NOTES RAPIDES ]': '[ QUICK NOTES ]', '[ MACHINE ]': '[ MACHINE ]', '[ CHARGE EN DIRECT ]': '[ LIVE LOAD ]', '[ STOCKAGE ]': '[ STORAGE ]', '[ PROCESSUS ]': '[ PROCESSES ]',
  '[ RÉSEAU ]': '[ NETWORK ]', '[ LATENCE & DÉBIT ]': '[ LATENCY & SPEED ]', '[ PORTS & CONNEXIONS ]': '[ PORTS & CONNECTIONS ]', '[ APPAREILS SUR LE RÉSEAU LOCAL ]': '[ DEVICES ON LOCAL NETWORK ]', '[ WI-FI ALENTOUR ]': '[ NEARBY WI-FI ]',
  '[ PROFIL & MODULES ]': '[ PROFILE & MODULES ]', '[ POSITION ]': '[ LOCATION ]', '[ ACTUALITÉS & TOPICS ]': '[ NEWS & TOPICS ]', '[ DONNÉES ]': '[ DATA ]', '[ SÉCURITÉ & À PROPOS ]': '[ SECURITY & ABOUT ]', '[ VOIR DANS GOOGLE MAPS ]': '[ VIEW IN GOOGLE MAPS ]',
  // bandeau
  'MÉTÉO': 'WEATHER', 'PLUIE DEMAIN': 'RAIN TOMORROW', 'MAILS NON LUS': 'UNREAD MAIL', 'ACTUS': 'NEWS', 'PROJETS ACTIFS': 'ACTIVE PROJECTS', 'PROCHAINE ÉCHÉANCE': 'NEXT DEADLINE', 'OUI': 'YES', 'NON': 'NO',
  '● EN LIGNE': '● ONLINE', '● HORS LIGNE': '● OFFLINE', '⟳ ACTUALISER': '⟳ REFRESH', 'ACTUALISER': 'REFRESH', 'Actualiser (F5)': 'Refresh (F5)', 'MA POSITION': 'MY LOCATION', 'Centrer le globe sur ma position': 'Center the globe on my location',
  // QG
  'INITIALISATION DU GLOBE…': 'STARTING GLOBE…', 'CHARGEMENT DES CONTOURS…': 'LOADING MAP OUTLINES…', 'GLOBE INDISPONIBLE (bibliothèque 3D absente)': 'GLOBE UNAVAILABLE (3D library missing)',
  'CHARGEMENT…': 'LOADING…', 'TOUT': 'ALL', 'PRINCIPALE': 'PRIMARY', 'TOUS': 'ALL', '(non localisée)': '(not located)', 'Position précise': 'Precise location', 'Position approximative (pays)': 'Approximate location (country)',
  'AUCUNE ACTU (48 H) DANS CETTE CATÉGORIE': 'NO NEWS (48 H) IN THIS CATEGORY', 'Sources injoignables : ': 'Unreachable sources: ', 'LIRE L’ARTICLE →': 'READ ARTICLE →', '[ LIRE L’ARTICLE → ]': '[ READ ARTICLE → ]',
  'Gmail non configuré.': 'Gmail not set up.', 'CONFIGURER': 'SET UP', 'AUCUN MAIL NON LU': 'NO UNREAD MAIL', 'MÉTÉO INDISPONIBLE': 'WEATHER UNAVAILABLE', 'MÉTÉO INDISPONIBLE (réseau)': 'WEATHER UNAVAILABLE (network)',
  'VENT': 'WIND', 'SOLEIL': 'SUN', 'AUJ.': 'TODAY', 'DEMAIN': 'TOMORROW', 'PLUIE DEMAIN ?': 'RAIN TOMORROW?', 'MER': 'SEA', 'POSSIBLE': 'POSSIBLE', 'Success': 'Success',
  // météo
  'ciel clair': 'clear sky', 'peu nuageux': 'mostly clear', 'partiellement nuageux': 'partly cloudy', 'couvert': 'overcast', 'brouillard': 'fog', 'brouillard givrant': 'freezing fog', 'bruine légère': 'light drizzle', 'bruine': 'drizzle', 'bruine forte': 'heavy drizzle',
  'pluie faible': 'light rain', 'pluie': 'rain', 'pluie forte': 'heavy rain', 'pluie verglaçante': 'freezing rain', 'neige faible': 'light snow', 'neige': 'snow', 'neige forte': 'heavy snow', 'averses': 'showers', 'fortes averses': 'heavy showers', 'orage': 'thunderstorm', 'orage + grêle': 'thunderstorm + hail',
  // topics
  'MES TOPICS': 'MY TOPICS', '+ AJOUTER / GÉRER LES TOPICS': '+ ADD / MANAGE TOPICS', '↻ ACTUALISER': '↻ REFRESH', '⚙ CONFIGURER LA PAGE': '⚙ CUSTOMIZE PAGE', '✕ FERMER': '✕ CLOSE', 'ACTUALITÉS (48 H)': 'NEWS (48 H)',
  'AUCUN TOPIC ACTIF — AJOUTES-EN DANS RÉGLAGES': 'NO ACTIVE TOPIC — ADD SOME IN SETTINGS', 'AUCUNE ACTU RÉCENTE — AJOUTE DES MOTS-CLÉS OU DES FLUX (⚙ CONFIGURER)': 'NO RECENT NEWS — ADD KEYWORDS OR FEEDS (⚙ CUSTOMIZE)',
  'LIRE L’ARTICLE ↗': 'READ ARTICLE ↗', '⌖ VOIR SUR LE GLOBE': '⌖ SHOW ON GLOBE', 'GRAPHIQUE': 'CHART', 'Fermer': 'Close', 'sur la période :': 'over the period:', 'OUVRIR LA FICHE ↗': 'OPEN QUOTE PAGE ↗',
  'Données Yahoo Finance, en différé (souvent 15 min).': 'Yahoo Finance data, delayed (often 15 min).', 'BOURSE': 'MARKETS', 'PAYS': 'COUNTRY', 'MONDE': 'WORLD', 'Clique sur un indice pour voir son graphique.': 'Click an index to see its chart.',
  'COURS SUIVIS': 'WATCHLIST', 'Retirer': 'Remove', 'introuvable': 'not found', 'Aucun cours suivi. Cherche une action, un ETF ou une crypto ci-dessous.': 'Nothing on your watchlist. Search for a stock, ETF or crypto below.',
  'Rechercher : nom ou symbole (ex : Airbus, MSCI World, bitcoin…)': 'Search: name or ticker (e.g. Apple, MSCI World, bitcoin…)', 'CHERCHER': 'SEARCH', 'RECHERCHE…': 'SEARCHING…', 'AUCUN RÉSULTAT': 'NO RESULTS',
  'PROCHAINS LANCEMENTS SPATIAUX': 'UPCOMING ROCKET LAUNCHES', 'Source : The Space Devs (Launch Library 2). Dates susceptibles de changer.': 'Source: The Space Devs (Launch Library 2). Dates may change.',
  'SÉISMES MAGNITUDE 4,5+ (24 H)': 'EARTHQUAKES MAGNITUDE 4.5+ (24 H)', 'Aucun séisme de magnitude 4,5+ ces dernières 24 h.': 'No magnitude 4.5+ earthquake in the last 24 h.', 'Source : USGS. Clique pour la fiche détaillée.': 'Source: USGS. Click for details.',
  'INDICE EUROPÉEN': 'EUROPEAN INDEX', 'Source : Open-Meteo / Copernicus (µg/m³). Pollens disponibles en Europe uniquement.': 'Source: Open-Meteo / Copernicus (µg/m³). Pollen data for Europe only.',
  'TOP HACKER NEWS': 'TOP HACKER NEWS', 'LIENS UTILES': 'USEFUL LINKS', 'Aucun lien — ajoute tes sites favoris dans ⚙ CONFIGURER LA PAGE.': 'No links — add your favourite sites in ⚙ CUSTOMIZE PAGE.', 'NOTES': 'NOTES', 'Tes notes sur ce sujet…': 'Your notes on this topic…',
  'MOTS-CLÉS DES ACTUS': 'NEWS KEYWORDS', 'FLUX RSS': 'RSS FEEDS', 'MODULES DE LA PAGE': 'PAGE MODULES', 'PAYS POUR LA BOURSE': 'STOCK MARKET COUNTRY', 'ANNULER': 'CANCEL',
  'mots-clés Google News, séparés par OR': 'Google News keywords, separated by OR', 'Une source par ligne — Nom | https://…/rss': 'One source per line — Name | https://…/rss', 'Un lien par ligne — Nom | https://…': 'One link per line — Name | https://…',
  'INDICES BOURSIERS DU PAYS': 'COUNTRY STOCK INDICES', 'COURS SUIVIS (actions, ETF, crypto, matières premières)': 'WATCHLIST (stocks, ETFs, crypto, commodities)', 'SÉISMES (24 H)': 'EARTHQUAKES (24 H)',
  'QUALITÉ DE L’AIR & POLLENS (ta position)': 'AIR QUALITY & POLLEN (your location)', 'TOP HACKER NEWS (tech, en anglais)': 'TOP HACKER NEWS (tech)',
  'BON': 'GOOD', 'CORRECT': 'FAIR', 'MOYEN': 'MODERATE', 'MÉDIOCRE': 'POOR', 'MAUVAIS': 'BAD', 'faible': 'low', 'modéré': 'moderate', 'élevé': 'high',
  'OR': 'GOLD', 'PÉTROLE BRENT': 'BRENT OIL', 'BITCOIN': 'BITCOIN', 'SHANGHAI': 'SHANGHAI',
  'France': 'France', 'États-Unis': 'United States', 'Allemagne': 'Germany', 'Royaume-Uni': 'United Kingdom', 'Espagne': 'Spain', 'Italie': 'Italy', 'Belgique': 'Belgium', 'Suisse': 'Switzerland', 'Pays-Bas': 'Netherlands', 'Canada': 'Canada', 'Japon': 'Japan', 'Chine / Hong Kong': 'China / Hong Kong', 'Inde': 'India', 'Brésil': 'Brazil',
  'Monde': 'World', 'Économie': 'Economy', 'Science': 'Science', 'Espace': 'Space', 'Sport': 'Sports', 'Jeux vidéo': 'Video games', 'Cinéma & séries': 'Movies & TV', 'Santé': 'Health', 'Automobile': 'Cars', 'Crypto': 'Crypto', 'Défense': 'Defense', 'Géopolitique': 'Geopolitics', 'Environnement': 'Environment', 'Tech': 'Tech',
  'ETF Amundi MSCI World': 'Amundi MSCI World ETF', 'ETF BNP S&P 500': 'BNP S&P 500 ETF', 'ETF S&P 500': 'S&P 500 ETF', 'ETF Nasdaq 100': 'Nasdaq 100 ETF', 'ETF Monde': 'World ETF', 'ETF DAX': 'DAX ETF', 'ETF iShares MSCI World': 'iShares MSCI World ETF', 'Banque Royale': 'Royal Bank',
  'PAGE →': 'PAGE →', 'Ouvrir la page de ce topic': 'Open this topic’s page', 'Monter': 'Move up', 'Descendre': 'Move down', 'ACTIF': 'ON',
  // projets
  '+ NOUVEAU PROJET': '+ NEW PROJECT', 'AUCUN PROJET': 'NO PROJECTS', 'SÉLECTIONNE OU CRÉE UN PROJET': 'SELECT OR CREATE A PROJECT', 'Nouveau projet': 'New project', 'EN COURS': 'IN PROGRESS', 'IDÉE': 'IDEA', 'EN PAUSE': 'ON HOLD', 'TERMINÉ': 'DONE',
  'Idée': 'Idea', 'Terminé': 'Done', 'En cours': 'In progress', 'En pause': 'On hold', 'ACTIFS': 'ACTIVE', 'IDÉES': 'IDEAS', 'FINIS': 'DONE', 'NOM': 'NAME', 'STATUT': 'STATUS', 'AVANCÉE': 'PROGRESS', 'PROCHAINE ÉTAPE': 'NEXT STEP', 'Prochaine étape…': 'Next step…',
  'NOTE': 'NOTE', 'Notes, composants, liens…': 'Notes, parts, links…', 'TÂCHES': 'TASKS', '+ nouvelle tâche (Entrée)': '+ new task (Enter)', 'ACHATS': 'SHOPPING', 'À ACHETER': 'TO BUY', 'COMMANDÉ': 'ORDERED', 'REÇU': 'RECEIVED', 'REÇU / DÉPENSÉ': 'RECEIVED / SPENT', 'QTÉ': 'QTY', '+ AJOUTER À LA LISTE': '+ ADD TO LIST',
  'SUPPRIMER LE PROJET': 'DELETE PROJECT', 'JOURNAL': 'LOG', 'JOURNAL VIDE': 'EMPTY LOG', '+ AJOUTER AU JOURNAL': '+ ADD TO LOG', 'Ce que j’ai fait, essais, pannes, réglages, résultats… (Ctrl+Entrée pour ajouter)': 'What I did, tests, failures, tweaks, results… (Ctrl+Enter to add)', 'MODIFIÉ LE': 'EDITED ON',
  'SUPPRIMER': 'DELETE', 'suppr': 'del', 'CONFIRMER ?': 'CONFIRM?', 'OUI, SUPPRIMER': 'YES, DELETE',
  // sport
  'OBJ': 'GOAL', 'MEILLEUR': 'BEST', 'DERNIER': 'LAST', 'ÉCART': 'GAP', '+ AJOUTER UN OBJECTIF': '+ ADD A GOAL', 'Aucun objectif : ajoute-en un ci-dessous.': 'No goals yet: add one below.', 'TEMPS VISÉ': 'TARGET TIME', 'CHARGE (optionnel)': 'LOAD (optional)', 'CHARGE (kg)': 'LOAD (kg)',
  'Les séances proches de la distance visée sont ramenées à l’équivalent (même allure).': 'Sessions close to the goal distance are converted to an equivalent time (same pace).', 'Nom (ex : Test Cooper, 10 km…)': 'Name (e.g. Cooper test, 10 km…)', 'kg (marche)': 'kg (hiking)',
  'TYPE': 'TYPE', 'DATE': 'DATE', 'DISTANCE (m)': 'DISTANCE (m)', 'DURÉE': 'DURATION', 'mètres': 'metres', 'mm:ss ou h:mm:ss': 'mm:ss or h:mm:ss', 'Ressenti, conditions, séries…': 'How it felt, conditions, sets…', '+ ENREGISTRER LA SÉANCE': '+ SAVE SESSION', 'INDIQUE AU MOINS UNE DURÉE': 'ENTER AT LEAST A DURATION',
  'COURSE': 'RUNNING', 'MARCHE / RANDO': 'WALK / HIKE', 'VÉLO': 'CYCLING', 'NATATION': 'SWIMMING', 'MUSCU / CIRCUIT': 'STRENGTH / CIRCUIT', 'AUTRE': 'OTHER',
  'COURSE — ALLURE (min/km)': 'RUNNING — PACE (min/km)', 'NATATION — TEMPS AU 100 m': 'SWIMMING — TIME PER 100 m', 'SÉANCES PAR SEMAINE (8 SEMAINES)': 'SESSIONS PER WEEK (8 WEEKS)', 'AJOUTE UN OBJECTIF OU DES SÉANCES POUR VOIR TA PROGRESSION': 'ADD A GOAL OR SESSIONS TO SEE YOUR PROGRESS',
  'AUCUNE SÉANCE — ENREGISTRE LA PREMIÈRE À GAUCHE': 'NO SESSIONS — LOG YOUR FIRST ONE ON THE LEFT', 'Pas encore de données': 'No data yet',
  // agenda
  'INTITULÉ': 'TITLE', 'ex : examen, rendez-vous, paiement, anniversaire…': 'e.g. exam, appointment, payment, birthday…', 'note (optionnel)': 'note (optional)', '+ AJOUTER': '+ ADD', 'AJOUTER': 'ADD', 'À VENIR': 'UPCOMING', 'PASSÉES': 'PAST', 'AUCUNE ÉCHÉANCE': 'NO DEADLINES',
  'Idées, choses à ne pas oublier, numéros utiles…': 'Ideas, things not to forget, useful numbers…', 'ENREGISTRÉ': 'SAVED',
  // système
  'Analyse du PC et du réseau': 'PC and network analysis', 'ANALYSE…': 'ANALYSING…', 'MODÈLE': 'MODEL', 'CARTE MÈRE': 'MOTHERBOARD', 'MÉMOIRE': 'MEMORY', 'DISQUE': 'DISK', 'ALLUMÉ DEPUIS': 'UP SINCE', 'SÉCURITÉ': 'SECURITY', 'SANTÉ': 'HEALTH', 'ÉTAT': 'STATUS',
  '↓ RÉSEAU': '↓ NETWORK', '↑ RÉSEAU': '↑ NETWORK', 'PAR CPU': 'BY CPU', 'PAR MÉMOIRE': 'BY MEMORY', 'RÉSEAU': 'NETWORK', 'WI-FI CONNECTÉ': 'CONNECTED WI-FI', 'OPÉRATEUR': 'PROVIDER', 'DÉBIT LIEN': 'LINK SPEED',
  '▶ TEST DE LATENCE': '▶ LATENCY TEST', '▶ TEST DE DÉBIT': '▶ SPEED TEST', 'MESURE DE LA LATENCE (~10 s)…': 'MEASURING LATENCY (~10 s)…', 'MESURE DU DÉBIT EN COURS (~20 s)…': 'MEASURING SPEED (~20 s)…',
  'Le test de débit télécharge ~50 Mo et envoie ~15 Mo vers les serveurs Cloudflare. La latence est mesurée vers ta box, des DNS publics et des sites.': 'The speed test downloads ~50 MB and uploads ~15 MB to Cloudflare servers. Latency is measured to your router, public DNS and websites.',
  'PROGRAMMES CONNECTÉS À INTERNET': 'PROGRAMS CONNECTED TO THE INTERNET', 'Bureau à distance': 'Remote Desktop', 'répond': 'responds', 'vu récemment': 'seen recently', 'MAC aléatoire (tél.)': 'Random MAC (phone)', '(masqué)': '(hidden)',
  'Ports surlignés : services Windows sensibles s\'ils sont exposés sur un réseau public (Wi-Fi gare, hôtel…). Sur ta box à la maison, c\'est normal.': 'Highlighted ports: sensitive Windows services if exposed on a public network (station, hotel Wi-Fi…). On your home router this is normal.',
  'SCANNER': 'SCAN', 'SCAN DU RÉSEAU LOCAL (254 adresses)…': 'SCANNING LOCAL NETWORK (254 addresses)…', 'Scan terminé.': 'Scan complete.', 'Liste issue du cache réseau de Windows. Clique SCANNER pour sonder tout le réseau local.': 'List from the Windows network cache. Click SCAN to probe the whole local network.',
  'SCAN DES RÉSEAUX WI-FI…': 'SCANNING WI-FI NETWORKS…', 'Clique SCANNER pour lister les réseaux Wi-Fi autour de toi.': 'Click SCAN to list Wi-Fi networks around you.', 'Aucun réseau détecté.': 'No network detected.', 'OCCUPATION DES CANAUX': 'CHANNEL USAGE',
  'Aucune carte Wi-Fi ou accès à la localisation refusé (Windows 11 l\'exige pour lister les réseaux).': 'No Wi-Fi adapter, or location access denied (Windows 11 requires it to list networks).', 'Appel refusé': 'Request refused',
  // réglages
  'PROFIL & MODULES': 'PROFILE & MODULES', 'Nom, modules affichés': 'Name, visible modules', 'Nom, langue, modules affichés': 'Name, language, visible modules', 'POSITION': 'LOCATION', 'Carte, recherche, lien Google Maps': 'Map, search, Google Maps link',
  'ACTUALITÉS & TOPICS': 'NEWS & TOPICS', 'Tes sujets, mots-clés, sources': 'Your topics, keywords, sources', 'MAILS': 'MAIL', 'Compte Gmail, filtres': 'Gmail account, filters', 'DONNÉES': 'DATA', 'Sauvegardes, export, téléphone': 'Backups, export, phone',
  'SÉCURITÉ & À PROPOS': 'SECURITY & ABOUT', 'Protection, version, réinitialiser': 'Protection, version, reset',
  'NOM / INDICATIF (affiché en haut : > QG_…)': 'NAME / CALLSIGN (shown at the top: > QG_…)', 'MODULES AFFICHÉS': 'VISIBLE MODULES', 'ENREGISTRER': 'SAVE', 'ENREGISTRÉ ✓': 'SAVED ✓', 'LANGUE / LANGUAGE': 'LANGUAGE / LANGUE',
  'MAILS': 'MAIL', 'Mails Gmail non lus sur la page QG': 'Unread Gmail on the HQ page', 'ACTUALITÉS & TOPICS ': 'NEWS & TOPICS', 'Fil d’actus, globe, une page par topic (bourse, etc.)': 'News feed, globe, one page per topic (markets, etc.)',
  'PROJETS': 'PROJECTS', 'Projets, tâches, journal de bord, liste d’achats': 'Projects, tasks, logbook, shopping list', 'SPORT': 'FITNESS', 'Séances, objectifs, courbes de progression': 'Sessions, goals, progress charts',
  'AGENDA': 'AGENDA', 'Échéances avec compte à rebours, notes rapides': 'Deadlines with countdown, quick notes', 'SYSTÈME': 'SYSTEM',
  'Ta position sert à la météo et au repère doré sur le globe. Elle reste sur ce PC. Choisis-la sur la carte, cherche une adresse, colle un lien Google Maps (partager → copier le lien), ou laisse l’app te localiser.': 'Your location is used for the weather and the gold marker on the globe. It stays on this PC. Pick it on the map, search for an address, paste a Google Maps link (share → copy link), or let the app find you.',
  'MISE À JOUR AUTOMATIQUE': 'AUTOMATIC UPDATE', 'SUIVRE MA POSITION AUTOMATIQUEMENT (localisation Windows, sinon adresse IP)': 'FOLLOW MY LOCATION AUTOMATICALLY (Windows location, otherwise IP address)',
  'Pour une localisation automatique précise : Paramètres Windows → Confidentialité et sécurité → Localisation → Activer.': 'For precise automatic location: Windows Settings → Privacy & security → Location → On.',
  'Adresse, ville, lieu… (ex : Tour Eiffel, 12 rue de la Paix Lyon)': 'Address, city, place… (e.g. Eiffel Tower, 10 Downing Street London)', '⌖ ME LOCALISER': '⌖ LOCATE ME', 'Ou colle un lien Google Maps / des coordonnées (48.8584, 2.2945)': 'Or paste a Google Maps link / coordinates (48.8584, 2.2945)', 'OK': 'OK',
  'Clique sur la carte ou fais glisser le repère pour placer ta position exacte.': 'Click the map or drag the marker to set your exact location.', 'CARTE INDISPONIBLE (bibliothèque absente) — utilise la recherche ou un lien.': 'MAP UNAVAILABLE (library missing) — use search or a link.',
  'INTROUVABLE — essaie avec la ville': 'NOT FOUND — try with the city', 'AUCUNE COORDONNÉE TROUVÉE DANS CE LIEN': 'NO COORDINATES FOUND IN THIS LINK', 'localisation Windows': 'Windows location', 'adresse IP (approximatif)': 'IP address (approximate)', 'choisi sur la carte': 'picked on the map', 'recherche': 'search', 'lien / coordonnées': 'link / coordinates',
  'Position approximative (adresse IP) : affine-la sur la carte si besoin.': 'Approximate location (IP address): refine it on the map if needed.', 'Position introuvable (localisation Windows désactivée et réseau indisponible).': 'Location not found (Windows location off and network unavailable).', 'Ma position': 'My location', 'Plan': 'Map', 'Satellite': 'Satellite',
  'Un topic = un sujet qui t’intéresse, avec sa couleur sur le globe et sa propre page (onglet TOPICS) : actus, bourse, liens, notes… Mets des mots-clés (recherche Google News, mots séparés par OR) et/ou des flux RSS. Les idées ci-dessous arrivent déjà configurées. Jusqu’à 12 topics.': 'A topic = a subject you care about, with its own colour on the globe and its own page (TOPICS tab): news, markets, links, notes… Add keywords (Google News search, words separated by OR) and/or RSS feeds. The ideas below come pre-configured. Up to 12 topics.',
  'MES TOPICS ': 'MY TOPICS', '+ CRÉER UN TOPIC VIDE': '+ CREATE AN EMPTY TOPIC', 'IDÉES DE TOPICS (UN CLIC POUR AJOUTER)': 'TOPIC IDEAS (ONE CLICK TO ADD)', 'ENREGISTRER ET RECHARGER LES ACTUS': 'SAVE AND RELOAD NEWS', 'DÉJÀ PRÉSENT': 'ALREADY ADDED', '12 TOPICS MAXIMUM': '12 TOPICS MAXIMUM', 'Nouveau topic': 'New topic',
  'mots-clés (ex : rugby OR XV de France) — laisser vide si tu n’utilises que des flux RSS': 'keywords (e.g. rugby OR Six Nations) — leave empty if you only use RSS feeds', 'Flux RSS (optionnel) : une source par ligne — Nom | https://…': 'RSS feeds (optional): one source per line — Name | https://…',
  'Les mails passent par un': 'Mail is read using a Google', 'mot de passe d’application': 'app password', 'Google (16 lettres), stocké chiffré sur ce PC. Création : compte Google → Sécurité → Validation en deux étapes (activée) → Mots de passe des applications → nom « QG » → copier le code ici.': '(16 letters), stored encrypted on this PC. To create one: Google account → Security → 2-Step Verification (on) → App passwords → name it “QG” → paste the code here.',
  'ADRESSE GMAIL': 'GMAIL ADDRESS', 'MOT DE PASSE D’APPLICATION': 'APP PASSWORD', 'AFFICHAGE': 'DISPLAY', 'FILTRE (syntaxe de recherche Gmail)': 'FILTER (Gmail search syntax)', 'EXPÉDITEURS IMPORTANTS (mots-clés séparés par des virgules, surlignés en doré)': 'IMPORTANT SENDERS (comma-separated keywords, highlighted in gold)',
  'ENREGISTRER + TESTER': 'SAVE + TEST', 'OUVRIR LA PAGE GOOGLE': 'OPEN GOOGLE PAGE', 'TEST EN COURS…': 'TESTING…', 'ADRESSE OU MOT DE PASSE MANQUANT': 'ADDRESS OR PASSWORD MISSING', 'toi@gmail.com': 'you@gmail.com', 'ex : universite.fr, banque, rh@': 'e.g. university.edu, bank, hr@', '•••••••• (enregistré — laisser vide pour garder)': '•••••••• (saved — leave empty to keep)',
  'SAUVEGARDES AUTOMATIQUES': 'AUTOMATIC BACKUPS', 'RESTAURER LA SAUVEGARDE DU': 'RESTORE BACKUP FROM', 'Aucune sauvegarde pour l’instant.': 'No backup yet.', 'RESTAURER': 'RESTORE', 'OUVRIR LE DOSSIER': 'OPEN FOLDER', 'EXPORT / IMPORT': 'EXPORT / IMPORT',
  'L’export crée un fichier lisible (non chiffré) pour changer de PC : garde-le en lieu sûr.': 'Export creates a readable (unencrypted) file to move to another PC: keep it somewhere safe.', 'EXPORTER…': 'EXPORT…', 'IMPORTER…': 'IMPORT…', 'ACCÈS DEPUIS LE TÉLÉPHONE': 'ACCESS FROM YOUR PHONE',
  'COPIER DANS ONEDRIVE\\QG 1.0 (copie NON chiffrée)': 'COPY TO ONEDRIVE\\QG 1.0 (UNENCRYPTED copy)', 'OneDrive non détecté sur ce PC.': 'OneDrive not found on this PC.', 'ONEDRIVE INTROUVABLE': 'ONEDRIVE NOT FOUND',
  'Ouvre ensuite QG-resume.html dans l’appli OneDrive de ton téléphone (lecture seule).': 'Then open QG-resume.html in the OneDrive app on your phone (read-only).',
  'CE QUI PROTÈGE TES DONNÉES': 'WHAT PROTECTS YOUR DATA', 'Données et mot de passe Gmail chiffrés avec ton compte Windows (DPAPI) : illisibles sur un autre PC ou par un autre utilisateur.': 'Data and Gmail password encrypted with your Windows account (DPAPI): unreadable on another PC or by another user.',
  'Aucun compte, aucun serveur QG : rien n’est envoyé ailleurs que vers les services que tu utilises (météo, cartes, actus, Gmail).': 'No account, no QG server: nothing is sent anywhere except the services you use (weather, maps, news, Gmail).',
  'Interface isolée : aucun script distant, aucun accès au système depuis la page.': 'Isolated interface: no remote scripts, no system access from the page.', 'Connexions HTTPS uniquement, adresses du réseau local refusées pour les flux.': 'HTTPS connections only, local network addresses refused for feeds.',
  'Caméra, micro, notifications et pop-ups bloqués.': 'Camera, microphone, notifications and pop-ups blocked.', 'ZONE DANGEREUSE': 'DANGER ZONE', 'RÉINITIALISER L’APPLICATION': 'RESET THE APP',
  'Réinitialiser efface tes projets, séances, échéances, topics et réglages de cette app (une sauvegarde du jour est conservée).': 'Reset erases your projects, sessions, deadlines, topics and settings in this app (today’s backup is kept).',
  'Version 1.0.1 · tableau de bord personnel hors ligne : actus, météo, mails, projets, sport, agenda, système.': 'Version 1.0.1 · personal offline dashboard: news, weather, mail, projects, fitness, agenda, system.',
  // accueil
  '> BIENVENUE DANS QG 1.0': '> WELCOME TO QG 1.0', 'CONFIGURATION — 1 MINUTE. TOUT RESTE MODIFIABLE DANS [ RÉGLAGES ].': 'SETUP — 1 MINUTE. EVERYTHING CAN BE CHANGED LATER IN [ SETTINGS ].',
  '1 · TON NOM / INDICATIF': '1 · YOUR NAME / CALLSIGN', 'ex : ALPHA, MAX, LUCIE…': 'e.g. ALPHA, MAX, LUCY…', '2 · TA POSITION (météo + repère sur le globe)': '2 · YOUR LOCATION (weather + marker on the globe)',
  '3 · TES TOPICS D’ACTU (tu pourras en créer d’autres sur n’importe quel sujet)': '3 · YOUR NEWS TOPICS (you can create others on any subject later)', '4 · MODULES À AFFICHER': '4 · MODULES TO SHOW', 'TERMINER →': 'FINISH →', 'INDIQUE UN NOM OU INDICATIF': 'ENTER A NAME OR CALLSIGN',
  'Confidentialité : tes données restent sur ce PC, chiffrées avec ton compte Windows. L’app contacte seulement les services nécessaires (météo Open-Meteo, cartes Esri, actus Google News et flux RSS choisis, Gmail si tu le configures).': 'Privacy: your data stays on this PC, encrypted with your Windows account. The app only contacts the services it needs (Open-Meteo weather, Esri maps, Google News and the RSS feeds you choose, Gmail if you set it up).',
  // erreurs
  'URL refusée': 'URL refused', 'Redirection refusée': 'Redirect refused', 'Réponse trop volumineuse': 'Response too large', 'Réponse vide': 'Empty response', 'Réponse illisible': 'Unreadable response', 'Données invalides': 'Invalid data', 'flux illisible': 'unreadable feed',
  'Ce fichier n\'est pas une sauvegarde QG.': 'This file is not a QG backup.', 'Chiffrement Windows indisponible : mot de passe non enregistré.': 'Windows encryption unavailable: password not saved.', 'Gmail ne répond pas (délai dépassé).': 'Gmail is not responding (timeout).',
  'tu as mis ton mot de passe Gmail normal : il faut un MOT DE PASSE D\'APPLICATION (16 lettres).': 'you entered your normal Gmail password: an APP PASSWORD (16 letters) is required.', 'vérifie l\'adresse et le mot de passe d\'application.': 'check the address and the app password.',
  'adresse ou mot de passe d\'application incorrect (ou révoqué) : recrée-en un et colle-le.': 'wrong address or app password (or revoked): create a new one and paste it.',
  'Google bloque la connexion par sécurité : ouvre gmail.com dans ton navigateur, valide l\'alerte de sécurité, puis réessaie.': 'Google blocked the sign-in for security: open gmail.com in your browser, approve the security alert, then try again.',
  'Exporter les données QG': 'Export QG data', 'ENTRÉE': 'INBOUND', 'SORTIE': 'OUTBOUND', 'CANAL': 'CHANNEL', 'BANDE': 'BAND', 'SIGNAL': 'SIGNAL', 'PROGRAMME': 'PROGRAM', 'ADRESSE': 'ADDRESS', 'APPAREIL': 'DEVICE', 'FABRICANT': 'VENDOR', 'TAILLE': 'SIZE', 'LIBRE': 'FREE', 'UTILISÉ': 'USED', 'Importer une sauvegarde QG': 'Import a QG backup', 'INDISPONIBLE': 'UNAVAILABLE', "À L'INSTANT": 'JUST NOW', "MAJ À L'INSTANT": 'UPDATED JUST NOW', 'AUJOURD’HUI': 'TODAY', 'passée': 'past'
};
const trS = (s) => { if (s == null) return s; const k = String(s).trim(); if (!k) return s; const r = trK(k); return r == null ? s : String(s).replace(k, r); };
const g = (x) => { const r = trK(x); return r == null ? x : r; };
const RX = [
  [/^(MAJ )?IL Y A (\d+) (MIN|H|J)$/, (m, maj, n, u) => (maj ? 'UPDATED ' : '') + n + ' ' + ({ MIN: 'MIN', H: 'H', J: 'D' })[u] + ' AGO'],
  [/^(\d+) INFOS$/, '$1 ITEMS'], [/^(\d+) SÉANCES$/, '$1 SESSIONS'], [/^(\d+) SÉANCE\(S\) \/ 7 J$/, '$1 SESSION(S) / 7 D'], [/^(\d+) ENTRÉES?$/, '$1 ENTRIES'], [/^(\d+) LOGS$/, '$1 LOGS'],
  [/^(\d+) À VENIR$/, '$1 UPCOMING'], [/^TÂCHES (\d+)\/(\d+)$/, 'TASKS $1/$2'], [/^(\d+) \/ 20$/, '$1 / 20'],
  [/^CONFIGURER « (.+) »$/, 'CUSTOMIZE « $1 »'], [/^PAYS : (.+)$/, (m, a) => 'COUNTRY: ' + g(a)], [/^IDÉES — (.+)$/, (m, a) => 'IDEAS — ' + g(a)],
  [/^(\S+) · (BON|CORRECT|MOYEN|MÉDIOCRE|MAUVAIS)$/, (m, a, b) => a + ' · ' + g(b)],
  [/^ÉCHEC : (.*)$/, (m, a) => 'FAILED: ' + g(a)], [/^ERREUR : (.*)$/, (m, a) => 'ERROR: ' + g(a)], [/^INDISPONIBLE : (.*)$/, (m, a) => 'UNAVAILABLE: ' + g(a)], [/^RECHERCHE INDISPONIBLE : (.*)$/, (m, a) => 'SEARCH UNAVAILABLE: ' + g(a)],
  [/^Mesure impossible : (.*)$/, (m, a) => 'Measurement failed: ' + g(a)], [/^Gmail refuse la connexion — (.*)$/, (m, a) => 'Gmail refused the connection — ' + g(a)],
  [/^Données : (.*)$/, 'Data: $1'], [/^EXPORTÉ : (.*)$/, 'EXPORTED: $1'], [/^COPIÉ DANS (.*)$/, 'COPIED TO $1'], [/^Une copie chiffrée par jour, 30 jours gardés, dans (.*)\.$/, 'One encrypted copy per day, kept for 30 days, in $1.'],
  [/^OK — (\d+) NON LU\(S\)$/, 'OK — $1 UNREAD'], [/^ENREGISTRÉ ✓ — (\d+) ACTUS$/, 'SAVED ✓ — $1 NEWS ITEMS'],
  [/^(\d\d\.\d\d\.\d{4}) · (.+)$/, (m, d, a) => d + ' · ' + g(a)], [/^\+ (.+)$/, (m, a) => '+ ' + g(a)], [/^(.+) ↗$/, (m, a) => g(a) + ' ↗'], [/^\[ (.+) \]$/, (m, a) => '[ ' + g(a) + ' ]'],
  [/^(.+) — ÉQUIVALENT (.+)$/, '$1 — EQUIVALENT $2'], [/^QUALITÉ DE L’AIR & POLLENS \/\/ (.*)$/, 'AIR QUALITY & POLLEN // $1'],
  [/^Pollens — graminées : (\S+) · bouleau : (\S+) · aulne : (\S+) · ambroisie : (\S+)$/, (m, a, b, c, d) => `Pollen — grass: ${g(a)} · birch: ${g(b)} · alder: ${g(c)} · ragweed: ${g(d)}`],
  [/^(\d+) pts · (\d+) com\.$/, '$1 pts · $2 comments'], [/^(.*)·\s+J-(\d+)$/, '$1· D-$2'], [/^(.*)·\s+AUJOURD’HUI$/, '$1· TODAY'], [/^(.*)·\s+passée$/, '$1· past'],
  [/^(.+) \((non localisée)\)$/, '$1 (not located)'], [/^([◌⌖]) (.+)$/, (m, a, b) => a + ' ' + g(b)], [/^COURSE (\d)/, 'RUNNING $1'], [/^sur la période :$/, 'over the period:']
];
let EN_UP = null, EN_GEO = null;
function geoName(k) {
  if (!EN_GEO) { EN_GEO = { 'États-Unis d’Amérique': 'United States', "États-Unis d'Amérique": 'United States' }; try { const dn = new Intl.DisplayNames(['en'], { type: 'region' }); for (const r of (window.GEO_COUNTRIES || [])) { const cc = String(r[3] || '').toUpperCase(); if (/^[A-Z]{2}$/.test(cc)) { try { EN_GEO[r[2]] = dn.of(cc); } catch (e) {} } } } catch (e) {} }
  return Object.prototype.hasOwnProperty.call(EN_GEO, k) ? EN_GEO[k] : null;
}
function trK(k) {
  if (Object.prototype.hasOwnProperty.call(EN, k)) return EN[k];
  const gn = geoName(k); if (gn) return gn;
  if (!EN_UP) { EN_UP = {}; for (const x in EN) EN_UP[x.toUpperCase()] = EN[x].toUpperCase(); }
  if (/[A-ZÀ-Ý]/.test(k) && k === k.toUpperCase() && Object.prototype.hasOwnProperty.call(EN_UP, k)) return EN_UP[k];
  for (const [re, rep] of RX) if (re.test(k)) return k.replace(re, rep);
  return null;
}
function trTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { const v = root.nodeValue, t = trS(v); if (t !== v) root.nodeValue = t; return; }
  if (root.nodeType !== 1) return;
  const tag = root.tagName; if (tag === 'SCRIPT' || tag === 'STYLE') return;
  for (const a of ['placeholder', 'title']) { const v = root.getAttribute(a); if (v) { const t = trS(v); if (t !== v) root.setAttribute(a, t); } }
  if (tag === 'TEXTAREA' || root.dataset.notr) return;
  if (root.classList && (root.classList.contains('title') || root.classList.contains('tn-more'))) return; // titres d'articles : jamais traduits
  for (const c of [...root.childNodes]) trTree(c);
}
if (QG_LANG === 'en') {
  const start = () => {
    trTree(document.body);
    new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'characterData') trTree(m.target); else { m.addedNodes.forEach(trTree); if (m.type === 'attributes') trTree(m.target); } } })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}
