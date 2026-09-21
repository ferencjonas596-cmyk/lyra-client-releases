# Kiadások publikálása

A felhasználó kérése alapján minden további elkészített Lyra-kiadást ide kell publikálni:
https://github.com/ferencjonas596-cmyk/lyra-client-releases

Verziónként GitHub Release készüljön vX.Y.Z címkével, a hozzá tartozó Setup EXE, .blockmap és latest.yml fájlokkal. A metaadatok verziója, mérete és ellenőrzőösszege egyezzen az EXE-vel. Titkok, .env fájlok, adminadatok és node_modules nem publikálhatók. A kiadási leírás jelezze a ténylegesen tesztelt funkciókat és a fennmaradó korlátokat.

A launcher rögzített domainje továbbra is https://lyraclientadatbazis.craftmc.eu. A GitHub-feltöltés önmagában nem kapcsolja be ezen a domainen a frissítési szolgáltatást. Az adminpanel automatikus GitHub Deploy integrációja külön fejlesztés; a jelenlegi publikálás bejelentkezett GitHub-munkameneten keresztül történik.
