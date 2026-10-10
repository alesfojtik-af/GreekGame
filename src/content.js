// Herní texty: hádanky, rozhovory, úkoly, zajímavosti. Vše česky.

export const PARENTS = [
  { id: 'poseidon', name: 'Poseidón', icon: '🔱', perk: 'Máš o jedno srdce víc.', color: 0x2fa4d8 },
  { id: 'athena', name: 'Athéna', icon: '🦉', perk: 'U každé hádanky můžeš požádat o nápovědu.', color: 0xb8b8c8 },
  { id: 'hermes', name: 'Hermés', icon: '🪽', perk: 'Běháš rychleji.', color: 0xe8c547 },
  { id: 'ares', name: 'Arés', icon: '⚔️', perk: 'Tvoje rány mečem mají dvojnásobnou sílu.', color: 0xc8322a },
  { id: 'apollo', name: 'Apollón', icon: '☀️', perk: 'Zranění se ti pomalu hojí a začínáš s více šípy.', color: 0xf5a623 },
];

export const INTRO = [
  'Hra o vlajku v Táboře polokrevných skončila katastrofou. Pod tvýma nohama se otevřela zem a ty jsi spadl(a) do Daidalova Labyrintu.',
  'Vchod nad tebou se zavalil. Labyrint je živý, mění se a hlídají ho nestvůry. Dávej pozor na všechno, co uvidíš: Labyrint rád zkouší paměť.',
  'TVŮJ ÚKOL: Najdi Ariadninu nit, která jediná ukazuje cestu ven, a otevři Daidalovu bránu Δ. Pak se vrať do tábora.',
];

// Bodování. Klíče používá score.js.
export const POINTS = {
  puzzle: 300, firstTry: 200, quick: 100, wrong: -50, hint: -100,
  hound: 100, myrmex: 50, minotaur: 500, bowKill: 50, secret: 150, death: -250,
  lore: 20, wanderer: 50, curiosity: 30, treasure: 75, pestKill: -200,
  timeLimit: 1800, // časový bonus: +1 bod za každou sekundu pod 30 minut
};

// Sfinga: odpovědi se porovnávají bez diakritiky a velikosti písmen.
export const SPHINX_QUESTIONS = [
  { q: 'Narodil jsem se ráno. V poledne jsem z želvího krunýře vyrobil lyru a večer jsem ukradl Apollónovi stádo krav. Kdo jsem?', a: ['hermes', 'hermesem', 'merkur'], hint: 'Posel bohů s okřídlenými sandály.' },
  { q: 'Tři obři hlídají oheň, led a vítr. Porfyrión nehlídá led. Alkyoneus nehlídá oheň ani led. Jak se jmenuje obr, který hlídá led?', a: ['enkelados', 'enceladus', 'enkeladus', 'enkelados hlida led'], hint: 'Začni Alkyoneem: co mu zbývá? Pak Porfyrión.' },
  { q: 'Vezmi počet olympských bohů, odečti počet hlav Kerbera a výsledek vyděl počtem Múz. Kolik vyjde?', a: ['1', 'jedna', 'jedno', 'jeden'], hint: 'Olympanů je 12, Kerberos má 3 hlavy a Múz je 9.' },
  { q: 'Achilleova matka ho jako dítě ponořila do řeky Styx, aby byl nezranitelný. Jak se jmenovala?', a: ['thetis', 'thetida', 'tethys', 'thetys', 'tetis'], hint: 'Mořská nymfa, jméno začíná na T.' },
  { q: 'Tři Moiry spřádají, měří a stříhají nit života. Jak se jmenuje ta, která nit stříhá?', a: ['atropos', 'atropa'], hint: 'Její jméno znamená „neodvratná“ a začíná na A.' },
  { q: 'Kolik let celkem byl Odysseus pryč z Ithaky, když sečteš trojskou válku a jeho bloudění po moři?', a: ['20', 'dvacet', 'dvaceti'], hint: 'Válka trvala 10 let a bloudění stejně dlouho.' },
  { q: 'Z krve které nestvůry se zrodil okřídlený kůň Pegas?', a: ['meduza', 'medusa', 'meduzy', 'gorgona', 'gorgony'], hint: 'Její pohled měnil lidi v kámen.' },
  { q: 'Tři dveře. Na prvních stojí: „Za mnou je cesta ven.“ Na druhých: „Za prvními cesta ven není.“ Na třetích: „Cesta ven není za třetími.“ Pravdu říká jen jeden nápis. Za kterými dveřmi je cesta ven? Odpověz číslem.', a: ['3', 'tri', 'treti', 'za tretimi', 'tretimi'], hint: 'Postupně předpokládej, že cesta je za 1., 2. a 3. dveřmi, a spočítej pravdivé nápisy.' },
  { q: 'Čím víc ze mě ubíráš, tím jsem větší. Co jsem?', a: ['dira', 'jama', 'dirou', 'diru', 'jamu'], hint: 'Kopeš ji lopatou.' },
  { q: 'Héraklés zabil nemejského lva, zabil lernskou hydru a přivedl hlídače podsvětí. Které z těch tří zvířat nezabil?', a: ['kerberos', 'kerbera', 'kerberus', 'cerberus', 'kerber'], hint: 'Měl tři hlavy a hlídal bránu do podsvětí.' },
  { q: 'Čarodějka Kirké proměnila Odysseovy muže ve zvířata. V jaká?', a: ['prasata', 'prase', 'prasat', 'vepre', 'svine', 'prasatka'], hint: 'Chrochtají.' },
];

