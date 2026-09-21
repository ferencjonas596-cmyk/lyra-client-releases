# A launcher domainjének bekötése

Cél: `https://lyraclientadatbazis.craftmc.eu`.

1. GitHub → repository Settings → Pages → Custom domain: `lyraclientadatbazis.craftmc.eu`, Save.
2. A `craftmc.eu` cPanel Zone Editorában az alábbi rekord szükséges:

| Mező | Érték |
| --- | --- |
| Név | `lyraclientadatbazis.craftmc.eu.` (ha csak előtagot kér: `lyraclientadatbazis`) |
| TTL | `3600` |
| Típus | `CNAME` |
| Rekord / cél | `ferencjonas596-cmyk.github.io.` |

Az azonos nevű meglévő A/AAAA/CNAME rekordokat előbb ellenőrizni kell; egymással ütköző rekordok nem maradhatnak. A craftmc.eu fődomain és más aldomain rekordjait nem kell módosítani.

3. Várd meg a GitHub DNS check sikerét és a HTTPS-tanúsítvány kiadását. Ez nem mindig azonnali. Kapcsold be az Enforce HTTPS lehetőséget, amikor elérhető.
4. Ellenőrizd HTTPS-en a `/api/content`, `/updates/latest.yml` és `/status.json` végpontokat. A `/api/content` közvetlenül, átirányítás nélkül adjon JSON-t, mert a launcher ezt várja.

Amíg a saját domain nincs bekötve, a Pages alapcíme a webhely ellenőrzésére használható: `https://ferencjonas596-cmyk.github.io/lyra-client-releases/`. A kiadott 0.3.1 launcher ettől még a saját rögzített domainjét használja.

A GitHub Releases letöltési linkje nem DNS-rekord. A címbe CNAME-célként nem kerül `https://`, fájlnév vagy repository útvonal.

Hivatalos útmutató: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
