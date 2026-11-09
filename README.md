# AutoTech Pro — Autószerviz Irányítási Rendszer (DMS)

Teljes körű, magyar nyelvű autószerviz irányítási rendszer (**Dealer Management System**) Node.js + Express + SQLite (`node:sqlite`) háttérrel és React + TypeScript + Tailwind CSS felülettel.

## Főbb modulok
- **Vezérlőpult (Áttekintés)**: Napi pénzügyi és műhely KPI-ok, műhelyállások élő foglaltsága, lejáró műszaki vizsgák, kritikus raktárkészlet-figyelő.
- **Munkalapok & Interaktív 2D Karosszéria Sérülésjelölő**: Kanban folyamatábra és lista nézet, 6-pontos állapotfelmérő, kattintható felülnézeti 2D autó-sziluett sérülésjelölővel, valamint 4-kerekes gumi profilmélység (mm), fékbetét (%) és nyomás (bar) mérőlap.
- **Ügyfél Állapotkövető & Online Árajánlat-Jóváhagyó Portál**: 6 lépéses javítási folyamatjelző, tételes költségkalkuláció és egykattintásos online ügyfél-jóváhagyás.
- **Digitális Szervizkönyv & Jármű Életút-idővonal**: Hitelesített futásteljesítmény-ellenőrzés, km-óra futásgörbe, 4-es karbantartási intervallum kalkulátor (olajcsere, vezérlés, váltóolaj/fékfolyadék, műszaki vizsga) és nyomtatható hitelesített szervizkönyv kivonat.
- **Gumiabroncs-Hotel (Szezonális Kerékraktár)**: Ügyfél kerékgarnitúrák tárolási polckódja, DOT-száma, 4-kerekes profilmélység mérése, kiadás/visszatárolás és nyomtatható tárolási jegy.
- **Előjegyzési Naptár, Alkatrészraktár, Számlázás és Szerelői Kapacitástervező**.

## Indítás helyi gépen

```bash
npm install
npm run dev
```

A rendszer a **http://localhost:3000** címen érhető el.
