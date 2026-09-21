# Lyra Client

Windows launcher-előzetes: Electron, React, TypeScript és Vite. Ebben a tárolóban van a launcher forrása, a helyi adminpanel, a frissítési szolgáltatás és a kiadási automatizálás.

**[Legújabb telepítő](https://github.com/ferencjonas596-cmyk/lyra-client-releases/releases/latest)** · **[Közzététel és ellenőrzések](https://github.com/ferencjonas596-cmyk/lyra-client-releases/actions)**

## Mi hol található?

| Útvonal | Tartalom |
| --- | --- |
| `lyra-client/` | Asztali alkalmazás teljes fejlesztői forrása és függőségrögzítése |
| `lyra-admin/` | Helyben futó adminpanel forrása; nincs online GitHub Deploy kapcsolat |
| `content.json` | Launcher főcíme, leírása, közleménye, színe és tartalomverziója |
| `build-site.mjs`, `test/` | Ellenőrzött publikus frissítési szolgáltatás generálása és tesztjei |
| `.github/workflows/` | Tesztek, Windows-telepítő készítése és Pages-közzététel |
| GitHub Releases | EXE, EXE.blockmap, latest.yml — ezek nem a forrásfájlok közé kerülnek |

## Tartalom módosítása

1. Nyisd meg a [content.json szerkesztőjét](https://github.com/ferencjonas596-cmyk/lyra-client-releases/edit/main/content.json).
2. Módosítsd a szöveget/színt és növeld a `revision` egész számot.
3. Mentsd a main ágra. A `Publish Lyra update service` automatikusan lefut.
4. Az Actions zöld eredménye jelzi a sikeres közzétételt. Hibás kiadási fájlok esetén a korábbi működő webhely marad fent.

## Windows-kiadás készítése

1. Új kiadás előtt növeld a verziót a `lyra-client` mappában: `npm version patch --no-git-tag-version`. Commitold a package.json és package-lock.json módosítását.
2. Frissítsd a `RELEASE-NOTES.md` leírását a tényleges változásokkal.
3. Actions → **Build Windows installer** → **Run workflow**. Alapértelmezésben csak letölthető build-artifact készül; a `create_draft` választással GitHub Release-piszkozat is.
4. Teszteld Windows alatt az EXE telepítését, indulását és a korábbi verzióról frissítést.
5. Publikáld a kész Release-piszkozatot. A frissítési szolgáltatás automatikusan átveszi az új stabil kiadást, ha a fájlok ellenőrzése sikeres.

A már létező kiadást a build nem írja felül. Az új EXE, a hozzá tartozó blockmap és a latest.yml egy kiadáshoz tartozik; az ellenőrzés összeveti a verziót, méretet és SHA-512 értéket, majd a telepítőt ténylegesen letölti és ellenőrzi.

## Domain és végpontok

A launcher rögzített címe: `https://lyraclientadatbazis.craftmc.eu`. A játékos nem állíthat be saját szervert.

- `/api/content`: ellenőrzött szöveges tartalom, kiterjesztés nélküli JSON.
- `/updates/latest.yml`: electron-updater metaadat, az EXE GitHub Releases címére mutat.
- `/status.json`: közzétett verzió, tartalomverzió és build ideje.

GitHub Settings → Pages → Source: **GitHub Actions**. A DNS-hez és HTTPS-hez lásd: [DOMAIN.md](DOMAIN.md). A GitHubra feltöltés önmagában nem állítja be a cPanel DNS-rekordját.

## Fejlesztés

Node.js 24 és npm szükséges. A mappák önálló npm projektek.

```sh
npm ci
npm test
cd lyra-client
npm ci
npm test
npm run dev
```

Adminpanel: `cd lyra-admin`, `npm ci`, `npm run setup`, `npm start`. A setup a saját gépen generál belépési kulcsot a `.env` fájlba. A `.env`, `data`, `node_modules` és helyi naplók nem részei a tárolónak.

## Jelenlegi korlátok

- A Minecraft telepítése/indítása és a Microsoft-bejelentkezés még placeholder.
- A modkapcsolók demók, a logó ideiglenes SVG.
- Az EXE nincs kiadói tanúsítvánnyal aláírva.
- Az automatikus build és unit tesztek nem helyettesítik a telepített Windows-alkalmazás és az önfrissítés kézi tesztjét.
- A helyi adminpanel nem publikál automatikusan GitHubra. Az online tartalomszerkesztés jelenleg a GitHub `content.json` szerkesztőjén keresztül történik.
