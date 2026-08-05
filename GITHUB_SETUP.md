# Putting Akka on GitHub

Your project already has git set up locally with a first commit. This guide covers pushing it to GitHub so there's a backup off your laptop and a full history of every change.

---

## Why bother

Right now the only copy of this project is on your Mac. If the laptop dies, or you delete the wrong folder, it's gone. GitHub gives you an off-machine backup, a record of every change (so you can undo anything, even weeks later), and somewhere to point a collaborator if you ever bring one on.

Private repositories are free and unlimited. Nobody sees your code unless you invite them.

---

## Step 1 — Create a GitHub account

Skip if you have one. Otherwise go to [github.com/signup](https://github.com/signup) and register. Note your **username** — you'll need it below.

## Step 2 — Create the repository

1. Go to [github.com/new](https://github.com/new).
2. **Repository name:** `Akka`
3. **Description** (optional): `Surplus food marketplace for Korea — React Native + Firebase`
4. Choose **Private**. (You can flip it to public later. Keep it private for now — see the security note at the bottom.)
5. **Do not** tick "Add a README," "Add .gitignore," or "Choose a license." Your project already has these, and adding them here creates a conflict that's annoying to untangle.
6. Click **Create repository**.

You'll land on a page showing setup commands. Ignore them — use the ones below instead, they're matched to your situation.

## Step 3 — Connect your project and push

Open Terminal and run these **one line at a time**, pressing Enter after each. Replace `YOUR-USERNAME` with your actual GitHub username.

```
cd ~/Documents/akka
git remote add origin https://github.com/YOUR-USERNAME/Akka.git
git branch -M main
git push -u origin main
```

**What each line does:**

- `cd` moves into your project folder.
- `git remote add origin ...` tells git where on GitHub this project lives.
- `git branch -M main` names your main line of work "main" (GitHub's default).
- `git push -u origin main` uploads everything. The `-u` means future pushes only need `git push`.

## Step 4 — Signing in when prompted

When you push, git asks for a username and password. **Your normal GitHub password will not work** — GitHub stopped accepting those for command-line access in 2021. You need a Personal Access Token instead.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token** → **Generate new token (classic)**.
2. **Note:** `Mac terminal`
3. **Expiration:** 90 days. Avoid "No expiration" — see the note below on why.
4. **Scopes:** tick **`repo`** — that's the only one you need.
5. Click **Generate token**.
6. **Copy the token immediately.** GitHub shows it exactly once. Paste it somewhere safe, like a password manager.

Back in Terminal, when prompted:
- **Username:** your GitHub username
- **Password:** paste the token (it will look like nothing is typing — that's normal, terminals hide passwords)

To avoid repeating this every time, run once:
```
git config --global credential.helper osxkeychain
```
macOS will then remember the token in your Keychain.

### Why not "No expiration"

That token is a key to your account's code. With the `repo` scope, anyone holding it can read all your private repositories and push changes to them — no password needed, and it bypasses two-factor authentication. That's by design, so tools can work without a human present.

Tokens leak in ordinary ways: pasted into a chat while asking for help, caught in a screenshot, committed into a repo by accident, left on a laptop that's sold or stolen.

The problem is you rarely find out. There's no alert when a token leaks. A 90-day token that leaks on day 10 stops working on day 90 regardless — a token with no expiry keeps working until you personally notice and revoke it, which might be never. Expiration doesn't prevent leaks; it caps how long one can hurt you.

With the keychain helper above, renewing is a few minutes about four times a year.

**If you ever suspect a token is exposed**, revoke it immediately at [github.com/settings/tokens](https://github.com/settings/tokens). It's instant and free — just generate a new one afterwards.

---

## Saving your work from here on

Every time you finish a chunk of work, run these three from `~/Documents/akka`:

```
git add -A
git commit -m "describe what changed"
git push
```

Write the message as if finishing the sentence "This change will…" — for example `git commit -m "add distance sorting to browse screen"`. Six months from now, that's what tells you which commit to roll back to.

To see your history: `git log --oneline`

---

## Security note — read before making this public

`src/config/firebaseConfig.ts` contains your Firebase project keys, and it **is** committed to the repository.

This is normal and expected for Firebase. Those keys are not secrets — they ship inside every copy of your app, and anyone can extract them from an installed app. Firebase is designed around this: what actually protects your data is the security rules in `firestore.rules` and `storage.rules`, not hiding the keys.

That said:

- **Keep the repo private for now.** No reason to hand strangers a map of your project while it's half-built.
- **Your security rules are what matter.** Before this app is public, revisit the caveats noted at the top of `firestore.rules` — particularly that any signed-in user can currently adjust a listing's remaining quantity.
- **Never commit a real secret.** Things like a Toss Payments secret key or a Firebase Admin service-account JSON are genuinely sensitive and must never go in the repo. When you get to payments, ask Claude how to keep those out — the answer involves environment variables, not just adding them to `.gitignore`.

---

## If something goes wrong

**"not a git repository"** — you're not standing inside the project folder. Run `cd ~/Documents/akka` first. Your prompt should show `akka %` rather than `~ %`.

**"remote origin already exists"** — you ran step 3 twice. Fix with:
```
git remote set-url origin https://github.com/YOUR-USERNAME/Akka.git
```

**"failed to push some refs"** — you probably ticked "Add a README" when creating the repo. Fix with:
```
git pull --rebase origin main
git push -u origin main
```

**"Authentication failed"** — you used your account password instead of a Personal Access Token, or the token lacked the `repo` scope. Redo step 4.

**"src refspec main does not match any"** — nothing has been committed yet. Run `git add -A` then `git commit -m "Initial commit"` first.
