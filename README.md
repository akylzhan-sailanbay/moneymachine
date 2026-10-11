# Moneymachine

An editor for three trading screens: a PnL calendar, a PnL share card and a trade card. You edit every number, name, picture, GIF or video right on the screen, then save the result as a PNG (or as a video when the card has a video or GIF background).

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Edits and uploaded files are saved in your browser only.

## Hosting

Every push to `main` runs `.github/workflows/deploy.yml`, which builds `dist/index.html` with `scripts/build.mjs` and publishes it to GitHub Pages.

The build inlines the whole app into one page and encrypts it (AES-GCM, key derived with PBKDF2). Visitors see a sign-in screen, and only the configured username and password can unlock the app. The credentials live in the repository secrets `AUTH_USER` and `AUTH_PASS`, not in the code.

To change the login, update both secrets and re-run the workflow:

```sh
gh secret set AUTH_USER
gh secret set AUTH_PASS
gh workflow run deploy.yml
```

To build the protected page locally:

```sh
AUTH_USER=... AUTH_PASS=... node scripts/build.mjs   # writes dist/index.html
```
