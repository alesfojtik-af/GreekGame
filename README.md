# Útěk z Labyrintu

3D escape room v prohlížeči na motivy řeckých bájí a knih Ricka Riordana (Percy Jackson). Hrací doba 15–20 minut, česky, pro hráče 12–15 let.

**Spuštění:** otevři `dist/index.html` v Chrome nebo Edge (stačí dvojklik, nic se neinstaluje). Diktování odpovědí funguje v Chrome a Edge.

## Příběh a úkol
Spadl(a) jsi do Daidalova Labyrintu. Najdi Ariadninu nit a otevři s ní Daidalovu bránu Δ.

| Místnost | Úkol |
|---|---|
| Vstupní síň | Satyr Grover radí, Artemidin luk na stojanu, bronzový klíč nahoře na bednách (skákání), bronzová tabulka s kódem |
| Síň Sfingy | 3 správné odpovědi z 11 těžších otázek (báje + logika), chyba = ztráta srdce; freska s Oidipem |
| Chodba psů | 2 pekelní psi útočí výpadem, poslední upustí stříbrný klíček; tajná skrýš viditelná jen s amuletem |
| Hekatina svatyně | Amulet z truhly rozptýlí Mlhu: logické nápisy, falešné a skryté dveře, symbolový zámek |
| Aréna | Minotaurus, nezranitelný, dokud nenarazí do sloupu; pak Daidalova skříň s číselníkem |
| Brána Δ | Dvě jména: kdo první porazil Sfingu (freska) a kdo nosil Daidalova křídla (mozaika) |

**Návraty do dřívějších místností:** kód skříně je na tabulce ve vstupní síni, čtvrtý symbol zámku leží ve výklenku vstupní síně (vidět jen s amuletem), heslo brány je na fresce v síni Sfingy.

**Zajímavosti:** duchové Théseus a Ikaros procházejí kolem, zastaví se a poradí; předměty k prohlédnutí; nášlapné dlaždice a páky s náhodným výsledkem (vidění, poklad, mravenci Myrmékové, nebo otravný Kerkóps, který tě nepustí, dokud neodejdeš z místnosti; jeho zabití stojí body).

## Body a síň slávy
Na začátku hráč zadá jméno. Body: vyřešená hádanka +300, napoprvé +200, do 30 s +100, chyba −50, nápověda −100, pes +100, Myrmék +50, Minotaurus +500, zásah lukem z dálky +50, tajná skrýš +150, zajímavost +20 až +75, smrt −250, zabitý otrava −200, na konci +1 bod za každou sekundu pod 30 minut.

Síň slávy je na odkazu claude.ai společná pro všechny hráče (úložiště artefaktu). Ve stažené verzi se ukládá jen v daném prohlížeči.

## Ovládání
WASD / šipky ↑↓ chůze · myš nebo touchpad / šipky ←→ otáčení · mezerník skok · Q prozkoumat/sebrat/mluvit · klik nebo Shift útok mečem · pravé tlačítko nebo E střelba z luku (míří se křížkem) · 1–9 výběr předmětu · F použít · H rychle ambrózie · M zvuk · Esc pauza

## Božský rodič (volba na začátku)
Poseidón +1 srdce · Athéna nápověda u hádanek · Hermés rychlost · Arés dvojnásobná síla · Apollón léčení a více šípů.

## Vývoj
```
npm install
node build.mjs     # sestaví dist/index.html (jeden soubor, three.js uvnitř)
```
Zdrojáky v `src/`: `content.js` (texty, hádanky, body), `world.js` (mapa), `main.js` (logika), `models.js`, `ui.js`, `speech.js`, `audio.js` (vlastní hudba: průzkum, boj, hádanky), `score.js` (síň slávy).
Smrt vrací hráče na poslední kontrolní bod, postup se ukládá v prohlížeči. Křik do mikrofonu (Sfinga, brána) funguje jen při hlasové odpovědi.
