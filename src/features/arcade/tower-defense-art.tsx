import type { BuildKind } from './tower-defense-engine'

/** Small vector illustrations matching the pieces on the board. */
export function TowerArt({ kind, className = '' }: { kind: BuildKind; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <ellipse cx="32" cy="54" rx="25" ry="6" fill="#577c6e" opacity=".16" />
      {kind === 'wall' ? (
        <>
          <rect x="8" y="19" width="48" height="33" rx="8" fill="#b98171" />
          <rect
            x="8"
            y="13"
            width="48"
            height="33"
            rx="8"
            fill="#e7b59f"
            stroke="#c9937f"
            strokeWidth="2"
          />
          <path
            d="M14 28h36M30 16v12m-8 0v14m18-14v14"
            stroke="#f9dac5"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M13 18h13" stroke="#fff2df" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse
            cx="32"
            cy="46"
            rx="23"
            ry="11"
            fill="#9eb8a5"
            stroke="#688f80"
            strokeWidth="2"
          />
          <ellipse
            cx="32"
            cy="41"
            rx="23"
            ry="11"
            fill="#e3e3c5"
            stroke="#b1bea0"
            strokeWidth="2"
          />
          {kind === 'shell' ? (
            <>
              <path
                d="M32 44C6 39 4 17 17 18c0-12 15-14 15-7 5-8 18-3 17 6 15 2 8 24-17 27Z"
                fill="#f3d1aa"
                stroke="#ba9676"
                strokeWidth="2"
              />
              <path d="m17 21 15 21m-1-27 1 27m15-20L32 42" stroke="#d3ab84" strokeWidth="2" />
              <rect
                x="26"
                y="7"
                width="12"
                height="32"
                rx="5"
                fill="#7fb3a6"
                stroke="#527f77"
                strokeWidth="2"
              />
              <ellipse cx="32" cy="9" rx="4" ry="2" fill="#d1efe3" />
              <circle cx="32" cy="36" r="8" fill="#e9c580" stroke="#b99b61" strokeWidth="2" />
            </>
          ) : kind === 'jelly' ? (
            <>
              <path
                d="M20 29v12m8-10v14m8-14v14m8-16v12"
                stroke="#a7a0ca"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M10 29C10 3 54 3 54 29c-9 7-35 7-44 0Z"
                fill="#cbc3ed"
                stroke="#9a91ba"
                strokeWidth="2"
              />
              <ellipse cx="25" cy="17" rx="9" ry="5" fill="#ece7fc" />
              <circle cx="32" cy="29" r="8" fill="#d7edf0" stroke="#93b9c3" strokeWidth="2" />
              <circle cx="30" cy="26" r="3" fill="#fff" opacity=".8" />
            </>
          ) : (
            <>
              <path
                d="m32 5 3 10m18 0-9 6m14 15-11-1m-3 17-5-9M20 52l5-9M7 36l10-1M11 15l9 7"
                stroke="#bba067"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="32" cy="31" r="20" fill="#f1d48c" stroke="#c2a15e" strokeWidth="2" />
              <rect
                x="21"
                y="10"
                width="9"
                height="24"
                rx="4"
                fill="#90b7a8"
                stroke="#668c7c"
                strokeWidth="2"
              />
              <rect
                x="34"
                y="10"
                width="9"
                height="24"
                rx="4"
                fill="#90b7a8"
                stroke="#668c7c"
                strokeWidth="2"
              />
              <ellipse cx="32" cy="38" rx="10" ry="7" fill="#f6e6b8" />
              <circle cx="28" cy="37" r="2" fill="#877c57" />
              <circle cx="37" cy="37" r="2" fill="#877c57" />
            </>
          )}
          <circle cx="14" cy="43" r="2" fill="#fff8dd" />
          <circle cx="50" cy="43" r="2" fill="#fff8dd" />
        </>
      )}
    </svg>
  )
}
