# Running the Big Box Site

Use a local server so the 3D `.glb` files and `data.json` load correctly.

## Windows PowerShell

1. Open a terminal in VS Code.
2. Run:

    ```powershell
    cd "C:\Users\chenglin918\OneDrive - University of Victoria\Python\Notes\vibe_coding\yongxuan_bigbox"
    py -m http.server 8000
    ```

3. Open in the browser:

    ```text
    http://localhost:8000/
    ```

4. Stop the server with `Ctrl+C`.

## macOS

1. Open a terminal in VS Code.
2. Run:

    ```bash
    cd "/Users/chenglinmacbook/Library/CloudStorage/OneDrive-UniversityofVictoria/Python/Notes/vibe_coding/yongxuan_bigbox"
    python3 -m http.server 8000
    ```

3. Open in the browser:

    ```text
    http://localhost:8000/
    ```

4. Stop the server with `Ctrl+C`.

## GitHub Pages

Deployment notes are in `README.md`.
