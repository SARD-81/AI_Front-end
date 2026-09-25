/** A decorative open folio and connected ideas; it does not depict a campus building. */
export function AuthKnowledgeArt() {
  return (
    <svg
      viewBox="0 0 760 450"
      fill="none"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="soha-page-right" x1="381" y1="205" x2="655" y2="370" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D1F4ED" stopOpacity=".72" />
          <stop offset="1" stopColor="#42B8C1" stopOpacity=".17" />
        </linearGradient>
        <linearGradient id="soha-page-left" x1="106" y1="219" x2="381" y2="366" gradientUnits="userSpaceOnUse">
          <stop stopColor="#42B8C1" stopOpacity=".16" />
          <stop offset="1" stopColor="#C4EEE9" stopOpacity=".62" />
        </linearGradient>
        <radialGradient id="soha-idea-glow" cx="0" cy="0" r="1" gradientTransform="translate(380 270) rotate(90) scale(215 290)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#48D0C8" stopOpacity=".2" />
          <stop offset="1" stopColor="#48D0C8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="380" cy="267" rx="300" ry="198" fill="url(#soha-idea-glow)" />
      <g stroke="#96D3D4" strokeOpacity=".27" strokeWidth="1.2">
        <path d="M72 145 172 92l95 47 113-90 108 76 100-61 97 88" />
        <path d="M172 92 169 197m98-58 21 89m92-179v171m108-95-17 92m117-153-9 118" />
        <path d="M44 381h130m412 0h130" strokeOpacity=".5" />
      </g>
      <g fill="#C0EEE9">
        <circle cx="72" cy="145" r="2.4" fillOpacity=".45" />
        <circle cx="172" cy="92" r="3" fillOpacity=".65" />
        <circle cx="267" cy="139" r="2.6" fillOpacity=".55" />
        <circle cx="380" cy="49" r="4" fillOpacity=".87" />
        <circle cx="488" cy="125" r="2.7" fillOpacity=".58" />
        <circle cx="588" cy="64" r="3" fillOpacity=".72" />
        <circle cx="685" cy="152" r="2.4" fillOpacity=".45" />
      </g>
      <path d="m380 67 4.3 11.7L396 83l-11.7 4.3L380 99l-4.3-11.7L364 83l11.7-4.3L380 67Z" fill="#EDC789" fillOpacity=".9" />

      {/* The open pages have a shared spine, not a building silhouette. */}
      <path d="M67 333c117-55 214-60 313 5 99-65 196-60 313-5l-19 39c-113-40-208-37-294 20-86-57-181-60-294-20l-19-39Z" fill="#051F2A" stroke="#70B7BC" strokeOpacity=".7" strokeWidth="2" />
      <path d="M84 248c108-46 208-47 296 18v119c-87-56-178-58-296-14V248Z" fill="url(#soha-page-left)" stroke="#B6E9E4" strokeOpacity=".8" strokeWidth="2" />
      <path d="M676 248c-108-46-208-47-296 18v119c87-56 178-58 296-14V248Z" fill="url(#soha-page-right)" stroke="#B6E9E4" strokeOpacity=".8" strokeWidth="2" />
      <path d="M99 231c111-34 196-27 281 35 85-62 170-69 281-35" stroke="#E9C58D" strokeOpacity=".84" strokeWidth="2" />
      <path d="M99 256c109-40 191-27 281 32 90-59 172-72 281-32M100 277c104-33 188-24 280 33 92-57 176-66 280-33M100 299c104-31 189-19 280 36 91-55 176-67 280-36M100 322c106-29 192-13 280 39 88-52 174-68 280-39" stroke="#D3F1ED" strokeOpacity=".37" strokeWidth="1.5" />
      <path d="M380 266v119" stroke="#F5D6A2" strokeOpacity=".9" strokeWidth="2.5" />
      <path d="M153 362c89-13 159 2 227 40 68-38 138-53 227-40" stroke="#E8C58E" strokeOpacity=".72" strokeWidth="2" strokeLinecap="round" />
      <circle cx="380" cy="192" r="5.5" fill="#E6BD7C" />
      <circle cx="380" cy="192" r="15" stroke="#E6BD7C" strokeOpacity=".45" />
      <path d="M380 207v39" stroke="#E6BD7C" strokeOpacity=".7" strokeWidth="1.5" strokeDasharray="2 7" />
    </svg>
  );
}