export const SPHINX = {
  greet: 'Stůj, polobože. Nikdo neprojde, dokud mi správně neodpoví na TŘI otázky. Za každou chybu tě škrábnu drápem.',
  correct: ['Hm. Správně.', 'Nečekala jsem to. Správně.', 'Překvapivě chytré.'],
  wrong: 'ŠPATNĚ! Tady máš drápem. Zkus jinou otázku.',
  shout: 'AU, moje uši! Nekřič na mě! Dobře, dobře, nápověda:',
  done: 'Tři správné odpovědi. Projdi. A protože se mi líbíš, svěřím ti tajemství: Daidalova brána se otevře jen jménem toho, kdo mě kdysi porazil jako první. Jeho podobu najdeš na stěně této síně. Dobře si ji prohlédni.',
  already: 'Už jsi prošel. Tajemství brány? Jméno toho, kdo mě porazil jako první. Jeho freska visí na stěně. Víc neřeknu.',
};

// Brána: dvě otázky za sebou.
export const GATE = [
  {
    q: 'Brána promluví hlasem Daidala: „Nejdřív heslo. Vyslov jméno toho, kdo kdysi jako první porazil Sfingu.“',
    a: ['oidipus', 'oidipous', 'oedipus', 'oidipos', 'edip', 'oidipovi'],
    hint: 'Vzpomeň si na fresku v síni Sfingy a na řecká písmena pod ní.',
  },
  {
    q: '„Správně. A teď: postavil jsem tento Labyrint i křídla z peří a vosku. Řekni jméno toho, kdo je nosil a už se nevrátil.“',
    a: ['ikaros', 'ikarus', 'ikar', 'icarus', 'ikarovi'],
    hint: 'Prohlédni si mozaiku vedle brány.',
  },
];
export const GATE_TEXT = {
  wrong: 'Brána se ani nepohne. „To není to jméno,“ zašeptá Daidalův hlas.',
  shout: 'Ozvěna tvého křiku se odrazí od brány a na chvíli se rozzáří nápověda:',
};

// Symbolový zámek v Hekatině svatyni.
export const SYMBOLS = [
  { id: 'blesk', icon: '⚡', name: 'Blesk' },
  { id: 'trojzubec', icon: '🔱', name: 'Trojzubec' },
  { id: 'sova', icon: '🦉', name: 'Sova' },
  { id: 'lyra', icon: '🎵', name: 'Lyra' },
];
export const SYMBOL_SOLUTION = ['blesk', 'trojzubec', 'sova', 'lyra'];
export const MIST_CLUES = [
  'Sova není první ani poslední.',
  'Mezi bleskem a trojzubcem nestojí nic.',
  'Lyra je napravo od sovy.',
  'Trojzubec není první.',
  'Čtvrtý symbol vzala Mlha a ukryla ho tam, kde tvá cesta začala.',
];

// Daidalova skříň v aréně: kód z tabulky ve vstupní síni.
export const DIAL_LETTERS = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ι', 'Λ', 'Ο', 'Σ'];
export const DIAL_SOLUTION = ['Ι', 'Δ', 'Δ', 'Α'];

export const ITEMS = {
  bow: { icon: '🏹', name: 'Luk', desc: 'Lovecký luk z Artemidina oltáře. Střílíš pravým tlačítkem myši nebo klávesou E.' },
  bronzeKey: { icon: '🗝️', name: 'Bronzový klíč', desc: 'Těžký klíč s vyrytým labyrintem. Použije se sám u dveří.' },
  silverKey: { icon: '🔑', name: 'Stříbrný klíček', desc: 'Upadl pekelnému psovi z obojku. Hodí se k nějaké truhle.' },
  amulet: { icon: '🌙', name: 'Hekatin amulet', desc: 'Prohlédne Mlhu. Uvidíš, co je skryté, i v místnostech, kde už jsi byl(a).' },
  lyraTile: { icon: '🎵', name: 'Destička s lyrou', desc: 'Chybějící symbol do zámku v Hekatině svatyni.' },
  thread: { icon: '🧶', name: 'Ariadnina nit', desc: 'Zářící klubko, které ukazuje cestu ven.' },
  ambrosia: { icon: '🍪', name: 'Ambrózie', desc: 'Jídlo bohů. Vyléčí 2 srdce.' },
};

