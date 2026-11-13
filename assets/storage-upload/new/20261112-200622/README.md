# Seven overhead tower families

These native SVG originals extend the user's round, mouthless overhead sketch to seven distinct tower silhouettes. The shape module and generator preserve editable originals, lossless four-frame PNG exports and hashes. Every tower rests on frame zero; recoil, emitter light or petals change only during an attack. World pivots match the body centre so aiming does not move the body around its tile.

Combat definitions live in the shared tower configuration. Single shots use stable target IDs and account for lethal projectiles already in flight. Explosions, cones, beams and radial pulses select a bounded number of targets through shared spatial buckets and reusable scratch storage. Beam aiming examines at most eight candidate directions, then locks during charging. Flame damage is fixed-step, stops outside the cone and creates no per-target physics or particle objects. Charge state is cancelled at wave boundaries.

The build drawer keeps the bottom toolbar compact. Preserve the drag source in the DOM while hiding the drawer during dragging: unmounting a captured touch target can cancel the gesture. Disable native image dragging. Selecting a tower or completing a placement closes the drawer; outside drops and Escape cancel without spending coins.

Validate every exported frame against light/dark backgrounds and at display scale. Exercise attack caps, geometry, cadence, upgrades, affordable full-wave strategies and both mouse/touch placement. The browser fixture renders all seven families together with pooled enemies and reduced motion. Keep the single-texture GL batching workaround for rotated sprites. Local/headless timing does not establish physical-phone FPS; this practice has no DB changes or account rewards.
