// UI strings, keyed by BCP-47 base language. Keep both dictionaries in sync:
// every key in `pt` must exist in `en`. Proper nouns (CNEFE, IBGE, OSM,
// OpenFreeMap, Nominatim) are intentionally left untranslated.
//
// Paragraphs that embed markup (a <b> word, a link) are split into
// *Before/*After halves so App.jsx can wrap the inline element — this keeps
// each language's sentence order intact without putting HTML in the strings.

export const LANGS = ["pt", "en"];

export const messages = {
  pt: {
    docTitle: "CNEFE Brasil · Logradouros do Brasil",

    searchPlaceholder: "Buscar logradouro no Brasil…",
    searchAria: "Buscar logradouro no Brasil",
    searching: "buscando...",
    noResults: "nenhum resultado",
    searchError: "erro na busca",

    compare: "Comparar",
    about: "Sobre",
    language: "Idioma",

    sideOsm: "Mapa base · OSM",
    swipeTitle:
      "Arraste para comparar · esquerda: CNEFE (IBGE) · direita: mapa base (OSM)",
    zoomNote: "Aproxime para ver os logradouros do CNEFE.",

    noName: "sem nome",
    copied: "copiado",
    copyFailed: "falha ao copiar",

    close: "Fechar",
    aboutEyebrow: "CNEFE 2022",
    aboutTitle: "Logradouros do Brasil",
    aboutP1:
      "Faces de logradouro do IBGE (Censo 2022) para comparar nomes de ruas com o OpenStreetMap, ao lado do seu editor.",
    aboutP2Before: "Clique numa rua para copiar o nome. Ative ",
    aboutP2After: " para ver CNEFE × OSM lado a lado.",
    aboutP3:
      "Confira acentos e caixa antes de colar — o nome é um palpite, não um dado autoritativo. Projeto open-source independente.",
    aboutP4Before:
      "Dados do IBGE são de domínio público e podem ser usados no OSM, citando a fonte — ",
    osmWiki: "wiki do OSM",
    aboutP4After: ".",
  },

  en: {
    docTitle: "CNEFE Brasil · Streets of Brazil",

    searchPlaceholder: "Search a street in Brazil…",
    searchAria: "Search a street in Brazil",
    searching: "searching...",
    noResults: "no results",
    searchError: "search error",

    compare: "Compare",
    about: "About",
    language: "Language",

    sideOsm: "Base map · OSM",
    swipeTitle:
      "Drag to compare · left: CNEFE (IBGE) · right: base map (OSM)",
    zoomNote: "Zoom in to see the CNEFE streets.",

    noName: "no name",
    copied: "copied",
    copyFailed: "copy failed",

    close: "Close",
    aboutEyebrow: "CNEFE 2022",
    aboutTitle: "Streets of Brazil",
    aboutP1:
      "IBGE street segments (2022 Census) to compare street names against OpenStreetMap, right beside your editor.",
    aboutP2Before: "Click a street to copy its name. Turn on ",
    aboutP2After: " to see CNEFE × OSM side by side.",
    aboutP3:
      "Check accents and case before pasting — the name is a guess, not authoritative data. Independent open-source project.",
    aboutP4Before:
      "IBGE data is public domain and may be used in OSM with attribution — ",
    osmWiki: "OSM wiki",
    aboutP4After: ".",
  },
};
