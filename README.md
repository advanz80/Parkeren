# Human Campus EV Parkeren & Laden

Webapplicatie voor het reserveren van EV-laadplekken op de Human Campus in Helmond.

## Functionaliteiten

### Gebruikers
- Account aanmaken met naam, email, kenteken en telefoonnummer
- Inloggen met email en wachtwoord
- Profiel bewerken
- Laadplekken bekijken en beschikbaarheid controleren
- Reserveringen maken per half uur, max 1 week vooruit
- Reserveringen bevestigen, annuleren en beheren
- Wachtlijst: meld je aan als alles bezet is, ontvang melding als plek vrijkomt
- Herinneringen via email: 30 min voor start, bij start, en 30 min voor einde

### Beheerders
- Laadpleinen aanmaken, bewerken en verwijderen
- Laadplekken beheren (nummer, max. laadtijd, actief/inactief)
- Overzicht van statistieken en reserveringen

## Technische Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Frontend:** React 18 + React Router
- **Authenticatie:** JWT
- **Email:** Nodemailer (SMTP)
- **Cron Jobs:** node-cron (herinneringen)

## Installatie

```bash
# Dependencies installeren
npm install
cd client && npm install && cd ..

# Environment variabelen instellen
cp .env.example .env
# Pas .env aan met je eigen SMTP-instellingen

# Database seeden (maakt admin account + voorbeelddata)
npm run seed

# Ontwikkelmodus (backend + frontend)
npm run dev

# Productie build
npm run build
npm start
```

## Standaard Admin Account

- **Email:** admin@humancampus.nl
- **Wachtwoord:** admin123

## Herinneringssysteem

Het systeem draait een cron job elke 5 minuten:
1. **30 min voor start:** Herinnering per email met bevestigingslink
2. **Bij starttijd:** Laatste herinnering als niet bevestigd
3. **30 min na start:** Plek vrijgegeven als nog niet bevestigd (wachtlijst wordt genotificeerd)
4. **30 min voor einde:** Herinnering dat laadtijd bijna verloopt

## Responsive Design

De app werkt op zowel desktop als mobiel (responsive SaaS-stijl).