// Úkol zobrazený v HUD podle stavu hry.
export function objective(f) {
  if (f.escaped) return 'Jsi venku!';
  if (f.gateOpen) return 'Projdi bránou ven z Labyrintu.';
  if (f.hasThread) return 'Otevři Daidalovu bránu Δ. Bude chtít dvě jména.';
  if (f.minotaurDead) return 'Otevři Daidalovu skříň v aréně. Kód zná tabulka ve vstupní síni.';
  if (f.lockOpen) return 'Poraz Minotaura v aréně.';
  if (f.hasLyra) return 'Vlož destičku s lyrou do symbolového zámku a nastav správné pořadí.';
  if (f.hasAmulet) return 'Mlha je pryč. Přečti nápisy a najdi chybějící čtvrtý symbol.';
  if (f.houndsDead) return 'Odemkni truhlu v Hekatině svatyni.';
  if (f.sphinxDone) return 'Projdi chodbou plnou pekelných psů.';
  if (f.doorA) return 'Odpověz Sfinze na tři otázky.';
  if (f.hasBronzeKey) return 'Odemkni dveře na severu síně.';
  return 'Najdi cestu ze vstupní síně. Prozkoumej ji a promluv si se satyrem.';
}

// Grover: užitečné nápovědy podle postupu.
export function groverLines(f) {
  const tip = !f.hasBow
    ? 'U zdi na východě visí luk. Vezmi si ho, na pekelné psy se hodí střílet z dálky.'
    : !f.hasBronzeKey
      ? 'Viděl jsem něco lesklého nahoře na bednách v rohu. Satyři skáčou dobře, polobozi snad taky. Mezerník, ne?'
      : !f.doorA
        ? 'Ten klíč pasuje do severních dveří. A přečti si tu bronzovou tabulku s Daidalovým jménem. Labyrint rád zkouší paměť.'
        : !f.sphinxDone
          ? 'Sfingy mají citlivé uši. Kdybys odpovídal nahlas a pořádně zakřičel, možná se lekne. Psaním ji ale nevyděsíš.'
          : !f.hasAmulet
            ? 'Pekelní psi útočí výpadem. Střílej na ně z dálky, nebo uskoč a sekni. V té svatyni za nimi cítím Hekatinu magii.'
            : !f.hasLyra
              ? 'S amuletem vidíš skrz Mlhu všude. I tady v síni. Nekouká na tebe ze západní zdi něco, co tu předtím nebylo?'
              : !f.lockOpen
                ? 'Čti nápisy ve svatyni pozorně. Je to logická hádanka, pořadí vyjde jen jedno.'
                : !f.minotaurDead
                  ? 'Minotaura nezraníš zepředu, má kůži jako brnění. Ale býci se neumí zastavit. Co kdyby narazil do sloupu?'
                  : !f.hasThread
                    ? 'Daidalova skříň? Kód je schovaný v jeho jménu na tabulce tady v síni. Spočítej písmena.'
                    : 'Brána chce dvě jména. Jedno ti prozradila Sfinga, druhé je na mozaice u brány.';
  return {
    name: 'Grover Underwood (satyr)',
    text: 'Bééé! Teda... ahoj! Taky jsi sem spadl? Já hledám boha Pana, ale ten tu asi nebude.',
    options: [
      { label: 'Co mám dělat?', reply: 'Najít Ariadninu nit. Jen ta vede ven z Labyrintu. Pak otevřít Daidalovu bránu.' },
      { label: 'Máš nějakou radu?', reply: tip },
      { label: 'Nemáš něco k jídlu?', reply: f.groverGift ? 'Už jsem ti dal svou poslední ambrózii! Zbyly mi jen plechovky.' : 'Na, vem si ambrózii. Ale nejez jí moc, nebo vzplaneš. Doslova.', gift: 'ambrosia' },
    ],
  };
}

