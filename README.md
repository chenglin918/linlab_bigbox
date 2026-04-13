# Big Box Project Site

This folder contains a static project website for the Large-Scale Freeze-Thaw Plate Loading Tests work.

## Local preview

Use a local web server so `fetch('data.json')` and the `.glb` model assets load correctly.

### Windows PowerShell

```powershell
cd "C:\Users\chenglin918\OneDrive - University of Victoria\Python\Notes\vibe_coding\yongxuan_bigbox"
py -m http.server 8000
```

Open:

```text
http://localhost:8000/
```

Stop the server with `Ctrl+C`.

## GitHub Pages deployment

This folder currently lives inside a larger git repository at [Notes/vibe_coding](../). To avoid creating a nested git repository, publish this folder to GitHub as its own repository using `git subtree split` from the parent repo.

### 1. Create an empty GitHub repository

Create a new repository on GitHub, for example `yongxuan_bigbox`.

### 2. From the parent repository root, split this folder into its own branch

```powershell
cd "C:\Users\chenglin918\OneDrive - University of Victoria\Python\Notes\vibe_coding"
git subtree split --prefix=yongxuan_bigbox -b yongxuan-bigbox-pages
```

### 3. Add the GitHub remote

```powershell
git remote add github-bigbox https://github.com/<your-user-or-org>/yongxuan_bigbox.git
```

If the remote already exists, update it instead:

```powershell
git remote set-url github-bigbox https://github.com/<your-user-or-org>/yongxuan_bigbox.git
```

### 4. Push the split branch to GitHub

```powershell
git push -u github-bigbox yongxuan-bigbox-pages:main --force
```

### 5. Let GitHub Pages deploy

This folder includes a GitHub Actions workflow in `.github/workflows/deploy-pages.yml`. After the push:

1. Open the GitHub repository.
2. Go to `Settings > Pages`.
3. Confirm the source is `GitHub Actions`.
4. Wait for the `Deploy static content to Pages` workflow to finish.

Your site will then be available at:

```text
https://<your-user-or-org>.github.io/yongxuan_bigbox/
```

## Updating the published site later

After you change files in `yongxuan_bigbox`, run the split and push steps again:

```powershell
cd "C:\Users\chenglin918\OneDrive - University of Victoria\Python\Notes\vibe_coding"
git subtree split --prefix=yongxuan_bigbox -b yongxuan-bigbox-pages
git push github-bigbox yongxuan-bigbox-pages:main --force
```
