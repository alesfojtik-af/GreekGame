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
| Hekatina svatyně | Amulet z truhly rozptýlí Mlhu: tabulka s logickými nápisy, falešné a skryté dveře, symbolový zámek |
| Aréna | Minotaurus, nezranitelný, dokud nenarazí do sloupu; pak Daidalova skříň s číselníkem |
| Brána Δ | Dvě jména: kdo první porazil Sfingu (freska) a kdo nosil Daidalova křídla (mozaika) |

**Nápovědy a deník:** skutečné nápovědy mají na zdi zlatou pečeť Δ. Po přečtení se zapíšou do deníku (klávesa J): tabulka s kódem skříně, tajemství Sfingy, freska, tabulka v Mlze a mozaika. Ozdoby pečeť nemají a v každé místnosti je nejvýš jedna.

**Návraty do dřívějších místností:** čtvrtý symbol zámku leží ve výklenku vstupní síně (vidět jen s amuletem). Kód skříně a jména pro bránu najdeš v deníku, pokud sis nápovědy přečetl(a).

**Zajímavosti:** duchové Théseus a Ikaros procházejí kolem, zastaví se a poradí; nášlapné dlaždice se spirálou a páky s náhodným výsledkem (vidění, poklad, mravenci Myrmékové, nebo otravný Kerkóps, který tě nepustí, dokud neodejdeš z místnosti; jeho zabití stojí body).

## Body a síň slávy
Na začátku hráč zadá jméno. Body: vyřešená hádanka +300, napoprvé +200, do 30 s +100, chyba −50, nápověda −100, pes +100, Myrmék +50, Minotaurus +500, zásah lukem z dálky +50, tajná skrýš +150, zajímavost +20 až +75, smrt −250, zabitý otrava −200, na konci +1 bod za každou sekundu pod 30 minut.

Síň slávy je na odkazu claude.ai společná pro všechny hráče (úložiště artefaktu). Ve stažené verzi se ukládá jen v daném prohlížeči.

## Ovládání
WASD / šipky ↑↓ chůze · myš nebo touchpad / šipky ←→ otáčení · mezerník skok · Q prozkoumat/sebrat/mluvit · klik nebo Shift útok mečem · pravé tlačítko nebo E střelba z luku (míří se křížkem) · 1–9 výběr předmětu · F použít · J deník · H rychle ambrózie · M zvuk · Esc pauza (hlasitost hudby a efektů)

## Božský rodič (volba na začátku)
Poseidón +1 srdce · Athéna nápověda u hádanek · Hermés rychlost · Arés dvojnásobná síla · Apollón léčení a více šípů.

## Vývoj
```
npm install
node build.mjs     # sestaví dist/index.html (jeden soubor, three.js uvnitř)
```
Zdrojáky v `src/`: `content.js` (texty, hádanky, body, deník), `world.js` (mapa), `main.js` (logika), `models.js` (postavy), `surface.js` (látky, srst, kůže), `textures.js` (fotografické textury), `ui.js`, `speech.js`, `audio.js` (hudba a zvuky), `score.js` (síň slávy).

**Hudba:** `tools/music/compose.py` složí dvě smyčky (průzkum ve stylu Barbara Conana, boj ve stylu Pirátů z Karibiku) jako MIDI a vyrenderuje je přes fluidsynth se zvuky FluidR3 GM do `src/assets/music/`. Jde o vlastní skladby, ne o filmové melodie.

**Textury:** `tools/textures/prepare.py` stáhne a zmenší textury do `src/assets/tex/`.

## Autorská práva
- Textury kamene, písku, dřeva, trávy a skály: [Babylon.js Assets](https://github.com/BabylonJS/Assets), licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Podrobnosti v `src/assets/tex/CREDITS.md`.
- Zvuky nástrojů pro hudbu: FluidR3 GM SoundFont (Frank Wen), licence MIT.
- Ostatní (kód, postavy, hudba, mramor) je vytvořeno pro tuto hru.
Smrt vrací hráče na poslední kontrolní bod, postup se ukládá v prohlížeči. Křik do mikrofonu (Sfinga, brána) funguje jen při hlasové odpovědi.
