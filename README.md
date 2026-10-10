# Útěk z Labyrintu

3D escape room v prohlížeči na motivy řeckých bájí a knih Ricka Riordana (Percy Jackson). Hrací doba 15–20 minut, česky, pro hráče 12–15 let.

**Spuštění:** otevři `dist/index.html` v Chrome nebo Edge (stačí dvojklik, nic se neinstaluje). Diktování odpovědí funguje v Chrome a Edge.

## Příběh a úkol
Spadl(a) jsi do Daidalova Labyrintu. Najdi Ariadninu nit a otevři s ní Daidalovu bránu Δ.

| Místnost | Úkol |
|---|---|
| Vstupní síň | Satyr Grover radí, bronzový klíč je nahoře na bednách (skákání) |
| Síň Sfingy | 3 správné odpovědi z 10 otázek (báje + logika), chyba = ztráta srdce |
| Chodba psů | 2 pekelní psi útočí výpadem, poslední upustí stříbrný klíček |
| Hekatina svatyně | Amulet z truhly rozptýlí Mlhu: skryté nápisy, falešné a skryté dveře, symbolový zámek |
| Aréna | Minotaurus, zepředu nezranitelný; musí narazit do sloupu, pak je omráčený |
| Brána Δ | Poslední hádanka, nápověda na mozaice |

## Ovládání
WASD / šipky ↑↓ chůze · myš nebo touchpad / šipky ←→ otáčení · mezerník skok · Q prozkoumat/sebrat/mluvit · klik nebo Shift útok · H ambrózie · M zvuk · Esc pauza

## Božský rodič (volba na začátku)
Poseidón +1 srdce · Athéna nápověda u hádanek · Hermés rychlost · Arés dvojnásobná síla · Apollón léčení.

## Vývoj
```
npm install
node build.mjs     # sestaví dist/index.html (jeden soubor, three.js uvnitř)
```
Zdrojáky v `src/`: `content.js` (všechny texty a hádanky), `world.js` (mapa), `main.js` (logika), `models.js`, `ui.js`, `speech.js`, `audio.js`.
Smrt vrací hráče na poslední kontrolní bod, postup se ukládá v prohlížeči. Křik do mikrofonu (Sfinga, brána) funguje jen při hlasové odpovědi.
