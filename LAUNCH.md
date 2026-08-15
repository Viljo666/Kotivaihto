# Kotivaihto – julkaisupäivän tarkistuslista

Tämä projekti on valmis GitHub Pages -julkaisuun, kun seuraavat omistajan tiedot ja palveluasetukset ovat valmiit. Älä julkaise keksityillä tiedoilla.

## Täydennä ennen julkaisua

1. Vahvista julkinen osoite. Projektin nykyinen oletus on `https://kotivaihto.fi`.
   - Jos osoite on toinen, muuta se tiedostoissa `index.html`, `robots.txt` ja `sitemap.xml`.
   - Jos käytät omaa osoitetta GitHub Pagesissa, lisää vasta sen jälkeen `CNAME`-tiedosto ja määritä DNS GitHubin ohjeen mukaisesti.
2. Täydennä `index.html`-tiedoston meta-asetukset oikeilla tiedoilla:
   - `publisher-name`: rekisterinpitäjän/julkaisijan virallinen nimi
   - `publisher-id`: Y-tunnus, jos soveltuu
   - `contact-email`: toimiva tuki- ja tietosuojayhteys
3. Tarkista tietosuojateksti oikean toimintamallin ja mahdollisten ulkoisten palveluiden kanssa. Sivusto tallentaa käyttäjän pyynnöstä kohteita selaimen paikalliseen muistiin ja voi myöhemmin käyttää mainosteknologiaa.
4. Pidä AdSense pois käytöstä, kunnes saat:
   - `ca-pub-...`-julkaisijatunnuksen
   - molemmat mainospaikkatunnukset
   - Googlen vaatimukset täyttävän CMP-/suostumusratkaisun käyttöön ja testattua sen oikealla domainilla
5. Jos haluat yhden napsautuksen kohdetuonnin, hanki Etuovi- tai Oikotie-palvelun hyväksymä rajapintasopimus. Nykyinen kopioi–liitä-tuonti on tarkoituksellinen eikä sivu yritä lukea ilmoitussivuja automaattisesti.

## Julkaise GitHub Pagesiin

1. GitHubissa avaa repositoryn **Settings → Pages** ja valitse **GitHub Actions** lähteeksi.
2. Yhdistä domain vasta, kun DNS-tietueet ovat valmiit.
3. Yhdistä tämän PR:n muutokset `main`-haaraan. `Deploy GitHub Pages` -työnkulku julkaisee vain `main`-haaran.
4. Avaa julkaistu osoite eri selaimella ja tarkista:
   - `data/hinnat.json` latautuu ja laskuri päivittyy
   - postinumerohaku, kohdetuonti, tallennetut kohteet, tulostus ja jaettava linkki toimivat
   - tietosuoja- ja mainosasetusten teksti sisältää oikeat julkaisija- ja yhteystiedot
   - Google Search Console- ja Bing Webmaster Tools -sivusto-omistukset on vahvistettu ja `sitemap.xml` lähetetty

## Jatkuva ylläpito

- Päivitä `data/hinnat.json` aina, kun uusi lähdehavainto tulee saataville ajamalla `node scripts/update-statistics.mjs`. Komento hakee Tilastokeskuksen lähdetaulukosta kaikki saatavilla olevat postinumeroalueet sekä julkaistut kunta-/kaupunkialueindeksit, säilyttää salaukset näkyvinä eikä luo ennusteita.
- GitHub Actions estää virheellisen postinumero-, salaus- tai kuntasarjadatan päätymisen julkaisuun.
- Pidä omistaja-, yhteys- ja mainosasetukset ajan tasalla. Ne ovat julkaisijan vastuulla.
