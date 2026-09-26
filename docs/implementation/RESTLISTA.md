# Restlista — atlas

Senast uppdaterad: 2026-09-26

Här dokumenteras fel, risker, teknisk skuld, dokumentationsbrister och
förbättringsförslag som upptäcks under arbete och som kvarstår vid överlämning.
Listan är inte ett godkännande att starta nya arbeten eller en ersättning för
uppdragets plan, testlogg eller acceptanskriterier. En blockerande brist i det
aktuella uppdraget är fortfarande blockerande även om den registreras här.

## Arbetssätt

- Läs listan vid uppdragsstart och kontrollera relevanta punkter mot aktuellt läge.
- Registrera nya fynd löpande. Uppdatera befintlig punkt vid samma grundproblem.
- Använd unika, beständiga ID:n: R-001, R-002 osv. Återanvänd aldrig ett ID.
- Skilj verifierade observationer från misstankar. Skriv "Ej verifierad" när belägg saknas.
- Ange konsekvens, källa, nästa konkreta steg och villkor för stängning.
- Ange ansvarig om den är utsedd, annars "Ej utsedd". Hitta inte på ansvar eller beslut.
- Utöka inte uppdragets scope enbart för att ett fynd har registrerats.
- Flytta avslutade punkter till Stängda med datum, utfall och belägg. Radera inte historiken.
- Dokumentera aldrig hemligheter eller känsliga rådata; länka till lämpligt skyddat underlag.

### Prioritet

- **HÖG:** blockerar leverans/drift, innebär konkret säkerhets- eller dataförlustrisk eller bryter mot en hård regel. Lyft omedelbart till uppdragsägaren.
- **MEDEL:** behöver åtgärdas men blockerar inte det aktuella uppdragets acceptans.
- **LÅG:** mindre brist eller förbättringsförslag utan känd omedelbar påverkan.

### Status

**Öppen**, **Pågår**, **Blockerad**, **Kräver beslut**.
Ange blockerande beroende eller exakt beslut som behövs under Nästa steg.
Pågår kräver ett länkat aktivt uppdrag. Stängda punkter får ett utfall:
**Åtgärdad**, **Avförd** eller **Dubblett av R-xxx**.

## Öppna punkter

_Inga registrerade punkter ännu. Detta betyder inte att repot är verifierat felfritt._

<!-- Kopiera blocket nedan för ett verkligt fynd och ta bort kommentarsmarkörerna.
### R-XXX — <kort, konkret rubrik>

- **Upptäckt / senast uppdaterad:** <datum> / <datum>
- **Prioritet / status:** <HÖG, MEDEL eller LÅG> / <status>
- **Område:** <kod, tester, drift, säkerhet, dokumentation eller annat>
- **Ansvarig / uppdrag:** <namn eller Ej utsedd; länk till aktivt uppdrag om relevant>
- **Observation:** <vad som faktiskt upptäckts; ange vad som är osäkert>
- **Konsekvens:** <vem eller vad påverkas, och hur?>
- **Källa och belägg:** <fil/symbol, commit, test-ID, daterad logg eller worklog-länk>
- **Nästa steg:** <konkret åtgärd; vid beslut: exakt fråga och beslutsägare>
- **Klart när:** <kontrollerbart kriterium och hur resultatet ska verifieras>
-->

## Stängda

_Inga stängda punkter ännu._

<!-- Flytta hela punkten hit och behåll ID, beskrivning och tidigare belägg.
Komplettera med:
- **Stängd:** <datum>
- **Utfall:** <Åtgärdad, Avförd eller Dubblett av R-xxx>
- **Åtgärd eller beslut:** <vad som gjordes eller varför punkten avfördes; beslutsfattare>
- **Verifiering:** <resultat och länk till testlogg/worklog/commit som styrker utfallet>
En commit ensam bevisar inte att ett beteende fungerar.
-->
