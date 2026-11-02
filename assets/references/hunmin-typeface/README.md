# 훈민성령 글자 효과

옛한글과 가나다는 Noto Serif KR SemiBold의 실제 윤곽을 사용한다. source.json의 공식 Google Fonts 부분 글꼴과 SHA-256, OFL.txt를 함께 보존한다. 글꼴 전체나 파서를 앱에 넣지 않고, 생성된 삼각형 메시로 어항과 도감에서 같은 모양을 그린다. 외곽선의 빈 공간도 유지하며 이동 방향이 바뀌어도 글자는 반전하지 않는다.

윤곽 재생성에는 임시 도구만 설치한다.

```powershell
npm.cmd install --prefix tmp/hunmin-font-tools --no-package-lock --no-save fontkit@2.0.4
node scripts/build-hunmin-glyphs.mjs
```

원본 갱신은 scripts/prepare-hunmin-typeface.mjs를 사용한다. 현재 글꼴과 라이선스를 다시 검토한 뒤 메시를 재생성한다. 글자 등장·머무름·휴식은 글자 효과 코드에서 관리하고 유영 프레임 주기와 분리한다. scripts/preview-hangang-assets.mjs --refinement --effects와 scripts/check-hangang-preview.mjs --refinement --effects로 밝고 어두운 배경을 확인한다. 검수 출력은 artifacts에 두어 과거 이미지 배치 기록을 덮어쓰지 않는다.
