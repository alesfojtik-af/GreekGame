// Herní texty: hádanky, rozhovory, úkoly. Vše česky.

export const PARENTS = [
  { id: 'poseidon', name: 'Poseidón', icon: '🔱', perk: 'Máš o jedno srdce víc.', color: 0x2fa4d8 },
  { id: 'athena', name: 'Athéna', icon: '🦉', perk: 'U každé hádanky můžeš jednou požádat o nápovědu.', color: 0xb8b8c8 },
  { id: 'hermes', name: 'Hermés', icon: '🪽', perk: 'Běháš rychleji.', color: 0xe8c547 },
  { id: 'ares', name: 'Arés', icon: '⚔️', perk: 'Tvoje rány mají dvojnásobnou sílu.', color: 0xc8322a },
  { id: 'apollo', name: 'Apollón', icon: '☀️', perk: 'Zranění se ti pomalu sama hojí.', color: 0xf5a623 },
];

export const INTRO = [
  'Hra o vlajku v Táboře polokrevných skončila katastrofou. Pod tvýma nohama se otevřela zem a ty jsi spadl(a) do Daidalova Labyrintu.',
  'Vchod nad tebou se zavalil. Labyrint je živý, mění se a hlídají ho nestvůry.',
  'TVŮJ ÚKOL: Najdi Ariadninu nit, která jediná ukazuje cestu ven, a otevři s ní Daidalovu bránu Δ. Pak se vrať do tábora.',
];

// Sfinga: odpovědi se porovnávají bez diakritiky a velikosti písmen.
export const SPHINX_QUESTIONS = [
  { q: 'Kdo uťal hlavu Medúze?', a: ['perseus', 'persea', 'perseus syn diuv'], hint: 'Začíná na P a jeho otcem byl Zeus.' },
  { q: 'Snědl jsem své děti, ale nejmladší z nich mě porazil. Kdo jsem?', a: ['kronos', 'kronus', 'cronus', 'kronos titan'], hint: 'Pán času, titán s kosou.' },
  { q: 'Která bohyně se zrodila v plné zbroji z hlavy svého otce?', a: ['athena', 'pallas athena', 'athene'], hint: 'Bohyně moudrosti, jejím symbolem je sova.' },
  { q: 'Kolik prací musel vykonat Héraklés?', a: ['12', 'dvanact'], hint: 'Stejně jako je bohů na Olympu.' },
  { q: 'Sečti počet hlav Kerbera a počet Héraklových prací. Kolik ti vyšlo?', a: ['15', 'patnact'], hint: 'Kerberos má tři hlavy.' },
  { q: 'Tři kyklopové: Brontés je vyšší než Argés. Steropés je nižší než Argés. Kdo je nejvyšší?', a: ['brontes'], hint: 'Seřaď je od nejnižšího: Steropés, Argés, ...' },
  { q: 'Tři dveře. Na prvních stojí: „Za mnou je cesta ven.“ Na druhých: „Za prvními cesta ven není.“ Na třetích: „Cesta ven není za třetími.“ Pravdu říká jen jeden nápis. Za kterými dveřmi je cesta ven? Odpověz číslem.', a: ['3', 'tri', 'treti', 'za tretimi', 'tretimi'], hint: 'Zkus postupně předpokládat, že cesta je za 1., 2. a 3. dveřmi, a spočítej pravdivé nápisy.' },
  { q: 'Jsem bratr Dia. Nevládnu nebi ani moři a moje helma činí neviditelným. Kdo jsem?', a: ['hades', 'pluto', 'pluton'], hint: 'Vládce podsvětí.' },
  { q: 'Satyr Grover hledá ztraceného boha divočiny. Jak se ten bůh jmenuje?', a: ['pan'], hint: 'Má jen tři písmena.' },
  { q: 'V jaké zvíře se proměnil Zeus, když unesl princeznu Európu?', a: ['byk', 'byka', 'bykem', 'bily byk'], hint: 'Stejné zvíře jako polovina Minotaura.' },
];

export const SPHINX = {
  greet: 'Stůj, polobože. Nikdo neprojde, dokud mi správně neodpoví na TŘI otázky. Za každou chybu tě škrábnu drápem.',
  correct: ['Hm. Správně.', 'Nečekala jsem to. Správně.', 'Překvapivě chytré.'],
  wrong: 'ŠPATNĚ! Tady máš drápem. Zkus jinou otázku.',
  shout: 'AU, moje uši! Nekřič na mě! Dobře, dobře, nápověda:',
  done: 'Tři správné odpovědi. Jsi chytřejší, než vypadáš. Projdi.',
  already: 'Už jsi prošel. Neotravuj, zkoumám své drápy.',
};

export const GATE_RIDDLE = {
  q: 'Brána promluví hlasem Daidala: „Postavil jsem tento Labyrint i křídla z peří a vosku. Řekni jméno toho, kdo je nosil a už se nevrátil.“',
  a: ['ikaros', 'ikarus', 'ikar', 'icarus'],
  hint: 'Prohlédni si mozaiku vedle brány.',
  wrong: 'Brána se ani nepohne. „To není to jméno,“ zašeptá Daidalův hlas.',
  shout: 'Ozvěna tvého křiku se odrazí od brány. Na mozaice vedle se rozzáří chlapec padající do moře.',
};

