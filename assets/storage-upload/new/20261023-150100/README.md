# Common medium fish

Four new common fish share all regions; existing mullet and rare sea bass IDs remain intact. Catalog is the source of prices and movement settings. These fish use medium-sized midwater swimming, right-facing source art, automatic travel-direction flipping, and four distinct tail/dorsal-fin phases.

Built-in Imagegen produced thumbnails from the common/rare style reference and sprite sheets from each approved thumbnail. Exact prompts and paths are recorded in manifest.json. The first sea-bass sheet failed the original cell-edge check and was replaced; sources/current-seabass-sprite.source contains the accepted source. The sprites were exported using one common scale per sheet. No per-frame resizing was used.

Reproduce safety checks with scripts/inspect-nyamnyam-art.ps1 -Root this-folder -RequireComplete. Eye-region patches in anchors-four.json were inspected against the actual artwork; register-sprite-anchors.ps1 uses SearchRange 160 and records finite low-error translations in anchor-results-four.json. The default generic patch was rejected instead of recording a false zero correction. Row transitions and loop boundaries are exercised in review.html using the real codex preview and aquarium renderer; .cache/verify-medium-fish.mjs captures three animation loops and mobile output.

Upload only fish/normal PNGs to collectibles preserving relative paths. SHA-256 asset hashes in manifest.json are verified against public remote URLs after upload. Deployment uses the CLI-generated four_common_medium_fish catalog migration; frontend frame registration and release metadata require the normal app deployment.
