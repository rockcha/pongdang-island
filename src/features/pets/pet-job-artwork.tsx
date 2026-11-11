import { useId } from 'react'
import type { PetJobId } from './pet-catalog'

export function PetJobArtwork({ jobId }: { jobId: PetJobId }) {
  const id = `pet-job-${useId().replaceAll(':', '')}`
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fffaf0" />
          <stop offset="1" stopColor="#e9d3b0" />
        </linearGradient>
      </defs>
      {jobId === 'inn' && <>
        <rect x="13" y="9" width="38" height="39" rx="8" fill="#e5eadf" stroke="#b7c1ab"/>
        <path d="M32 10v36M14 28h36" stroke="#bac4b0"/>
        <path d="M23 39h18l-3 16H26Z" fill="#dbbba0" stroke="#b6977c"/>
        <path d="M32 39V23" stroke="#8f9f7e" strokeWidth="2"/>
        <path d="M32 32c-13 0-15-10-8-12 6-1 8 7 8 12Zm0-5c12 0 14-11 7-12-6 0-7 7-7 12Z" fill="#a8ba95" stroke="#8f9f7e"/>
      </>}
      {jobId === 'market' && <>
        <path d="M13 28h38v25H13Z" fill="#e6d3b8" stroke="#bfa98b"/>
        <path d="M8 29 17 12h30l9 17Z" fill="#c3d1c2" stroke="#9daf9c"/>
        <path d="m25 12-3 17m17-17 3 17" stroke="#f7f5e7" strokeWidth="5"/>
        <rect x="20" y="36" width="24" height="12" rx="2" fill="#c7ac85"/>
        <path d="M28 39h8m-8 5h8" stroke="#f8edda" strokeWidth="1.4"/>
        <path d="M45 7c-3 1-3 5 1 6-6 4-11-3-5-7" fill="#e4c98e"/>
      </>}
      {jobId === 'teahouse' && <>
        <ellipse cx="29" cy="50" rx="22" ry="4" fill="#ddd1b9"/>
        <path d="M15 27h29v12c0 13-29 13-29 0Z" fill="#f2e0dc" stroke="#c8a5a4" strokeWidth="1.3"/>
        <path d="M44 30h4c12 0 10 14-4 13" stroke="#c8a5a4" strokeWidth="3"/>
        <ellipse cx="29" cy="27" rx="14.5" ry="4" fill="#e4d2b0" stroke="#c8a5a4"/>
        <path d="M24 20c-5-5 4-5 0-11m10 11c-5-5 4-5 0-11" stroke="#b7c4b1" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="m29 33 1.5 3 3 .5-2.2 2.3.5 3.2-2.8-1.5-2.8 1.5.5-3.2-2.2-2.3 3-.5Z" fill="#c99e9b"/>
      </>}
      {jobId === 'observatory' && <>
        <path d="m30 33-9 22m9-22 13 22m-13-22v22" stroke="#aa987e" strokeWidth="2.3" strokeLinecap="round"/>
        <path d="m16 29 28-16 7 12-28 16Z" fill="#a9bbbf" stroke="#8c9fa5" strokeWidth="1.3"/>
        <path d="m42 13 4-3 9 15-5 3Z" fill="#e0c79e" stroke="#bda783"/>
        <path d="m17 30-4 2 5 9 5-2" fill="#c6ad89" stroke="#aa9474"/>
        <path d="m18 9 1.5 4.5L24 15l-4.5 1.5L18 21l-1.5-4.5L12 15l4.5-1.5Z" fill="#d6be84"/>
        <circle cx="32" cy="8" r="1.5" fill="#b9b8ad"/>
      </>}
      {jobId === 'bakery' && (
        <>
          <ellipse cx="32" cy="49" rx="23" ry="4" fill="#c9b38e" opacity=".15" />
          <path
            d="M13 31h38l-5 16c-1 4-27 4-28 0Z"
            fill="#bed0ca"
            stroke="#8fa9a1"
            strokeWidth="1.3"
          />
          <ellipse
            cx="32"
            cy="31"
            rx="19"
            ry="6"
            fill="#dce6d9"
            stroke="#9bb5aa"
            strokeWidth="1.3"
          />
          <path
            d="M17 29c-2-8 4-15 11-13 3-8 15-5 16 2 7 1 8 9 4 13-6 4-24 4-31-2Z"
            fill={`url(#${id})`}
            stroke="#c3a782"
            strokeWidth="1.2"
          />
          <path d="m28 20-2 6m10-8-2 7" stroke="#d2b58d" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M23 39c4 3 14 4 18 0" stroke="#edf3e6" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
      {jobId === 'florist' && (
        <>
          <path d="m19 29 13 25 14-25" fill={`url(#${id})`} stroke="#c3ad91" strokeWidth="1.2" />
          <path
            d="m26 23 8 23m6-23-6 22m-2-27 2 28"
            stroke="#91ad91"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M27 34c-10 1-13-5-12-8 7-2 13 1 12 8Zm12-1c10 0 12-7 10-9-7 0-12 3-10 9Z"
            fill="#adc5a4"
          />
          {[
            [22, 23, '#deb0a4'],
            [33, 17, '#e8ce91'],
            [43, 24, '#bcb5d1'],
          ].map(([x, y, c], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path
                d="M0-7c5-3 8 1 6 5 6 0 7 5 2 7-1 6-6 7-8 2-4 4-9 0-6-4-5-2-3-8 1-7-2-3 1-5 5-3Z"
                fill={String(c)}
                stroke="#fff8ec"
                strokeWidth=".8"
              />
              <circle r="2.5" fill="#fff0be" />
            </g>
          ))}
          <path d="m28 43 11-1-5 5-6-4Z" fill="#ce9c9e" />
        </>
      )}
      {jobId === 'dock' && (
        <>
          <path
            d="M12 19h40v8a5 5 0 0 0 0 10v8H12v-8a5 5 0 0 0 0-10Z"
            fill="#e2ece4"
            stroke="#a2b8ae"
            strokeWidth="1.3"
          />
          <path d="M24 20v24" stroke="#acbfb3" strokeWidth="1.1" strokeDasharray="2 3" />
          <path
            d="m37 24 2.2 4.7 5.2.7-3.8 3.7.9 5.2-4.5-2.4-4.6 2.4.9-5.2-3.7-3.7 5.1-.7Z"
            fill="#d8bd85"
            stroke="#bba06c"
            strokeWidth="1"
          />
          <path d="M16 23h3m-3 18h3" stroke="#b2c5b8" strokeWidth="1.3" strokeLinecap="round" />
        </>
      )}
      {jobId === 'post' && (
        <>
          <g transform="rotate(-12 31 30)">
            <rect
              x="12"
              y="17"
              width="37"
              height="27"
              rx="3"
              fill="#e8d9cc"
              stroke="#c5af9b"
              strokeWidth="1.2"
            />
          </g>
          <rect
            x="15"
            y="23"
            width="38"
            height="28"
            rx="3"
            fill={`url(#${id})`}
            stroke="#c8b49a"
            strokeWidth="1.3"
          />
          <path
            d="m16 24 16 14a3 3 0 0 0 4 0l16-14M16 49l12-11m24 11L40 38"
            stroke="#cbb99e"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M34 44s-5-2.9-5-6a2.8 2.8 0 0 1 5-1.3 2.8 2.8 0 0 1 5 1.3c0 3.1-5 6-5 6Z"
            fill="#d5a3a4"
          />
        </>
      )}
      {jobId === 'lighthouse' && (
        <>
          <path d="m22 48 4-23h12l5 23" fill={`url(#${id})`} stroke="#b7a38b" strokeWidth="1.3" />
          <path d="m24.6 33 15 3 1 7-17-3" fill="#ba9e99" />
          <rect
            x="25"
            y="17"
            width="14"
            height="9"
            rx="1.5"
            fill="#f1d28b"
            stroke="#b9a375"
            strokeWidth="1.2"
          />
          <path d="m22 17 10-7 10 7H22Z" fill="#a7bdb6" stroke="#8ca69e" strokeWidth="1.2" />
          <path
            d="M32 19v5m-13-4-7-2m33 2 7-2M16 50h34"
            stroke="#c2ac82"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M12 53c5 3 8-3 13 0s8-3 13 0 8-3 13 0"
            stroke="#b3cbd0"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}
