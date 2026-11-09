# AutoTech Pro — Autószerviz Irányítási Rendszer (DMS)

## 👉 [KATTINTS IDE AZ ÉLŐ PROGRAM INDÍTÁSÁHOZ (https://creator619.github.io/CARSERVICE/)](https://creator619.github.io/CARSERVICE/)

Teljes körű, magyar nyelvű autószerviz irányítási rendszer (**Dealer Management System**) Node.js + Express + SQLite (`node:sqlite`) háttérrel és React + TypeScript + Tailwind CSS felülettel, valamint böngészős (**GitHub Pages / Standalone**) működéssel.

---

## Főbb modulok
- **Vezérlőpult (Áttekintés)**: Napi pénzügyi és műhely KPI-ok, műhelyállások élő foglaltsága, lejáró műszaki vizsgák, kritikus raktárkészlet-figyelő.
- **Munkalapok & Interaktív 2D Karosszéria Sérülésjelölő**: Kanban folyamatábra és lista nézet, 6-pontos állapotfelmérő, kattintható felülnézeti 2D autó-sziluett sérülésjelölővel, valamint 4-kerekes gumi profilmélység (mm), fékbetét (%) és nyomás (bar) mérőlap.
- **Ügyfél Állapotkövető & Online Árajánlat-Jóváhagyó Portál**: 6 lépéses javítási folyamatjelző, tételes költségkalkuláció és egykattintásos online ügyfél-jóváhagyás.
- **Digitális Szervizkönyv & Jármű Életút-idővonal**: Hitelesített futásteljesítmény-ellenőrzés, km-óra futásgörbe, 4-es karbantartási intervallum kalkulátor (olajcsere, vezérlés, váltóolaj/fékfolyadék, műszaki vizsga) és nyomtatható hitelesített szervizkönyv kivonat.
- **Gumiabroncs-Hotel (Szezonális Kerékraktár)**: Ügyfél kerékgarnitúrák tárolási polckódja, DOT-száma, 4-kerekes profilmélység mérése, kiadás/visszatárolás és nyomtatható tárolási jegy.
- **Előjegyzési Naptár, Alkatrészraktár, Számlázás és Szerelői Kapacitástervező**.

## Indítás helyi gépen (Node.js + SQLite)

```bash
npm install
npm run dev
```

A rendszer helyi gépen a **http://localhost:3000** címen, online pedig a **[https://creator619.github.io/CARSERVICE/](https://creator619.github.io/CARSERVICE/)** címen érhető el.
