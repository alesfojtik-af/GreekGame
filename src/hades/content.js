// Texty questu Hádův palác. Vše česky.

export const INTRO = [
  'Po návratu z Labyrintu tě v noci probudil studený vítr. Hádovi zmizel helm temnoty a pán podsvětí je přesvědčený, že ho ukradl některý polobůh. Třeba ty.',
  'Než ses stihl(a) bránit, otevřela se pod tebou zem. Stojíš na břehu řeky Styx a místo nebe máš nad hlavou kámen.',
  'TVŮJ ÚKOL: Najdi Hádovu přilbu, dostaň se s ní do trůnního sálu a vyjednej si s Hádem cestu ven z podsvětí.',
];

export const ITEMS = {
  obol: { icon: '🪙', name: 'Obol', desc: 'Stříbrná mince pro převozníka Charóna.' },
  ball: { icon: '🔴', name: 'Gumový míček', desc: 'Červený míček na hraní. Pes by ho miloval. I ten s více hlavami. Použij klávesou F.' },
  helm: { icon: '🪖', name: 'Helm temnoty', desc: 'Hádova přilba. Klávesa R (nebo F) tě na 6 sekund zneviditelní.' },
};

// Urny na břehu: pravdu mluví jen jedna. Obol je v urně Beta.
export const URNS = {
  urnA: { name: 'Urna Alfa (Α)', text: 'Na urně je vyryto: „Obol je v této urně.“' },
  urnB: { name: 'Urna Beta (Β)', text: 'Na urně je vyryto: „Obol není v této urně.“' },
  urnC: { name: 'Urna Gama (Γ)', text: 'Na urně je vyryto: „Obol není v urně Alfa.“' },
};
export const URN_OBOL = 'urnB';
export const URN_TEXT = {
  search: 'Sáhnout dovnitř',
  wrong: 'Uvnitř je jen popel a z něj vyskočil štír. Píchl tě do ruky! Tahle urna lhala, nebo jsi špatně počítal(a).',
  right: 'Mezi popelem nahmatáš studenou minci. Obol!',
  empty: 'Urna je prázdná. Obol už máš.',
};

export const CHARON = {
  name: 'Charón (převozník)',
  text: 'Á, živý. To se nevidí často. Převážím jen ty, kdo zaplatí. Jeden obol a jedeme. Bez něj počkáš na břehu sto let jako ostatní duše.',
  options: [
    { label: 'Převez mě přes Styx.', act: 'ride' },
    { label: 'Kde vezmu obol?', reply: 'Mrtví ho dostávají od příbuzných pod jazyk. Kdo ho nemá, hledá. Ty urny tam u zdi ti něco poví. Ale jen jedna z nich mluví pravdu.' },
    { label: 'Pěkný oblek.', reply: 'Italské hedvábí. Hádés mi pořád nepřidal na platu, tak si šetřím na každém obolu.' },
  ],
  noObol: 'Bez obolu nejedu. Zkus urny u zdi.',
  paid: 'Charón zastrčí minci do kapsy saka. „Nastup. A ruce drž v člunu. Styx kouše.“',
  back: 'Charón pokrčí rameny. „Zaplaceno máš. Vozím tě, kam chceš.“',
};

export const CERBERUS = {
  wake: 'KERBEROS! Trojhlavý strážce brány podsvětí. A má hlad.',
  clang: 'Hlava uhnula a cvakla zuby. Zasáhni ji, až se po kousnutí skloní k zemi.',
  ball: 'Hodil(a) jsi míček! Všechny tři hlavy se za ním otočily a vrtí ocasem. Teď!',
  ballBack: 'Kerberos ti míček přinesl zpátky. Celý uslintaný.',
  ballNoTarget: 'Červený gumový míček. Tady ho není komu hodit.',
  ballWait: 'Kerberos si míček chvíli hlídá a nechce ho pustit.',
  headDown: 'Jedna hlava usnula a chrápe.',
  asleep: 'Kerberos usnul a chrápe na tři hlasy. Brána do Asfodelových luk je volná.',
};