export const AUTOMATON = {
  name: 'Daidalův automat',
  text: 'Vrrr... cvak. VÍTEJ, NÁVŠTĚVNÍKU. POSLEDNÍ ÚDRŽBA: PŘED 2 973 LETY.',
  options: [
    { label: 'Jak se dostanu ven?', reply: 'VÝPOČET... VÝPOČET... CHYBA 404: CESTA NENALEZENA. Cvak.' },
    { label: 'Co znamenají ty nápisy?', reply: 'NÁPISY? JAKÉ NÁPISY? MOJE OPTIKA VIDÍ JEN MLHU. Vrrr.' },
    { label: 'Kde je Daidalos?', reply: 'PÁN DAIDALOS ODEŠEL NA OBĚD. PŘED 2 973 LETY. BRZY SE VRÁTÍ.' },
  ],
};

// Procházející postavy: zastaví se, pokynou a řeknou moudro s nápovědou.
export const WANDERERS = {
  theseus: {
    name: 'Duch Théseův',
    text: 'Zdravím tě, mladý hrdino. I já jsem kdysi bloudil těmito chodbami.',
    options: [
      { label: 'Jak jsi porazil Minotaura?', reply: 'Holýma rukama. Ale přiznám se: unavil se až poté, co se rozběhl a narazil do sloupu. Býk se v běhu neumí zastavit.' },
      { label: 'Máš pro mě moudro?', reply: 'Hrdina, který nenaslouchá, končí jako socha. Co ti kdo řekne, to si pamatuj. Labyrint se na to zeptá.' },
      { label: 'Jak jsi našel cestu ven?', reply: 'Ariadna mi dala klubko nitě. Bez ní bych tu bloudil dodnes. Jako ty, pokud ji nenajdeš.' },
    ],
  },
  ikaros: {
    name: 'Duch chlapce s ožehnutými pírky',
    text: 'Psst! Ty taky hledáš cestu ven? Já jsem ji kdysi našel. Vzduchem.',
    options: [
      { label: 'Kdo jsi?', reply: 'Synem toho, kdo tohle všechno postavil. Jméno ti neřeknu, táta by se zlobil. Ale je napsané na mozaice u brány. Aspoň první písmeno.' },
      { label: 'Co se ti stalo?', reply: 'Táta mi říkal: nelétej moc nízko, moře ti namočí křídla, a nelétej moc vysoko, slunce rozpustí vosk. Poslechl jsem jen tu první půlku.' },
      { label: 'Máš pro mě moudro?', reply: 'Nejvíc lidí neprohraje kvůli tomu, že nevědí. Prohrají, protože si myslí, že vědí všechno.' },
    ],
  },
};

// Otrava: Kerkóps, zlomyslný skřet, kterého kdysi chytil Héraklés.
export const PEST = {
  name: 'Kerkóps',
  intro: 'Z dlaždice vyskočil Kerkóps, malý chlupatý otrava. Nebude tě pouštět, dokud neodejdeš z místnosti. A nezabíjej ho, je neškodný!',
  lines: [
    'Hele, proč máš oranžový tričko?',
    'Už jsme tam? Už jsme tam? A teď?',
    'Můžu si půjčit ten meč? Jen na chvilku!',
    'Víš, že nás Héraklés jednou pověsil hlavou dolů na tyč? Bylo to vtipný. Jemu ne.',
    'Kolik je dvakrát Minotaurus? Dva Minotauři! Ha!',
    'Proč máš jen jedno jméno? Já jich mám sedm. Ne, osm.',
    'Ty máš rodiče boha? Můj táta je titán. Teda, skoro. Je vysokej.',
    'Nechceš si zahrát hádanky? Ne? A proč ne?',
    'Co je v tom inventáři? Ukaž! Ukaž!',
    'Tady to smrdí po psovi. Nebo jsi to ty?',
  ],
  stay: 'Kerkóps zůstal za tebou a zklamaně mává. Konečně klid.',
  killed: 'Zabil(a) jsi neškodného Kerkópa. Bohové se mračí.',
};

