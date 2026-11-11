# Needs eye blinks

Companion alpha sheets for operator preview. Each row reuses its emotional resting pose and changes only eyelids, open/half/closed/half. Generated source, prompts, integer registration and light/dark review are preserved here. No server changes or remote upload.

Motion transitions use idle as the shared face-size reference. Reviewed eye centers live in `motion-landmarks.json`; `scripts/build-pet-motion-registration.mjs` measures the source floor and generates one rigid transform per sheet, splitting small anatomical differences between face height and foot height. `scripts/build-pet-render-layouts.mjs` then fits the shared envelope. No per-frame recentering, scale changes or image crossfade is used. Blink patches inherit the exact needs transform. After replacing art, remeasure the landmarks with `scripts/review-pet-motion-registration.mjs` and check care/feed transitions as well as eye-only blinks.
