# Halloween mythic refinement

Four existing mythic identities retain their prices, habitat links, movement settings and original release time. Versioned v2 thumbnails and eight-frame sheets replace v1 artwork without overwriting immutable Storage objects. The catalog uses the derived 2×2 compatibility sheets; the app resolves both v1/v2 aliases to the reviewed 4×2 sheets.

Small ghosts use a separate generated bitmap and continuous local orbit so they do not jump when a fish changes its animation frame. The aquarium and collection preview share orbit geometry; reduced motion freezes companions and the creature pose. The final ghost texture lives in `public/aquarium/effects/`; its original is preserved under `sources/`.

`manifest.json` contains prompts and input roles. Source margins are measured before export, with one scale per sheet and opaque rigid body/eye patches for translation registration. Rejected first sprite attempts remain in `.source.previous`. Review uses the actual aquarium renderer and collection preview through `review.html`; verification evidence is in the audit, registration, preview and upload JSON files.

For a further revision, create a new timestamp batch and new immutable asset version. Run source inspection and registration before catalog generation, then follow `docs/systems/database-management.md`. Upload verification and DB application do not deploy frontend effects or public assets.
