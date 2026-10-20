export function IslandLoading() {
  return <div role="status" aria-label="퐁당섬 준비 중" className="island-startup flex-1">
    <div className="island-startup-art" aria-hidden="true"><img src="/branding/pongi-welcome.png" alt="" width="180" height="172" /></div>
    <p className="island-startup-brand" aria-hidden="true">퐁당섬</p>
    <p className="island-startup-title">섬으로 가는 중…</p>
    <p className="island-startup-detail">퐁이가 작은 여행을 준비하고 있어요.</p>
    <div className="island-startup-progress" aria-hidden="true"><span /></div>
  </div>
}
