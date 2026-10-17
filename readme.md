# Finni

## The problem

Most people only open their banking app after something has already gone wrong: an overdraft, a bill they forgot, or a month of small purchases that added up. Banking apps wait for you to check in, and by then it is too late to change anything. Budgeting tools help, but they take effort to set up and most people stop using them.

## How Finni solves it

Finni is a mobile app where you manage your money by texting Finn, a friendly finance companion connected to your bank accounts.

- **Finn reaches out first.** He warns you before a bill is due, when your spending jumps, or when your balance is getting low, so you can act before it becomes a problem.
- **Ask anything in plain language.** "What did I spend on food this week?" or "Where is the nearest ATM?" gets you a straight answer.
- **Saving is built in.** Tell Finn what you are saving for and he creates a dedicated savings account for it, tracks your progress, and keeps you on pace.
- **Finn can take action, but only with your approval.** He can move money or pay a bill for you, but nothing happens until you tap Approve, and larger amounts require extra verification.



## Run it

You need a current Node LTS, a Supabase Postgres database, a Nessie API key, and a Gemini API key. The app runs in Expo Go on your phone.

1. Install everything from the repo root:

   ```sh
   npm install
   ```

2. Copy `apps/api/.env.example` to `apps/api/.env` and fill in `NESSIE_KEY`, `GEMINI_API_KEY`, and `DATABASE_URL`. For Expo Go, set `AUTH_MODE=demo`. Each phone then signs in with its own device id, and Face ID confirms large moves. Never use demo mode in production. The server refuses it when `NODE_ENV=production`.

3. Copy `apps/mobile/.env.example` to `apps/mobile/.env`. Keep `EXPO_PUBLIC_AUTH_MODE=demo`, and set `EXPO_PUBLIC_DEMO_NAME` to the first name Finn should use.

4. Set up the database once:

   ```sh
   npm run db:push -w @finni/api
   npm run seed:merchants -w @finni/api
   ```

5. Start the API (port 4000):

   ```sh
   npm run api
   ```

6. In a second terminal, start the app and scan the QR code with Expo Go. Your phone and laptop must be on the same Wi-Fi:

   ```sh
   npm run mobile
   ```

The first launch shows "Finn is getting your accounts ready" while it creates your demo accounts. Settings has "Reset demo data" to start over.

### If the phone can't reach the laptop

Campus and hotel Wi-Fi often block devices from talking to each other. You'll see "Couldn't reach Finni at ..." on the loading screen. To get around it:

1. Start Expo with a tunnel: `npx expo start --tunnel` from `apps/mobile`.
2. Expose the API with a tunnel too, for example `npx localtunnel --port 4000`.
3. Put the API tunnel URL in `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`, then restart Expo.

### Checks

```sh
npm run typecheck
npm test -w @finni/api
npm test -w @finni/mobile
```
