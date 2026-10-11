export function Frame() {
  return (
    <>
      <div className="band t" />
      <div className="band b" />
      <div className="band l" />
      <div className="band r" />
      <div className="toran" />
      <div className="frame" />
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <symbol id="cn" viewBox="0 0 54 54">
          <path d="M3 51V3h48" fill="none" stroke="#F2B544" strokeWidth="3" />
          <path d="M12 42V12h30" fill="none" stroke="#B04050" strokeWidth="2" />
          <path d="M16 16c10 2 16 8 14 16-3-4-8-4-10 0-1-6-3-10-4-16z" fill="#F2B544" />
          <circle cx="12" cy="12" r="5" fill="#6B7236" stroke="#F2B544" strokeWidth="2" />
        </symbol>
      </svg>
      {["tl", "tr", "bl", "br"].map((c) => (
        <svg key={c} className={`corner ${c}`} aria-hidden="true">
          <use href="#cn" />
        </svg>
      ))}
    </>
  );
}

export function Rangoli() {
  return (
    <svg className="rang" viewBox="0 0 220 28" aria-hidden="true">
      <path d="M14 14h72M134 14h72" stroke="#6B7236" strokeWidth="1.6" />
      <g fill="#F2B544" stroke="#6B7236" strokeWidth="1">
        <path d="M14 9l5 5-5 5-5-5zM40 10l4 4-4 4-4-4zM66 10l4 4-4 4-4-4zM206 9l5 5-5 5-5-5zM180 10l4 4-4 4-4-4zM154 10l4 4-4 4-4-4z" />
      </g>
      <g transform="translate(110 14)">
        <g fill="#B8344A" stroke="#8E2A3F" strokeWidth=".8">
          <ellipse rx="3.4" ry="12" />
          <ellipse rx="3.4" ry="12" transform="rotate(90)" />
        </g>
        <g fill="#F2B544" stroke="#6B7236" strokeWidth=".8">
          <ellipse rx="3" ry="10" transform="rotate(45)" />
          <ellipse rx="3" ry="10" transform="rotate(135)" />
        </g>
        <circle r="3.6" fill="#5F7A3A" stroke="#F2B544" strokeWidth="1.4" />
      </g>
    </svg>
  );
}

function Diya() {
  return (
    <svg viewBox="0 0 40 34" aria-hidden="true">
      <path className="flame" d="M20 1c7 7 8 13 0 18-8-5-7-11 0-18z" fill="#F59A23" />
      <path className="flame" d="M20 8c3 3 3 6 0 9-3-3-3-6 0-9z" fill="#C8102E" />
      <path d="M3 18h34c0 10-8 15-17 15S3 28 3 18z" fill="#B8552B" />
      <path d="M3 18h34" stroke="#F2B544" strokeWidth="3" />
      <path d="M11 26q9 4 18 0" stroke="#F2B544" fill="none" strokeWidth="1.4" />
    </svg>
  );
}

export function Diyas() {
  return (
    <div className="diyas">
      <Diya />
      <Diya />
      <Diya />
    </div>
  );
}
