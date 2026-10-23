# Halloween costumes and underwater ornaments

Revises six existing collectibles. The guppy and puffer wear ghost disguises, the goldfish cradles a little ghost, the gravestone and bed use submerged materials and marine growth, and the pumpkin locomotive has a mechanical front without eyes or a mouth. Existing IDs, prices, movement settings, habitats and event release times are preserved.

Versioned v2 paths retain the previous immutable artwork. `manifest.json` records built-in image_gen prompts, inputs and reference roles; original generated images are preserved under `sources/`. Common/rare assets use the saved cartoon reference; the epic train retains the saved soft fantasy style.

Four moving subjects use 2×2 sheets with one uniform export scale and measured opaque rigid eye/boiler anchors. Manual anchor overrides avoid the guppy's costume stitching and the train's smoke. Registration and alpha bounds are checked before catalog registration; actual tank and collection previews are reviewed through `review.html` on desktop/mobile and with reduced motion.

Further changes need a new immutable version and the catalog/migration workflow in `docs/systems/database-management.md`. Storage and DB changes do not deploy frontend layout corrections. Verification JSON files distinguish local artwork checks, public Storage bytes and scoped remote DB checks.
