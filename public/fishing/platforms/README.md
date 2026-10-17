# Regional fishing platforms

Generated with built-in image_gen. Final prompts, source paths and asset references are recorded in manifest.json. Transparent PNG terrain is served directly from public/fishing/platforms/. No Storage upload or SQL migration is needed.

| Region | Material |
| --- | --- |
| pongdang | warm worn timber, rope and seashell |
| whitenight | snow-dusted ice, cyan thickness and fine cracks |
| primal | sandstone, roots, moss, fern and fossil |
| coral | cream limestone, blush coral and shells |
| mistmoon | damp dark slate, silver moon reflection |
| starruins | ancient stone slabs, worn gold star carving |
| dreamabyss | dark basalt, restrained cyan fissures |
| bluegrove | rounded riverstone, pale sand and reeds |
| cloudferry | ivory cloud stone, small brass mooring ring |
| scrapisle | salvaged green steel plates and rusty rivets |

The platform stays at the existing y and platformHeight coordinates. Water and foreground remain independent. Center space is reserved for the rod and controls; decoration stays at the sides. Fallback terrain uses matching colors and material lines if an image fails. Primal reuses the existing clear-water texture until a dedicated water painting is added. No fishing physics, gauge, payout or timing rules are changed.
