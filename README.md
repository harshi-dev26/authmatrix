# AuthMatrix v2 · PST_PD_016

An educational identity workspace for enterprise admins and app developers. Sign in on the web, select the same identity on your phone, and enter its current six-digit code. The browser and Python CLI verify that code independently.

**Educational prototype.** All accounts, passwords and TOTP secrets are public synthetic fixtures. The browser trusts editable localStorage. The partner page simulates consent and returns a local profile. There is no OAuth2/OIDC server, token issuance, network push service or production authorization boundary. Use only the supplied demo credentials.

## Accounts

| Account            | Email             | Demo password |
| ------------------ | ----------------- | ------------- |
| Maya Rao · Student | maya@example.test | StudentDemo1  |
| Alex Chen · Admin  | alex@example.test | AdminDemo1    |

## Run the web demo

1. Extract the archive. Open the **authmatrix** folder in VS Code to apply its shared formatting settings. Install **Live Server** and **Prettier – Code formatter** (esbenp.prettier-vscode).
2. Right-click **web/index.html** and choose **Open with Live Server**. Use the localhost or loopback URL. Bootstrap and Bootstrap Icons load via CDN.
3. Click **Fill Student Demo**, then **Sign in**. For a browser-only walkthrough, choose **Simulate Mobile Push Approval**. For a two-device demo, enter the code from Maya’s mobile Authenticator.
4. Use **Test Admin Action** to see the student permission boundary. Repeat with Alex to manage sessions, filter approval requests and export the matching records.

The direct-file entry includes a bundled module snapshot for browsers that restrict file imports. Localhost or HTTPS supports Web Crypto; if code verification is unavailable, use simulated push. Sample data resets affect only the four AuthMatrix keys on this browser origin.

## Run the mobile companion

1. Install Node.js 22 LTS (22.13 or newer), npm, and an **SDK 58-compatible Expo Go** build on your phone. On Android select SDK 58 at [Expo Go downloads](https://expo.dev/go). Consult the [Expo Go compatibility guide](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/) for your platform.
2. From the monorepo root run:

   ```sh
   cd mobile
   npm ci
   npx expo start --go
   ```

3. Connect the phone and computer to the same Wi-Fi. Scan the QR code in Expo Go on Android or with Camera on iPhone. If LAN discovery fails, try `npx expo start --tunnel` with internet access.
4. In **Approvals**, tap a decision or swipe right to approve and left to deny. Simulate another prompt and inspect decision history. This history lasts through tab changes and clears when the app restarts.
5. In **Authenticator**, choose the same account as the web or CLI. The badge reports whether the public demo key was read from SecureStore or held in memory. Copy or type the current digits. Enable automatic device time. Each account uses its own Base32 key, HMAC-SHA1 and a 30-second window. Both verifiers accept only the current window.

The mobile prompt and browser push button are independent simulations. TOTP is the working phone-to-browser and phone-to-CLI path. It requires matching clocks and seeds, with no backend or device pairing.

## Run the CLI

From the monorepo root run `python cli/authmatrix_cli.py` (on macOS, `python3 cli/authmatrix_cli.py`). Python 3.8+ needs no packages. Select **1**, enter a demo email, password and the corresponding phone code. Select **2** to test admin access, **3** to verify another code, **4** to log out or **0** to exit. Sessions last for this CLI process.

## Deploy the static web folder

- **GitHub Pages:** Push the monorepo to your own repository. Under **Settings → Pages → Build and deployment**, select **Deploy from a branch**, the branch containing the monorepo and **/(root)**. Save, wait for Pages to deploy, and visit `https://OWNER.github.io/REPO/web/`. This choice publishes the repository's files, including its public demo fixtures. [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- **Vercel:** Import the repository. Set **Root Directory** to `web`, choose **Other**, leave the build command empty and serve the root of that directory (`.`). Deploy and open the generated HTTPS URL. Hash-based navigation needs no server rewrites. [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)

## Architecture and persistence

| Location                                   | Responsibility                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| web/js/app.js, roleGuard.js                | Six v1 screens, route guards, second-factor dialog and feedback                                |
| web/js/store.js, auth.js                   | JSON seed, file fallback, scoped reset, credential validation, session creation and revocation |
| web/js/admin.js, totp.js                   | Decisions, filters, CSV download, printable audit and Web Crypto verification                  |
| mobile/App.js, src/screens, src/components | State-driven tab switcher, gesture and button decisions, accessible authenticator              |
| mobile/src/utils, src/data/payload.json    | SecureStore adapter, native digest-based HMAC, public phone fixtures                           |
| cli/authmatrix_cli.py                      | DemoUser, Session, TotpVerifier and interactive AuthMatrixApp                                  |
| web/data/sample-data.json                  | Canonical users, requests and per-account secrets; phone fixtures mirror the seeds             |

The web keeps v1’s `authmatrix_users`, `authmatrix_session`, `authmatrix_approvals` and `authmatrix_prefs`. The current session is shared across tabs. **Start another sign-in** adds a session after verification. Previous sessions remain in preferences, with v1 ended sessions retained. Students can revoke their own sessions. Admins can revoke any session. **Log out** ends all sessions belonging to the current identity. A refresh during verification requires restarting sign-in. Audit exports include every approval matching the dashboard filters, including completed decisions.

## Critical-path checklist

- [ ] Submit empty, malformed and incorrect credentials. Check field errors and generic invalid-login feedback.
- [ ] Fill a demo account. Cancel verification, then revisit protected home while signed out. Repeat and approve simulated push.
- [ ] Try both partner roles, deny consent, approve consent, and verify that completing the second factor opens the correct home.
- [ ] Enter a wrong account's code and a stale code. Retry with the current phone code on web and CLI; also paste a formatted code containing a space.
- [ ] As student, navigate directly to `#admin`. Check the explanation and return button. Repeat as admin and confirm access.
- [ ] Create two sessions. Revoke the older one and refresh. Revoke the current one and try Back. Repeat using global logout.
- [ ] As admin, simulate requests, approve and deny, inspect history, search by email and request ID, combine status and role filters, and clear them. Verify the empty state, counts and persistence.
- [ ] Export CSV, inspect its columns and matching records, then export PDF and choose **Save as PDF** in print preview. Screen controls should be absent.
- [ ] On the phone use tap and swipe in both directions. Switch tabs, simulate another request and check history. Test SecureStore badge, countdown rollover, copy confirmation and About / Limits.
- [ ] In the CLI test successful and invalid sign-in, both role checks, code verification and logout.
- [ ] Test the web at 360px and 1280px, long emails, keyboard-only navigation, the verification dialog and live feedback. On a phone test large text, screen reader labels and 48dp controls.
- [ ] Reload the same origin with existing v1 sample data. Test storage corruption and blocked storage, cancel reset, then allow storage and restore defaults. Open the direct-file version and check the fallback seed.

## Usability test notes

| Participant / device / viewport | Task                       | Expected result             | Observed result / time | Friction or accessibility issue | Change / retest |
| ------------------------------- | -------------------------- | --------------------------- | ---------------------- | ------------------------------- | --------------- |
|                                 | Sign in using a phone code | Correct protected home      |                        |                                 |                 |
|                                 | Deny a mobile request      | Decision appears in history |                        |                                 |                 |
|                                 | Filter and export an audit | Matching requests only      |                        |                                 |                 |
|                                 | Revoke current session     | Protected route blocked     |                        |                                 |                 |
