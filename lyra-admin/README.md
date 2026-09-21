# Lyra Admin — helyi szerver

Tartalomszerkesztő, piszkozat/közzététel és EXE-feltöltés. Ez a szerver a saját adatmappájába publikál; **a GitHub Releases és GitHub Pages kapcsolat még nincs beépítve**. A rögzített domainen futó 0.3.1 launcher nem olvassa a helyi localhost tartalmát.

## Első indítás

Node.js 24 szükséges. Ebben a mappában: `npm ci`, `npm run setup`, `npm start`.
Nyisd meg a http://127.0.0.1:4310 címet. A setup által generált `.env` ADMIN_TOKEN értékével lehet belépni. Ez a kulcs nem kerül GitHubra vagy az EXE-be. További indításokhoz használható a `Start-Admin.cmd`.

## Működés

A cím, leírás, közlemény és kiemelőszín szerkeszthető, külön piszkozat mentéssel és közzététellel. A Deploy rész az EXE-t és latest.yml-t együtt kéri; a blockmap is feltölthető. Verzió-, méret-, fájlnév- és SHA-512 ellenőrzés történik. Hibás vagy régebbi kiadás esetén a meglévő feed marad elérhető.

`npm test` ellenőrzi a jogosultságokat, idegen Origin elutasítását, piszkozat/publikált tartalom különválasztását, a hibás fájlokat és az előző feed megőrzését.

## Saját szerver

A Dockerfile és compose.yaml alternatív, saját Node tárhelyhez készült. A PUBLIC_URL és HTTPS reverse proxy a tényleges tárhelyen állítandó be. A GitHub Pages statikus tárhely, ezt az Express szervert nem futtatja. Ne állítsd át emiatt a meglévő Pages domaint előkészítés nélkül.

A `.env`, `data/` és `node_modules/` helyi fájlok, nem részei a forrásnak.
