/* QG — moteur « Économie & CAC 40 » : composition du CAC 40 par secteur et lecture des actus
   Chaque actu est passée dans des règles (thèmes macro + noms de sociétés + vocabulaire hausse/baisse)
   pour en déduire les secteurs et actions probablement touchés, le sens et l'horizon.
   Ce sont des repères d'analyse, pas des conseils d'investissement. */
'use strict';
(function () {
  const SECT = {
    luxe: 'Luxe & conso premium', banques: 'Banques & assurance', energie: 'Énergie', defense: 'Défense & aéronautique', auto: 'Automobile',
    industrie: 'Industrie & BTP', tech: 'Tech & semi-conducteurs', conso: 'Distribution & alimentaire', sante: 'Santé', telecom: 'Télécoms & médias',
    immo: 'Immobilier', utilities: 'Services collectifs', tourisme: 'Tourisme & transport', chimie: 'Chimie & matériaux'
  };
  // composition indicative (peut évoluer lors des révisions trimestrielles d'Euronext)
  const CAC40 = [
    ['AC.PA', 'Accor', 'tourisme', /accor/], ['AI.PA', 'Air Liquide', 'chimie', /air liquide/], ['AIR.PA', 'Airbus', 'defense', /airbus/],
    ['MT.AS', 'ArcelorMittal', 'chimie', /arcelor/], ['CS.PA', 'AXA', 'banques', /\baxa\b/], ['BNP.PA', 'BNP Paribas', 'banques', /bnp/],
    ['EN.PA', 'Bouygues', 'industrie', /bouygues/], ['BVI.PA', 'Bureau Veritas', 'industrie', /bureau veritas/], ['CAP.PA', 'Capgemini', 'tech', /capgemini/],
    ['CA.PA', 'Carrefour', 'conso', /carrefour/], ['ACA.PA', 'Crédit Agricole', 'banques', /credit agricole/], ['BN.PA', 'Danone', 'conso', /danone/],
    ['DSY.PA', 'Dassault Systèmes', 'tech', /dassault systemes/], ['EDEN.PA', 'Edenred', 'tech', /edenred/], ['ENGI.PA', 'Engie', 'utilities', /engie/],
    ['EL.PA', 'EssilorLuxottica', 'sante', /essilor/], ['ERF.PA', 'Eurofins', 'sante', /eurofins/], ['RMS.PA', 'Hermès', 'luxe', /hermes/],
    ['KER.PA', 'Kering', 'luxe', /kering|gucci/], ['OR.PA', 'L’Oréal', 'luxe', /l.oreal/], ['LR.PA', 'Legrand', 'industrie', /legrand/],
    ['MC.PA', 'LVMH', 'luxe', /lvmh|louis vuitton|moet hennessy/], ['ML.PA', 'Michelin', 'auto', /michelin/], ['ORA.PA', 'Orange', 'telecom', /\borange (sa|telecom|bank)|operateur orange|groupe orange/],
    ['RI.PA', 'Pernod Ricard', 'luxe', /pernod/], ['PUB.PA', 'Publicis', 'telecom', /publicis/], ['RNO.PA', 'Renault', 'auto', /renault/],
    ['SAF.PA', 'Safran', 'defense', /safran/], ['SGO.PA', 'Saint-Gobain', 'industrie', /saint.gobain/], ['SAN.PA', 'Sanofi', 'sante', /sanofi/],
    ['SU.PA', 'Schneider Electric', 'industrie', /schneider/], ['GLE.PA', 'Société Générale', 'banques', /societe generale|socgen/], ['STLAP.PA', 'Stellantis', 'auto', /stellantis|peugeot|fiat|jeep/],
    ['STMPA.PA', 'STMicroelectronics', 'tech', /stmicro/], ['TEP.PA', 'Teleperformance', 'tech', /teleperformance/], ['HO.PA', 'Thales', 'defense', /thales/],
    ['TTE.PA', 'TotalEnergies', 'energie', /total ?energies/], ['URW.PA', 'Unibail-Rodamco-Westfield', 'immo', /unibail|westfield/], ['VIE.PA', 'Veolia', 'utilities', /veolia/],
    ['DG.PA', 'Vinci', 'industrie', /\bvinci\b/]
  ].map(([t, n, s, re]) => ({ t, n, s, re }));

  // thèmes macro → effets par secteur (+1 / -1), horizon
  const H = { C: 'court terme', M: 'moyen terme', L: 'long terme' };
  const RULES = [
    { re: /(bce|banque centrale europeenne|lagarde|fed|reserve federale|powell).{0,60}(baiss|abaiss|reduit|assoupl)|(baisse|reduction) des taux/, why: 'Baisse des taux', fx: { immo: 1, industrie: 1, conso: 1, tech: 1, banques: -1 }, h: 'M' },
    { re: /(bce|banque centrale europeenne|lagarde|fed|reserve federale|powell).{0,60}(hausse|releve|augment|durci|resserr)|(hausse|relevement) des taux/, why: 'Hausse des taux', fx: { immo: -1, industrie: -1, tech: -1, banques: 1 }, h: 'M' },
    { re: /inflation.{0,40}(accelere|hausse|grimpe|plus forte|rebond|depasse)|(hausse|flambee) des prix/, why: 'Inflation en hausse', fx: { conso: -1, immo: -1, banques: 1 }, h: 'C' },
    { re: /inflation.{0,40}(ralenti|recul|baisse|reflux|plus faible)|desinflation/, why: 'Inflation en recul', fx: { conso: 1, immo: 1 }, h: 'M' },
    { re: /(petrole|brent|baril|opep).{0,50}(hausse|bondi|grimpe|flamb|coupe|reduit sa production|record)/, why: 'Pétrole en hausse', fx: { energie: 1, auto: -1, tourisme: -1, chimie: -1 }, h: 'C' },
    { re: /(petrole|brent|baril|opep).{0,50}(baiss|chute|recul|plonge|augmente sa production)/, why: 'Pétrole en baisse', fx: { energie: -1, auto: 1, tourisme: 1, chimie: 1 }, h: 'C' },
    { re: /(gaz|electricite).{0,40}(prix|tarif).{0,30}(hausse|flamb)/, why: 'Énergie plus chère', fx: { utilities: 1, chimie: -1, industrie: -1 }, h: 'C' },
    { re: /chine.{0,60}(ralenti|deflation|demande faible|recul|crise|consommation en berne)/, why: 'Ralentissement chinois', fx: { luxe: -1, auto: -1, chimie: -1 }, h: 'M' },
    { re: /chine.{0,60}(relance|stimul|plan de soutien|rebond)/, why: 'Relance chinoise', fx: { luxe: 1, chimie: 1, auto: 1 }, h: 'M' },
    { re: /droits? de douane|tarifs? douaniers|guerre commerciale|surtaxe|protectionnis/, why: 'Tensions commerciales', fx: { luxe: -1, auto: -1, defense: -1, chimie: -1 }, h: 'M' },
    { re: /(accord|treve|apaisement).{0,30}commercial/, why: 'Apaisement commercial', fx: { luxe: 1, auto: 1, chimie: 1 }, h: 'M' },
    { re: /deficit|dette publique|notation.{0,30}(degrad|abaiss)|(moody.s|fitch|s&p).{0,40}(degrad|abaiss|perspective negative)|spread|oat|motion de censure|censure|dissolution|chute du gouvernement|crise politique/, why: 'Risque budgétaire / politique en France', fx: { banques: -1, immo: -1, industrie: -1, utilities: -1 }, h: 'C', market: -1 },
    { re: /budget (de la )?defense|depenses militaires|rearmement|loi de programmation militaire|otan.{0,30}(objectif|depenses|%)|commande.{0,30}(rafale|missiles|munitions|canons)/, why: 'Hausse des budgets de défense', fx: { defense: 1 }, h: 'L' },
    { re: /cessez.le.feu|accord de paix|fin de la guerre|negociations de paix/, why: 'Perspective de paix', fx: { defense: -1, energie: -1, industrie: 1 }, h: 'M' },
    { re: /escalade|offensive|frappes?.{0,20}(massive|sur)|attaque|tensions? (au|en) (moyen.orient|mer rouge|taiwan)/, why: 'Tensions géopolitiques', fx: { defense: 1, energie: 1, tourisme: -1 }, h: 'C', market: -1 },
    { re: /euro.{0,25}(hausse|grimpe|fort|au plus haut)|dollar.{0,25}(baisse|recul|faible)/, why: 'Euro fort', fx: { luxe: -1, defense: -1, sante: -1 }, h: 'M' },
    { re: /euro.{0,25}(baisse|recul|faible)|dollar.{0,25}(hausse|fort|grimpe)/, why: 'Euro faible', fx: { luxe: 1, defense: 1, sante: 1 }, h: 'M' },
    { re: /greve|blocage|mouvement social/, why: 'Grèves', fx: { tourisme: -1, conso: -1 }, h: 'C' },
    { re: /chomage.{0,30}(hausse|augmente|grimpe)|recession|contraction|pmi.{0,30}(recul|baisse|contraction)|croissance.{0,30}(ralenti|nulle|negative|revue en baisse)/, why: 'Économie qui ralentit', fx: { conso: -1, industrie: -1, banques: -1, auto: -1 }, h: 'M', market: -1 },
    { re: /croissance.{0,30}(accelere|superieure|revue en hausse|solide)|pmi.{0,30}(hausse|expansion)|chomage.{0,30}(baisse|recul)/, why: 'Économie solide', fx: { conso: 1, industrie: 1, banques: 1 }, h: 'M', market: 1 },
    { re: /intelligence artificielle|\bia\b|semi.conducteurs?|puces|nvidia/, why: 'Demande IA / semi-conducteurs', fx: { tech: 1, industrie: 1 }, h: 'L' },
    { re: /voitures? electriques?|vehicule electrique|ventes automobiles.{0,20}(recul|baisse)/, why: 'Marché automobile', fx: { auto: -1 }, h: 'M' },
    { re: /immobilier.{0,30}(rebond|reprise|hausse des ventes)|credits? immobiliers?.{0,20}(hausse|reprise)/, why: 'Reprise immobilière', fx: { immo: 1, industrie: 1, banques: 1 }, h: 'M' }
  ];
  const UP = /(hausse|bondi|grimpe|s.envole|rebond|record|releve|depasse|meilleur.{0,10}que prevu|superieur.{0,10}aux attentes|optimis|contrat|commande|remporte|rachat d.actions|dividende en hausse|acquisition|relance)/;
  const DOWN = /(baisse|chute|recul|plonge|degringol|abaisse|avertissement|inferieur.{0,10}aux attentes|moins.{0,10}que prevu|perte|plan social|suppressions? d.emplois|enquete|amende|sanction|rappel|greve|deception|decroche)/;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // analyse d'une actu → liste d'effets
  function analyze(n) {
    const txt = norm(n.title + ' ' + (n.desc || '')), out = [];
    for (const r of RULES) if (r.re.test(txt)) {
      for (const [s, d] of Object.entries(r.fx)) out.push({ kind: 'sect', key: s, dir: d, why: r.why, h: H[r.h] });
      if (r.market) out.push({ kind: 'market', key: 'cac', dir: r.market, why: r.why, h: H[r.h] });
    }
    const up = UP.test(txt), down = DOWN.test(txt);
    for (const c of CAC40) if (c.re.test(txt)) {
      const d = up && !down ? 1 : down && !up ? -1 : 0;
      out.push({ kind: 'stock', key: c.t, dir: d, why: d ? (d > 0 ? 'Nouvelle favorable' : 'Nouvelle défavorable') + ' sur ' + c.n : 'Citée dans l’actu', h: H.C });
    }
    if (/cac ?40|bourse de paris/.test(txt) && !out.some(o => o.kind === 'market')) { const d = up && !down ? 1 : down && !up ? -1 : 0; if (d) out.push({ kind: 'market', key: 'cac', dir: d, why: 'Tendance de la Bourse de Paris', h: H.C }); }
    return out;
  }
  // agrégat sur toutes les actus récentes (pondéré par la fraîcheur)
  function aggregate(news) {
    const sect = {}, stock = {}, market = { score: 0, why: [] }, hits = [];
    for (const n of news) {
      const fx = analyze(n); if (!fx.length) continue;
      const age = (Date.now() - new Date(n.date)) / 3600e3, wgt = age < 6 ? 1 : age < 24 ? 0.7 : 0.4;
      hits.push({ n, fx });
      for (const f of fx) {
        if (f.kind === 'sect') { const s = sect[f.key] = sect[f.key] || { score: 0, why: {} }; s.score += f.dir * wgt; s.why[f.why] = (s.why[f.why] || 0) + 1; }
        else if (f.kind === 'stock') { const s = stock[f.key] = stock[f.key] || { score: 0, n: 0, why: {} }; s.score += f.dir * wgt; s.n++; s.why[f.why] = 1; }
        else { market.score += f.dir * wgt; market.why.push(f.why); }
      }
    }
    return { sect, stock, market, hits };
  }
  window.MARCHE = { SECT, CAC40, analyze, aggregate, norm };
})();
