export function IslandLoading() {
  return <div role="status" aria-label="퐁당섬 준비 중" className="island-startup flex-1">
    <div className="island-startup-art" aria-hidden="true"><img src="/branding/pongi-startup.png" alt="" width="512" height="512" /></div>
    <p className="island-startup-brand" aria-hidden="true">퐁당섬</p>
    <p className="island-startup-tagline">손끝에서 시작하는 작은 바다</p>
    <p className="island-startup-title">섬으로 가는 중…</p>
    <div className="island-startup-progress" aria-hidden="true"><span /></div>
  </div>
}
