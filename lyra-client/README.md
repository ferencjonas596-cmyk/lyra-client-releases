# Lyra Client 0.3.1

Electron + React + TypeScript + Vite launcher-váz Windowsra. Home, Mods, Settings oldalak és Play gomb, Mojang verziólista, távoli tartalom és electron-updater.

## Fejlesztés

Node.js 24 szükséges. Ebben a mappában: `npm ci`, `npm test`, `npm run dev`.
Produkciós build: `npm run build`; asztali indítás: `npm start`; NSIS telepítő: `npm run package`. A telepítő a `release/` mappába kerül; GitHubon a Releases részben található.

## Rögzített szolgáltatás

`https://lyraclientadatbazis.craftmc.eu`: a felhasználó nem állíthat be másik címet. A régi server.json értékét a kliens figyelmen kívül hagyja.

- Tartalom: `/api/content`, induláskor és percenként, ellenőrzött cache-sel.
- Launcher-frissítés: `/updates/latest.yml`, induláskor és óránként, letöltés és kilépéskori telepítés.
- Minecraft-verziók: közvetlen Mojang verziólista induláskor és 15 percenként.

A helyi adminpanel szerkesztése nem módosítja automatikusan a GitHub Pages tartalmát. Az online szolgáltatás kezelése a tároló gyökerében lévő README szerint történik.

## Korlátok és ellenőrzés

A Minecraft letöltése/indítása, Java-kezelés és Microsoft-hitelesítés placeholder. A modkapcsolók demók, a logó ideiglenes SVG. Az EXE nincs kiadói tanúsítvánnyal aláírva.

Az automatizált teszt az updater állapotait tesztpéldánnyal vizsgálja; nem igazolja a telepített EXE teljes frissítési ciklusát. A fejlesztői környezetben az Electron GPU-folyamata leállt, ezért a valódi Windows GUI-t és az önfrissítést normál Windows-munkamenetben még tesztelni kell.