export const TANTALUS = {
  name: 'Tantalos',
  greet: 'Vody po bradu a nemohu se napít. Ovoce nad hlavou a nemohu ho utrhnout. Pomoz mi zahnat nudu, polobože. Uhádni mou hádanku.',
  question: 'Rostu v zahradě paní podsvětí. Mám tvrdou slupku a uvnitř stovky zrníček rudých jako krev. Kdo jich ochutná jen šest, musí půl roku zůstat v podsvětí. Co jsem?',
  answers: ['granatove jablko', 'granatova jablka', 'granatoveho jablka', 'granatovnik', 'granat', 'granatove', 'pomegranate'],
  hint: 'Persefona jich kdysi snědla šest. Je to ovoce.',
  wrong: 'Ne, ne. To není ono. Zkus to znovu, mám čas. Celou věčnost.',
  shout: 'Nekřič, voda se vlní a utíká mi od pusy! Dobře, nápověda:',
  done: 'Správně. A dobře si to pamatuj: v Persefonině zahradě nic nejez, ať tě láká jakkoli. Na, vezmi si tohle. Já to stejně nedosáhnu.',
  already: 'Vody... ovoce... Nic nejez v zahradě, pamatuješ?',
};

export const SISYPHUS = {
  name: 'Sisyfos',
  text: 'Uf! Hrr! Nahoru... a zase dolů. Tisíc let. Už mě to nebaví. Polobože, zastav ten balvan a dám ti, co Hádés hledá. Jeho helm je zapečetěný pod mým balvanem.',
  options: [
    { label: 'Jak zastavím balvan?', reply: 'Hádova pečeť u kopce má tři kolečka s čísly. Nastav trojici čísel podsvětí: kolik hlav má strážce brány, kolik řek teče podsvětím a kolik soudců soudí mrtvé. (Zapsáno do deníku, klávesa J.)', journal: true },
    { label: 'Proč tu valíš balvan?', reply: 'Dvakrát jsem ošálil smrt. Jednou jsem dokonce spoutal Thanata. Bohové nemají smysl pro humor.' },
    { label: 'Kdo ukradl Hádovu přilbu?', reply: 'Já ne. Já ji jen... našel. A schoval. Pod balvan. Neříkej to Hádovi.' },
  ],
  done: 'Balvan stojí! Poprvé za tisíc let si sednu. Helm je tvůj, polobože. A Hádovi neříkej, kdo ho schoval.',
};
export const DIAL = { title: 'Hádova pečeť', digits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], solution: ['3', '5', '3'], text: 'Tři kolečka s číslicemi. Pod nimi je vyryto: „Hlavy strážce · řeky · soudci“.', wrong: 'Pečeť se ani nepohne. Balvan se valí dál.' };

export const PERSEPHONE = {
  name: 'Persefona, královna podsvětí',
  text: 'Živý polobůh v mé zahradě! Unavený, hladový... Nechceš ochutnat? Moje granátová jablka jsou nejsladší na světě. Na, vezmi si.',
  eat: { label: 'Vezmu si jablko.', reply: 'Kousl(a) jsi a zrníčka chutnají jako sladký led. Persefona se smutně usměje. „Kdo jí v podsvětí, patří podsvětí. Hádés to pozná. Ale dnes tě pustím.“ Odemkla dveře do paláce.' },
  refuse: { label: 'Děkuji, nemám hlad.', reply: 'Persefona se pobaveně usměje. „Chytré dítě. Někdo tě varoval.“ Mávne rukou a dveře do paláce se otevřou. „Můj manžel je v trůnním sále. Buď zdvořilý(á).“' },
  who: { label: 'Kdo jsi?', reply: 'Dcera Démétry. Půl roku tady dole, půl roku nahoře. Kvůli šesti zrníčkům. Proto tady všem nabízím jablka. Ze zvyku.' },
  decided: 'Už ses rozhodl(a). Dveře paláce jsou otevřené.',
};

