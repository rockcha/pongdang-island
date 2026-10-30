# Farm building alignment artwork

Generated with the built-in imagegen tool. The untouched transparent atlases and final prompts are retained here. Runtime sprites use individual building bounds, rather than equal atlas cells, so adjacent-row fragments cannot become part of a building. The manifest records every source crop and packed frame. The separate barn atlas supplies the rectangular building's four directions.

Ground contacts are registered against each stone foundation in `src/features/farm/sprite-registration.ts`. Keep those points and the sprite frames in sync. Logical placement and picking share the projection in `src/features/farm/isometric.ts`; image alpha bounds and incidental props are not placement anchors.