// Zajímavosti k prozkoumání (klávesa Q, poprvé dávají pár bodů).
export const LORE = {
  statue: 'Socha Athény. Na podstavci stojí: „Moudrý vidí to, co Mlha skrývá.“',
  rubble: 'Zával. Tudy cesta zpět nevede.',
  plaque: 'Bronzová tabulka s velkým nápisem ΔΑΙΔΑΛΟΣ (Daidalos). Pod ním drobně: „Kód mé skříně je skrytý v mém jménu. Vezmi 3., 1., 4. a 2. písmeno.“',
  bowRack: 'Prázdný stojan s nápisem „Artemis, paní lovu“.',
  oedipus: 'Freska: poutník s oteklýma nohama odpovídá Sfinze. Pod obrazem je řecky vyryto ΟΙΔΙΠΟΥΣ.',
  hecate: 'Socha Hekaty se třemi tvářemi. Bohyně křižovatek, magie a Mlhy. Jedna tvář se dívá na tebe.',
  helmets: 'Hromada promáčknutých přileb. Nápis na jedné: „Kdo útočí na býka zepředu, skončí tady.“',
  mosaic: 'Mozaika: stařec v dílně staví křídla z peří a vosku. Chlapec letí ke slunci, vosk taje a chlapec padá do moře. Pod obrazem je vyryto „I...“, zbytek je oprýskaný.',
  fakeDoor: 'Mohutné dveře bez kliky. Nedají se otevřít ani vyrazit. Něco na nich nesedí, jako by se trochu vlnily.',
  fakeDoorMist: 'S amuletem vidíš pravdu: tady žádné dveře nejsou, jen malba na zdi.',
  mistWall: 'Obyčejná kamenná zeď. Nebo ne? Když se díváš dlouho, zdá se, že se trochu chvěje.',
  chestLocked: 'Truhla se stříbrným zámkem. Bez klíčku ji neotevřeš.',
  gateLocked: 'Daidalova brána Δ. Na pečeti je vyobrazena zářící nit vedoucí z bludiště. Bez Ariadniny nitě se brána neotevře.',
  doorALocked: 'Těžké dveře s bronzovým zámkem ve tvaru labyrintu. Potřebuješ klíč.',
  cageBusy: 'Teď ne! Minotaurus by tě rozdupal dřív, než otočíš prvním kolečkem.',
  niche: 'Ve zdi, kterou předtím zakrývala Mlha, je výklenek.',
};

// Výsledky nášlapných dlaždic a pák (náhodně rozdělené při každé hře).
export const CURIOSITIES = {
  vision1: 'Dlaždice zazáří a Mlha ti ukáže vidění: mladý Daidalos staví Labyrint pro krále Minóa. „Nikdo z něj nesmí najít cestu ven,“ říká král. „Kromě mě,“ usměje se Daidalos.',
  vision2: 'Ozve se cvaknutí a na stěně se na chvíli objeví zlatý text: „Ariadna dala Théseovi nit. On ji pak opustil na ostrově Naxos. Hrdinové nejsou vždycky vděční.“',
  treasure: 'Ze stropu spadne kožený váček. Uvnitř jsou zlaté drachmy a kousek ambrózie!',
  monster: 'Z otvoru v podlaze vylezou obří mravenci Myrmékové! Kousají jako kleště.',
  pest: 'Z dlaždice vyskočil Kerkóps, malý chlupatý otrava.',
};

// Deník: skutečné nápovědy (na zdi mají zlatou pečeť Δ) se po přečtení zapíšou sem.
export const JOURNAL = [
  { id: 'plaque', place: 'Vstupní síň', title: 'Bronzová tabulka', lines: ['ΔΑΙΔΑΛΟΣ (Daidalos)', 'Kód mé skříně je skrytý v mém jménu. Vezmi 3., 1., 4. a 2. písmeno.'] },
  { id: 'sphinx', place: 'Síň Sfingy', title: 'Tajemství Sfingy', lines: ['Daidalova brána se otevře jen jménem toho, kdo mě kdysi porazil jako první.', 'Jeho podobu najdeš na stěně síně Sfingy.'] },
  { id: 'oedipus', place: 'Síň Sfingy', title: 'Freska', lines: ['Poutník s oteklýma nohama odpovídá Sfinze.', 'Pod obrazem je vyryto ΟΙΔΙΠΟΥΣ.'] },
  { id: 'mistTablet', place: 'Hekatina svatyně', title: 'Tabulka skrytá v Mlze', lines: MIST_CLUES },
  { id: 'mosaic', place: 'Aréna', title: 'Mozaika', lines: ['Stařec v dílně staví křídla z peří a vosku.', 'Chlapec letí ke slunci, vosk taje a chlapec padá do moře.', 'Pod obrazem je vyryto „I...“, zbytek je oprýskaný.'] },
];

export const CONTROLS = [
  ['W A S D', 'chůze (i šipky ↑ ↓)'],
  ['Myš', 'otáčení (i šipky ← →)'],
  ['Mezerník', 'skok'],
  ['Q', 'prozkoumat, sebrat, mluvit'],
  ['Klik / Shift', 'útok mečem'],
  ['Pravé tl. / E', 'střelba z luku'],
  ['1–9', 'vybrat předmět'],
  ['F', 'použít vybraný předmět'],
  ['J', 'deník nápověd'],
  ['M', 'zvuk zap/vyp'],
  ['Esc', 'pauza'],
];