export const HADES = {
  greet: 'Ty! Polobůh s mou přilbou v ruce. Tak ty jsi ji ukradl(a)? Ne? Hm. Vrať mi ji a odpověz na tři otázky. Když jsi opravdu prošel(a) mým královstvím, budeš znát odpovědi.',
  ate: 'Cítím na tobě granátové jablko. Kdo jí v podsvětí, patří podsvětí... Ale dnes mám dobrou náladu.',
  questions: [
    { q: 'Přes kterou řeku tě převezl Charón?', a: ['styx', 'styks', 'styxu', 'styksu', 'stix'], hint: 'Řeka přísahy, u které přísahají i bohové.' },
    { q: 'Kdo v Tartaru věčně valí balvan do kopce?', a: ['sisyfos', 'sisyfus', 'sisyphus', 'sisyfa', 'sizyfos', 'sisifos'], hint: 'Ten, kdo dvakrát ošálil smrt.' },
    { q: 'Co jsi v Persefonině zahradě nesměl(a) sníst?', a: ['granatove jablko', 'granatova jablka', 'granatoveho jablka', 'granat', 'granatove', 'jablko'], hint: 'Rudé ovoce se stovkou zrníček.' },
  ],
  correct: ['Hm. Správně.', 'Pozorný polobůh. To je vzácné.'],
  wrong: 'Špatně. Mrtví se tak rychle nespletou.',
  shout: 'NEKŘIČ v mém paláci! Dobře. Nápověda:',
  done: 'Prošel(a) jsi. Moje přilba je zpět a ty jsi nevinný(á). Za trůnem je chodba ven. Jdi, než si to rozmyslím.',
  already: 'Jdi, než si to rozmyslím. Chodba za trůnem.',
  noHelm: 'Přišel jsi s prázdnou? Kde je moje přilba?',
};

export const HELM = {
  on: 'Nasadil(a) jsi helm temnoty. Jsi neviditelný(á)!',
  off: 'Neviditelnost vyprchala.',
  wait: 'Helm se ještě nabíjí.',
  given: 'Hádés si vzal přilbu zpátky.',
};

export const PALACE = { locked: 'Těžké dveře z černého kamene. Zamčené. Klíč od paláce má jistě královna.' };
export const GARDEN = {
  gateLocked: 'Železná brána do Persefoniny zahrady. Na zámku je Hádova pečeť a z Tartaru za ní slyšíš valení balvanu.',
  gateOpen: 'Balvan se zastavil a celým podsvětím projelo zadunění. Brána do Persefoniny zahrady se otevřela.',
  spotted: 'Kostlivec tě zahlédl! Utíkej, nebo nasaď helm (R).',
  sneak: 'Prošel(a) jsi zahradou a žádný strážce tě nezahlédl.',
};

// Procházející duchové.
export const WANDERERS = {
  orfeus: {
    name: 'Duch Orfeův',
    text: 'Zahraju ti? Ne? Škoda. Hádés mě kdysi poslouchal se slzami v očích.',
    options: [
      { label: 'Jak se dostanu přes Styx?', reply: 'Charón nepřeváží zadarmo. Chce obol, starou minci. A podívej se na tu stélu u zdi. Urny rády lžou.' },
      { label: 'Jak jsi přemluvil Háda?', reply: 'Hudbou. A Persefona se za mě přimluvila. Je laskavější, než vypadá. Ale v její zahradě nic nejez.' },
      { label: 'Máš pro mě moudro?', reply: 'Neohlížej se. Ani když se bojíš, že za tebou nikdo nejde. Já se ohlédl.' },
    ],
  },
  achilles: {
    name: 'Duch Achilleův',
    text: 'Polobůh! Kdysi jsem byl nejsilnější z Řeků. Teď bloudím po loukách mezi asfodely.',
    options: [
      { label: 'Jak jsi zemřel?', reply: 'Šíp do paty. Jediné místo, za které mě matka držela, když mě nořila do Styxu.' },
      { label: 'Kudy dál?', reply: 'Na východ do Tartaru. Tam někde valí Sisyfos svůj balvan. Říká se, že pod ním něco schoval.' },
      { label: 'Máš pro mě moudro?', reply: 'Raději krátký slavný život než dlouhý nudný, říkal jsem. Tady dole jsem si to rozmyslel. Žij dlouho, polobože.' },
    ],
  },
};

