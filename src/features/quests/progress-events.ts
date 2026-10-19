// Refresh only after an authoritative activity response; practice never emits this.
export function questProgressChanged(){if(typeof window!=='undefined')window.dispatchEvent(new Event('quest-progress-changed'))}
