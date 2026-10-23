# Halloween fish expansion and price buff

Ten new event fish join the existing Halloween event. Patchwork shark retains its ID but receives a living shark silhouette and skin rather than plush stuffing or button joints. New common creatures use the saved cartoon reference; epic/mythic creatures use the saved fantasy illustration reference. Prompt and source roles are recorded in `manifest.json` and generated originals are preserved in `sources/`.

Price increases apply only to previously existing Halloween fish: common +10, epic +100, mythic +500; rare fish, trash, decorations and other events are excluded. `price-changes.json` records the verified starting prices and fixed resulting values so repeated application cannot add the buff twice. New species are priced directly in the resulting ranges.

Jellyfish use pulse movement, chocolate starfish crawls near the bottom, and the remaining fish swim. Every creature declares its movement range and right-facing source orientation. Crimson has an eight-pose sheet with propulsion followed by an anatomically hinged jaw action; compatibility export preserves the first four poses for earlier clients. Registration uses opaque rigid face patches, one uniform sheet scale and measured translations.

New species keep the existing `halloween-` prefix so the server's event gate applies automatically, including direct fishing, traps and boats. New release records use the event opening time. Existing release timestamps are preserved. For future edits, use a new immutable asset version and follow `docs/systems/database-management.md`.

Review uses real aquarium and collection renderers. Audit, registration, preview and upload JSON files hold reproducible evidence. Storage/DB application and frontend deployment are separate; this batch does not assert complete remote schema equivalence.
