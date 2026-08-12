import "./flair.css";

/**
 * CSS-3D parcel box, adapted from the retro-product "package has arrived"
 * design and relabeled. Pure DOM — cheap; float animation is motion-safe only.
 */
export function ParcelBox() {
  return (
    <div className="pb-wrap" aria-hidden="true">
      <div className="pb-scene">
        <div className="pb-box">
          <div className="pb-face pb-top" />
          <div className="pb-face pb-front">
            <div className="pb-stamp">priority</div>
            <div className="pb-brand">
              <div className="pb-brand-name">N.&nbsp;W.&nbsp;Fraser</div>
              <div className="pb-brand-sub">full-stack delivery</div>
            </div>
            <div className="pb-specs mono">
              <div className="pb-specs-row">
                <span>model: NWF-2027</span>
              </div>
              <div className="pb-specs-row">
                <span>origin: BNE</span>
                <span>qty: 1</span>
              </div>
            </div>
          </div>
          <div className="pb-face pb-right">
            <div className="pb-label">
              <div className="pb-label-head">express</div>
              <div className="pb-label-line" />
              <div className="pb-label-line" style={{ width: "60%" }} />
              <div className="pb-label-line" style={{ width: "85%" }} />
              <div className="pb-barcode" />
            </div>
          </div>
          <div className="pb-face pb-left" />
          <div className="pb-face pb-back" />
        </div>
      </div>
    </div>
  );
}

const SCREEN_LINES = ["$ bun test", "  9,700 pass", "  0 fail", "$ _"];

/**
 * CSS-3D retro personal computer, adapted from the same design family's
 * hero object. Static text on the phosphor screen; sway is motion-safe only.
 */
export function RetroComputer() {
  return (
    <div className="rc-wrap" aria-hidden="true">
      <div className="rc-scene">
        <div className="rc-body">
          <div className="rc-face rc-front">
            <div className="rc-screen">
              {SCREEN_LINES.map((l) => (
                <div key={l} className="rc-screen-line mono">{l}</div>
              ))}
            </div>
            <div className="rc-slot" />
            <div className="rc-vents">
              <span /><span /><span />
            </div>
          </div>
          <div className="rc-face rc-right" />
          <div className="rc-face rc-left" />
          <div className="rc-face rc-top" />
          <div className="rc-face rc-back" />
        </div>
      </div>
    </div>
  );
}
