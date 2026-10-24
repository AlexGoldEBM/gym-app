# Ship
Stage all changes, write a conventional commit message based on the diff, commit, and push to the current branch's remote. Never stop after commit — always push.

Before staging: `inbox/` must hold nothing besides `README.md` — any file type, not just `.png`. Delete the contents (`find inbox -mindepth 1 ! -name README.md -delete`) or pause and ask the user. Never push while anything else is in there. Keep the folder and its `README.md`.
