# 메갈로돈 8프레임 재제작

built-in `image_gen`으로 생성했습니다. 기존 메갈로돈의 청회색 몸·밝은 배·흉터를 유지하되 턱을 해부 구조에 맞게 다시 구성했습니다. 앞 네 장은 꼬리 추진 유영, 뒤 네 장은 입 열기·위협·닫기·회복입니다. 전 프레임 오른쪽 원본이며 동일한 배율을 사용합니다.

등급별 스타일 참고는 채색·재질에만 사용했습니다. 최종 프롬프트와 참고·원본 경로는 `manifest.json`에 있습니다. 최종 시트는 `public/aquarium/swim/extinction-defying-megalodon_swim8_v2_sprite.png`를 통해 어항과 도감에 공통 연결합니다. 이 공개 앱 에셋은 프런트 배포로 반영하며 DB 경로는 변경하지 않습니다.

`sprite-audit.json`은 로컬 알파 32 기준 프레임 경계 검사이며, `registration.json`은 몸통 패치 이동 측정입니다. 이 측정값으로 `mythic-action-layouts.json`의 원점을 보정합니다. 자동 확대·축소나 전체 불투명도 변화로 움직임을 대신하지 않습니다. 모션 감소 시 0프레임입니다.

검증: `npm.cmd test -- tests/mythic-swim.test.ts tests/inhabitant-motion.test.ts` 및 `npx.cmd tsc -b`. 로컬 측정은 운영 배포·모든 기기의 시각 검증을 의미하지 않습니다.
