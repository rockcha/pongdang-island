# Simplified overhead tower-defense art

Native SVG originals follow the user's round octopus and simple mounting-plate sketch. Flat fills and clear outlines replace the detailed raster artwork. The generator is `scripts/build-tower-defense-art.mjs`; sprite PNGs are lossless exports with uniform 256-pixel cells. Original SVGs, exports and their hashes are retained together in the manifest.

Towers keep rest frame 0 without idle animation. A shot plays three short nozzle poses, then returns to frame 0. Monsters use four overhead locomotion poses per species. The wall and castle remain native SVG assets. The field has three entry markers and no route artwork; navigation and complete-block validation remain in the simulation.

Verify frame margins and hashes with the art test, then exercise actual placement, firing, upgrades, high-density rendering and reduced motion in the local browser fixture. Browser screenshots and the six-seed simulation record belong in `review/`. Headless software-GPU timings do not establish physical-phone FPS. This local practice does not change account data or require DB changes.

The tested GL backend corrupts rotated turret sprites when multiple source textures share a batch. Keep one source texture per batch; the shared enemy atlas retains enemy batching. Browser QA samples the opaque centre of a rotated seahorse after a natural wave to catch this regression.