// Výsledky nášlapných dlaždic a pák.
export const CURIOSITIES = {
  vision1: 'Dlaždice zazáří a ukáže ti vidění: tři bratři losují o svět. Zeus dostal nebe, Poseidón moře a Hádés podsvětí. Od té doby se Hádés na Olymp moc nedívá.',
  vision2: 'Ozve se cvaknutí a na stěně se na chvíli objeví zlatý text: „Orfeus hrál tak krásně, že ho Hádés pustil i s Eurydikou. Stačilo se neohlédnout.“',
  treasure: 'Ze škvíry vypadne váček zapomenutý nějakou duší. Uvnitř je ambrózie a pár šípů!',
  monster: 'Z puklin v zemi vylezou obří mravenci Myrmékové! I v podsvětí kousají.',
  pest: 'Z dlaždice vyskočil Kerkóps, malý chlupatý otrava.',
};

// Ozdoby bez nápovědy (bez pečeti), jedna na místnost.
export const DECOR = {
  bowl: 'Obří miska s nápisem ΚΕΡΒΕΡΟΣ. Uvnitř leží okousaná kost velká jako ty.',
  flowers: 'Asfodely. Bledé květy, které rostou jen tady. Duše tu mezi nimi bloumají a zapomínají, kým byly.',
  tree: 'Strom plný granátových jablek. Vypadají lákavě. Až moc.',
};

// Deník: skutečné nápovědy (se zlatou pečetí Δ).
export const JOURNAL = [
  { id: 'urns', place: 'Břeh Styxu', title: 'Stéla u uren', lines: ['Pravdu mluví jen jedna urna.', 'Alfa: „Obol je v této urně.“', 'Beta: „Obol není v této urně.“', 'Gama: „Obol není v urně Alfa.“'] },
  { id: 'rivers', place: 'Břeh Styxu', title: 'Pět řek podsvětí', lines: ['Styx: řeka přísahy', 'Acherón: řeka žalu', 'Léthé: řeka zapomnění', 'Kókytos: řeka nářku', 'Flegethón: ohnivá řeka'] },
  { id: 'cerberus', place: 'Kerberovo nádvoří', title: 'Nápis u brány', lines: ['Zde hlídá trojhlavý strážce Kerberos.', 'Hlavy má tři, hlad jeden. A rád si hraje.'] },
  { id: 'judges', place: 'Asfodelové louky', title: 'Stéla soudců', lines: ['Mrtvé soudí tři soudci podsvětí:', 'Mínós, Rhadamanthys a Aiakos.'] },
  { id: 'sisyphus', place: 'Tartaros', title: 'Sisyfova rada', lines: ['Balvan zastaví jen trojice čísel podsvětí na Hádově pečeti:', 'kolik hlav má strážce brány, kolik řek teče podsvětím a kolik soudců soudí mrtvé.'] },
  { id: 'tantalus', place: 'Tartaros', title: 'Tantalovo varování', lines: ['V Persefonině zahradě nic nejez.', 'Kdo ochutná granátové jablko, musí zůstat v podsvětí.'] },
];

export function objective(f) {
  if (f.escaped) return 'Jsi venku!';
  if (f.hadesDone) return 'Projdi chodbou za trůnem ven z podsvětí.';
  if (f.palaceOpen) return 'Vstup do trůnního sálu a vrať Hádovi jeho přilbu.';
  if (f.hasHelm) return 'Proplíž se Persefoninou zahradou na severu Asfodelových luk. Kostlivci tě nesmí vidět (R = neviditelnost).';
  if (f.sisyphusDone) return 'Seber Hádovu přilbu z pečeti v Tartaru.';
  if (f.cerberusDone) return 'Najdi v Tartaru (východně od luk) Sisyfa a zastav jeho balvan.';
  if (f.paidCharon) return 'Poraz Kerbera. Zasáhni hlavu, až se po kousnutí skloní k zemi.';
  if (f.hasObol) return 'Zaplať Charónovi obolem za převoz přes Styx.';
  return 'Najdi obol pro převozníka Charóna. Přečti stélu a prozkoumej urny.';
}

export const CREDITS_NOTE = 'Kerberos, Charón, Hádés a Persefona podle řeckých mýtů a knih Ricka Riordana.';