// Pořadí symbolů pro zámek v Hekatině svatyni.
export const SYMBOLS = [
  { id: 'blesk', icon: '⚡', name: 'Blesk' },
  { id: 'trojzubec', icon: '🔱', name: 'Trojzubec' },
  { id: 'sova', icon: '🦉', name: 'Sova' },
  { id: 'lyra', icon: '🎵', name: 'Lyra' },
];
export const SYMBOL_SOLUTION = ['blesk', 'trojzubec', 'sova', 'lyra'];

export const MIST_CLUES = [
  'Sova není první ani poslední.',
  'Blesk stojí hned před trojzubcem.',
  'Lyra je někde napravo od sovy.',
];

export const ITEMS = {
  bronzeKey: { icon: '🗝️', name: 'Bronzový klíč', desc: 'Těžký klíč s vyrytým labyrintem.' },
  silverKey: { icon: '🔑', name: 'Stříbrný klíček', desc: 'Upadl pekelnému psovi z obojku.' },
  amulet: { icon: '🌙', name: 'Hekatin amulet', desc: 'Prohlédne Mlhu. Uvidíš, co je skryté.' },
  thread: { icon: '🧶', name: 'Ariadnina nit', desc: 'Zářící klubko, které ukazuje cestu ven.' },
  ambrosia: { icon: '🍪', name: 'Ambrózie', desc: 'Jídlo bohů. Vyléčí tě (klávesa H).' },
};

// Úkol zobrazený v HUD podle stavu hry.
export function objective(f) {
  if (f.escaped) return 'Jsi venku!';
  if (f.hasThread) return 'Otevři Daidalovu bránu Δ na konci arény.';
  if (f.lockOpen) return 'Poraz Minotaura a získej Ariadninu nit.';
  if (f.hasAmulet) return 'Mlha je pryč. Najdi skryté dveře a rozlušti symbolový zámek.';
  if (f.houndsDead) return 'Otevři truhlu v Hekatině svatyni.';
  if (f.sphinxDone) return 'Projdi chodbou plnou pekelných psů.';
  if (f.doorA) return 'Odpověz Sfinze na tři otázky.';
  if (f.hasBronzeKey) return 'Odemkni dveře na severu síně.';
  return 'Najdi cestu ze vstupní síně. Promluv si se satyrem.';
}

// Grover: užitečné nápovědy podle postupu.
export function groverLines(f) {
  const tip = !f.hasBronzeKey
    ? 'Viděl jsem něco lesklého nahoře na bednách v rohu. Satyři skáčou dobře, polobozi snad taky. Mezerník, ne?'
    : !f.doorA
      ? 'Ten klíč pasuje do severních dveří. Běž, já tu pohlídám... ehm... zadní voj.'
      : !f.sphinxDone
        ? 'Sfingy jsou ješitné a mají hrozně citlivé uši. Kdybys odpovídal nahlas a pořádně zakřičel, možná se lekne. Ale psaním ji nevyděsíš.'
        : !f.hasAmulet
          ? 'Pekelní psi útočí výpadem. Uskoč do strany a pak sekni. A v té svatyni za nimi cítím Hekatinu magii.'
          : !f.lockOpen
            ? 'S amuletem uvidíš nápisy, které Mlha skrývá. Čti je pozorně, je to logická hádanka.'
            : !f.hasThread
              ? 'Minotaura nezraníš zepředu, má kůži jako brnění. Ale býci se neumí zastavit. Co kdyby narazil do sloupu?'
              : 'Brána chce jméno. Daidalos postavil křídla pro svého syna... Na mozaice u brány by mohla být odpověď.';
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

export const EXAMINE = {
  statue: 'Socha Athény. Na podstavci stojí: „Moudrý vidí to, co Mlha skrývá.“',
  rubble: 'Zával. Tudy cesta zpět nevede.',
  fakeDoor: 'Mohutné dveře bez kliky. Nedají se otevřít ani vyrazit. Něco na nich nesedí, jako by se trochu vlnily.',
  fakeDoorMist: 'S amuletem vidíš pravdu: tady žádné dveře nejsou, jen malba na zdi.',
  mosaic: 'Mozaika: stařec v dílně staví křídla z peří a vosku. Vedle něj chlapec letí ke slunci, vosk taje a chlapec padá do moře. Pod obrazem je vyryto „I...“, zbytek je oprýskaný.',
  mistWall: 'Obyčejná kamenná zeď. Nebo ne? Když se díváš dlouho, zdá se, že se trochu chvěje.',
  chestLocked: 'Truhla se stříbrným zámkem. Bez klíčku ji neotevřeš.',
  gateLocked: 'Daidalova brána Δ. Na pečeti je vyobrazena zářící nit vedoucí z bludiště. Bez Ariadniny nitě se brána neotevře.',
  doorALocked: 'Těžké dveře s bronzovým zámkem ve tvaru labyrintu.',
  pillar: 'Masivní mramorový sloup. Vypadá, že by vydržel náraz i něčeho hodně velkého.',
};
