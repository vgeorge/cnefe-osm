# RESEARCH — Camada de logradouros derivada dos pontos de endereço (CNEFE 2022)

Feasibility study for GitHub issue [#3](https://github.com/vgeorge/cnefe-osm/issues/3):
*"Adicionar camada de logradouros da CNEFE derivada dos pontos de endereço,
complementando as faces de logradouro atuais."*

Date: 2026-08-01. Sources: IBGE official FTP/docs, CNEFE data dictionaries, OSM
wiki. All primary-source claims are cited inline; every unconfirmed point is
flagged explicitly.

---

## Verdict — Feasible, with strong caveats

**Yes, it is technically feasible**, and the crux fact holds up: IBGE publishes a
**georeferenced address microdata dataset that carries BOTH per-address
coordinates AND the street-name fields**, separate from the faces dataset the app
uses today. So a points-derived logradouros layer *can* be built from primary data.

**But the value is narrower than it sounds, and the cost is higher:**

- The existing **Base de Faces de Logradouros already gives named *line*
  geometry**. Deriving lines from points would largely **duplicate** what faces
  already provide, at lower geometric quality (fitting a polyline through a point
  cloud is genuinely hard and error-prone).
- The address dataset is **~106 million records vs ~13.8 million faces** — roughly
  8× the volume, ~3.6 GB zipped nationally. It fits the existing
  tippecanoe→PMTiles→R2 pipeline **only if aggregated/thinned first**; feeding raw
  points in is much heavier than the current job.
- The genuine, non-duplicative gains are: (a) **coverage where faces geometry is
  thin** (rural / `NUM_QUADRA = 0` areas), (b) a **where-addresses-actually-are
  density signal**, and (c) point-level street labels usable as a cross-check.

**Recommended shape:** ship it as a **labeled point / point-cluster layer** (or a
sector-aggregated "streets present here" layer), **not** as synthesized polylines.
That captures the complementary value while sidestepping the hard and redundant
line-fitting. See Recommendation.

---

## 1. What CNEFE 2022 address-point data IBGE actually publishes

Yes — there is a georeferenced address-point microdata dataset, **separate** from
the faces-de-logradouros dataset the app uses today, and it is the right source.

Root FTP directory (all files public):
`https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/`

It contains four subfolders; two are relevant:

| Folder | What it is |
|---|---|
| `Arquivos_CNEFE/` | **Full CNEFE microdata** — every address with complete attributes **and** coordinates. **This is the dataset issue #3 needs.** |
| `Coordenadas_enderecos/` | A lighter "coordinates only" cut — coordinates + species, **no street names** (not usable alone for logradouros). |

### The dataset to use: `Arquivos_CNEFE/CSV/`
Path: `.../Censo_Demografico_2022/Arquivos_CNEFE/CSV/`
- `Dicionario_CNEFE_Censo_2022.xls` (data dictionary, 13 KB, sheet `CNEFE_2022`)
- `UF/` — 27 per-state ZIP CSVs
- `Municipio/` — same data split by municipality
- A parallel `GeoJSON/` sibling exists at `.../Arquivos_CNEFE/GeoJSON/`.

**Confirmed from the dictionary** (`Dicionario_CNEFE_Censo_2022.xls`, parsed
directly) — the relevant columns, verbatim:

- Coordinates: **`LATITUDE`** ("Latitude do Endereço"), **`LONGITUDE`**
  ("Longitude do Endereço"). Note: the raw files use `LATITUDE`/`LONGITUDE`
  decimal-degree columns, **not** `COORD_X`/`COORD_Y` — the `COORD_X/COORD_Y`
  naming in the issue framing does not match IBGE's actual columns.
- Street name: **`NOM_TIPO_SEGLOGR`** ("Tipo do logradouro"),
  **`NOM_TITULO_SEGLOGR`** ("Título do logradouro"), **`NOM_SEGLOGR`** ("Nome do
  logradouro"). (There is **no** `DSC_LOGRADOURO` field; the full name is the
  concatenation of the three `SEGLOGR` fields.)
- Geocoding quality: **`NV_GEO_COORD`** ("Nível de geocodificação", see §2).
- Linkage keys back to the faces dataset: `COD_SETOR`, **`NUM_QUADRA`**,
  **`NUM_FACE`** (plus `COD_UNICO_ENDERECO`, `COD_UF`, `COD_MUNICIPIO`, `CEP`,
  `DSC_LOCALIDADE`, `NUM_ENDERECO`, `COD_ESPECIE`, `DSC_ESTABELECIMENTO`, etc.).

So a single row = one address *species* with a name and a lat/lon. That is exactly
what a points-derived logradouros layer needs.

> The `Coordenadas_enderecos/` cut (`Dicionario_Coordenadas_Censo2022.xls`) has
> only `COD_UF, COD_MUN, COD_ESPECIE, LATITUDE, LONGITUDE, NV_GEO_COORD` — **no
> street-name columns** — so it cannot be used to derive named logradouros. Use
> `Arquivos_CNEFE/CSV/` instead.

## 2. Coverage & quality of the coordinates

**Every address is georeferenced.** IBGE states the 2022 Census produced, for the
first time, a **"cadastro 100% georreferenciado"** — the first time it captured a
location for *all* addresses in the country
([IBGE / censoagro portal](https://censoagro2017.ibge.gov.br/1992-novo-portal/edicao/39878-coordenadas-geograficas-dos-enderecos-no-censo-demografico-2022-censo2022.html),
[Agência Gov, 2024](https://agenciagov.ebc.com.br/noticias/202402/ibge-divulga-pela-primeira-vez-as-coordenadas-geograficas-dos-enderecos-do-pais)).

**But "georeferenced" ≠ "surveyed in the field".** Coordinate *quality* varies and
is flagged per-address by `NV_GEO_COORD` (verbatim from the dictionary):

| `NV_GEO_COORD` | Meaning |
|---|---|
| 1 | Endereço — coordenada **original** do Censo 2022 (field-collected) |
| 2 | Endereço — coordenada **modificada** (apartamentos no mesmo nº do logradouro) |
| 3 | Endereço — coordenada **estimada** (originalmente sem coordenada ou coordenada inválida) |
| 4 | **Face de quadra** (fell back to the block face) |
| 5 | **Localidade** |
| 6 | **Setor censitário** (fell back to the whole census sector) |

Levels 4–6 mean the point is a **fallback to the face/locality/sector centroid**,
not a real address position — clusters of such points collapse onto a few
coordinates and would badly distort any line-fitting. **`NV_GEO_COORD` must be used
to filter/weight** (prefer levels 1–2, treat 4–6 as low-trust).

IBGE notes it does **not curate** enumerator-entered data and does not guarantee
accuracy; street-name spellings vary and may need normalization before use (OSM
wiki import page, §7/§6 below).

**Not confirmed from a primary source:** the exact national *percentage split*
across `NV_GEO_COORD` levels. IBGE's methodological note *"Coordenadas geográficas
dos endereços no Censo Demográfico 2022: nota metodológica n. 01"* (2024, 26 pp.,
in the [IBGE library catalog](https://biblioteca.ibge.gov.br/index.php/biblioteca-catalogo?view=detalhes&id=2102063))
states it breaks the levels down **by UF and against the Statistical Grid**, but I
could not extract the numeric distribution from an openly-fetchable primary page.
**Recommend reading that PDF before committing** — the level-1 fraction directly
determines how usable a points layer is. Do not assume it; measure it.

## 3. Relationship between the two datasets

They are two views of the **same census address collection**, joinable on
`COD_SETOR` + `NUM_QUADRA` + `NUM_FACE`:

- **Base de Faces de Logradouros** = **line geometry** of block faces, each already
  carrying its street name. (This is what the app renders today as named street
  lines; the app's search over street names proves faces carry the name fields.)
- **`Arquivos_CNEFE` address points** = **point geometry**, one per address, with
  the same `SEGLOGR` name fields **plus** `NUM_FACE`/`NUM_QUADRA` pointing back at
  the face.

Implication for issue #3: because **faces already provide named *line* geometry**,
deriving lines from points is **largely redundant** — you would be reconstructing,
less accurately, geometry IBGE already publishes. The non-redundant value of the
points layer is where the two diverge:
- **Rural / unstructured areas** where faces are sparse and `NUM_QUADRA = 0`
  (dictionary footnote 3: "Endereços em áreas não urbanizadas possuem número de
  quadra = 0") — points may exist where a usable face does not.
- **Address density** and **species** (`COD_ESPECIE`: domicílio, escola, saúde,
  religioso, etc.) — information faces don't carry.
- A **name cross-check**: does the name on the points agree with the name on the
  face? Useful for the app's compare-with-OSM purpose.

## 4. Data volume & format

- **National record count:** **> 106 million addresses** (IBGE press releases,
  [June 2024 release note](https://www.ibge.gov.br/novo-portal-destaques/40076-ibge-divulgara-em-14-de-junho-o-cadastro-nacional-de-enderecos-para-fins-estatisticos-cnefe-atualizado-no-censo-demografico-2022.html)).
  Compare: **~13.8 M faces** today (repo README) → address points are **~8×** the
  record count.
- **Format:** CSV, one **ZIP per UF** under `Arquivos_CNEFE/CSV/UF/` (also GeoJSON
  and a `Municipio/` split). Semicolon-delimited CSV per IBGE convention (verify on
  download).
- **Size (confirmed from FTP listing):** the 27 UF CSV ZIPs total **~3.6 GB
  zipped** (largest: `35_SP.zip` 1.0 GB, `31_MG.zip` 512 MB, `29_BA.zip` 380 MB,
  `33_RJ.zip` 322 MB; smallest `14_RR.zip` 4.3 MB). Uncompressed CSV will be on the
  order of tens of GB. The "coordinates-only" cut is far smaller (~600 MB zipped)
  but, again, lacks names.
- **CRS / datum:** the raw files carry geographic **`LATITUDE`/`LONGITUDE` in
  decimal degrees**; IBGE's standard geodetic reference is **SIRGAS 2000
  (EPSG:4674)** — so effectively drop-in lat/lon, **no reprojection needed** for
  MapLibre/WGS84 (SIRGAS 2000 ≈ WGS84 at web-map scales). *Note:* a third-party
  republication ([Geobases ES](https://ide.geobases.es.gov.br/layers/geonode:ibge_coord_end_es_censo_2022_epsg_31984))
  reprojects to **EPSG:31984** (SIRGAS 2000 / UTM 24S); that is a projected
  derivative, **not** the raw FTP files — do not confuse the two. I did not find an
  IBGE page stating the datum EPSG code in words, but decimal lat/lon + IBGE's
  SIRGAS 2000 standard is the safe reading.

## 5. Technical approach to derive geometries/labels from points

Ranked by realism (best first):

1. **Labeled point / point-cluster layer (recommended).** Render address points
   directly, colored/labeled by normalized street name, filtered to
   `NV_GEO_COORD ∈ {1,2}`. Cluster or thin by name within a sector for legibility.
   No geometry synthesis; robust; complementary to faces. Cheapest and most honest.
2. **Sector-aggregated "streets present" layer.** Group points by
   (`COD_SETOR`, normalized name), emit a labeled centroid or a convex/α-hull per
   name-in-sector. Gives a coverage/where-is-this-street view without pretending to
   trace the road.
3. **Snap points to existing faces.** Join points to faces via
   `NUM_FACE`/`NUM_QUADRA` and inherit the face polyline. But then you're just
   re-rendering faces — no new geometry, only useful for name cross-checking.
4. **Fit polylines through point clusters (hardest, not recommended).** Order
   points along a street and fit a line. Genuinely hard: multi-block streets,
   name-spelling variants, curved/branching roads, and levels 4–6 collapsing onto
   centroids all break naïve fits. Lower quality than the faces IBGE already ships.

**What's genuinely hard regardless of option:** street-name **normalization**
(joining `NOM_TIPO_SEGLOGR` + `NOM_TITULO_SEGLOGR` + `NOM_SEGLOGR`, handling
abbreviations/accents/typos — IBGE does not curate these), and honoring
`NV_GEO_COORD` so fallback centroids don't create phantom clusters.

## 6. Licensing

**Usable in OSM with attribution.** IBGE data is treated as **public domain** by
the OSM-Brasil community; IBGE has not issued a formal license but **informally
confirmed public-domain status** in documented community exchanges, and there is an
active, documented import project. Attribute as **"CNEFE data, IBGE, Brasil"**
([OSM wiki: CNEFE data, IBGE, Brasil import](https://wiki.openstreetmap.org/wiki/CNEFE_data,_IBGE,_Brasil_import)).
The same wiki page **explicitly proposes using CNEFE street names to name unnamed
OSM roads**, i.e. this exact use case is anticipated. The FTP index states plainly
"Todos os arquivos aqui disponíveis são públicos." Same terms as the faces layer
the app already ships — **no new licensing risk.**

## 7. Fit with the existing pipeline

The pipeline (source CSV/geometry → tippecanoe MVT z13–15 → single national
`.pmtiles` → Cloudflare R2 range requests, overzoom to z16+) **can absorb an
address-points layer, but not naïvely:**

- **Volume:** ~106 M points vs ~13.8 M faces. tippecanoe can tile 100 M+ features,
  but the tiling job, intermediate storage, and final PMTiles size grow
  accordingly. **Pre-aggregation/thinning (§5 option 1–2) is the difference between
  a routine build and a heavy one.**
- **It's a new, separate layer** — add it as an additional MVT source-layer (or a
  second PMTiles file), toggled beside faces; don't merge into the faces layer.
- **No CRS work:** decimal lat/lon drops straight in.
- **Same hosting model:** points-as-MVT + overzoom + R2 works identically. Expect a
  larger `.pmtiles`; budget for it or ship a filtered subset (e.g. levels 1–2 only,
  or names-only where they disagree with faces).

Net: **fits the pipeline, is bigger and needs an aggregation step**, but is not a
new architecture.

---

## Recommendation / next steps

1. **Build it as a labeled point / point-cluster layer, not synthesized polylines**
   (§5 option 1). Complements faces; avoids duplicating and degrading geometry IBGE
   already publishes.
2. **Before building, read IBGE's methodological note n. 01 (2024)** to get the
   `NV_GEO_COORD` distribution — the level-1/2 fraction decides how much of the
   dataset is actually worth rendering. Measure, don't assume (§2).
3. **Prototype on one UF** (e.g. `53_DF.zip`, 19 MB — small, urban) end-to-end:
   parse CSV → filter `NV_GEO_COORD ∈ {1,2}` → normalize
   `NOM_TIPO/TITULO/SEGLOGR` → tile → eyeball against faces + OSM.
4. **Frame the layer's purpose as the compare-with-OSM cross-check** the app is
   already about: "here are CNEFE-named addresses," especially where faces are thin
   (`NUM_QUADRA = 0` rural). That's the non-redundant value.
5. **Keep it a separate toggleable layer / source-layer**; pre-aggregate to control
   PMTiles size before touching the national build.
6. **Attribution:** "CNEFE data, IBGE, Brasil" — unchanged from the faces layer.

**Open item to confirm:** exact `NV_GEO_COORD` national percentages and the precise
CSV delimiter/encoding — both resolved by opening the methodological PDF and one UF
ZIP; neither was confirmable from an openly-fetchable primary page here.

---

## Sources

- IBGE FTP — CNEFE Censo 2022 root (all four subfolders):
  https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/
- IBGE FTP — full microdata CSV (names + coordinates), the dataset to use:
  https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/
  - Data dictionary: `.../Arquivos_CNEFE/CSV/Dicionario_CNEFE_Censo_2022.xls`
  - Per-UF CSV ZIPs: `.../Arquivos_CNEFE/CSV/UF/`
- IBGE FTP — coordinates-only cut (no names): `.../Coordenadas_enderecos/` and
  `Dicionario_Coordenadas_Censo2022.xls`
- IBGE FTP — Base de Faces de Logradouros (current app source, line geometry + names):
  https://geoftp.ibge.gov.br/recortes_para_fins_estatisticos/malha_de_setores_censitarios/censo_2022/base_de_faces_de_logradouros_versao_2022_censo_demografico/
- IBGE — coordinates page ("cadastro 100% georreferenciado"):
  https://censoagro2017.ibge.gov.br/1992-novo-portal/edicao/39878-coordenadas-geograficas-dos-enderecos-no-censo-demografico-2022-censo2022.html
- IBGE — CNEFE 2022 microdata release note (> 106 M addresses, full attributes):
  https://www.ibge.gov.br/novo-portal-destaques/40076-ibge-divulgara-em-14-de-junho-o-cadastro-nacional-de-enderecos-para-fins-estatisticos-cnefe-atualizado-no-censo-demografico-2022.html
- IBGE — first release of address coordinates announcement:
  https://www.ibge.gov.br/novo-portal-destaques/40101-ibge-divulgara-em-21-de-maio-os-microdados-do-cadastro-nacional-de-enderecos-para-fins-estatisticos-cnefe-oriundos-do-censo-demografico-2022.html
- Agência Gov — "IBGE divulga pela primeira vez as coordenadas geográficas dos endereços":
  https://agenciagov.ebc.com.br/noticias/202402/ibge-divulga-pela-primeira-vez-as-coordenadas-geograficas-dos-enderecos-do-pais
- IBGE library — methodological note n. 01 (geocoding levels by UF; PDF, not fetched here):
  https://biblioteca.ibge.gov.br/index.php/biblioteca-catalogo?view=detalhes&id=2102063
- Geobases ES — third-party republication reprojected to EPSG:31984 (SIRGAS 2000 / UTM 24S):
  https://ide.geobases.es.gov.br/layers/geonode:ibge_coord_end_es_censo_2022_epsg_31984
- OSM wiki — CNEFE data, IBGE, Brasil import (licensing + proposed use for naming roads):
  https://wiki.openstreetmap.org/wiki/CNEFE_data,_IBGE,_Brasil_import
