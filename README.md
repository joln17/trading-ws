# Websocket-server för projektet i jsramverk
Med hjälp av websocket skickas realtidskurser på några utvalda kryptovalutor från [Coincap](https://coincap.io/).

## Tillgängliga skript
I projektets rotkategori kan följande kommandon köras:

* `npm start` Kör i utvecklingsläge.
* `npm run production` Kör i produktionsläge.

## Teknikval
För servern används Node.js med [Express](https://www.npmjs.com/package/express). För websocket används [WS](https://www.npmjs.com/package/ws). Jag valde WS istället för socket.io som använts tidigare i kursen främst för att slippa behöva installera en separat klient för socket.io för min frontend.

Servern ansluter till Coincaps websocket och skickar dels vidare realtidspriserna kontinuerligt till anslutna klienter (besökare på sidan) tillsammans med en timestamp för när priset registrerades på servern. Utöver det sparas även upp till en timmes historik för varje valuta som skickas till klienten när ett meddelande med valutans namn mottas från klienten. Senast registrerade pris för samtliga valutor kan också skickas när servern mottar ett meddelande `getCurrentData` från klienten.

Vid tappad anslutning mot Coincap försöker servern återansluta efter ett tidsintervall som ökar efter varje misslyckat försök att återansluta.
