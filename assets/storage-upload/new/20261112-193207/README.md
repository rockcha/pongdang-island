# Mouthless overhead actors

The user's second pink sketch replaces the rectangular-mounted octopus: one round body, two dot eyes and one funnel. Turrets and all five monster families use overhead silhouettes without mouths, upright faces, perspective shading or chest ornaments. SVG originals are the editable source; PNG sprite atlases are lossless exports. `scripts/tower-defense-shapes.mjs` owns the actor geometry and `scripts/build-tower-defense-art.mjs` packages the originals, atlases and hashes.

Resting turrets hold frame zero. Only the nozzle recoils during firing; body pivots stay fixed in the same world position. Monster appendages move around stationary shells. Inspect every frame and actual display sizes against light, dark and field backgrounds. Keep transparent margins and match the toolbar art to the game sprite.

Placement and inspection are separate. Tap a tool then the map, or drag the toolbar item onto the map. Commit once on release, exit placement after success, and leave neutral map taps free of purchases. Outside drops, Escape, right-click and the visible cancel button cancel placement. The inspector reserves a fixed height so selection does not resize the battlefield. Preserve single-texture GL batches: rotated sprites corrupted on the tested backend when multiple source textures shared a batch; monsters continue sharing a single atlas.

Validate art hashes/margins, placement state transitions, drag cancellation and actual browser interaction at portrait sizes. Local browser measurements do not establish physical-phone frame rates. This practice has no account rewards or DB changes.
