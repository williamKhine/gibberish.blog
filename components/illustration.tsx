export function Illustration({
  kind = "nothing",
  className = "",
}: {
  kind?: string
  className?: string
}) {
  return (
    <div aria-hidden="true" className={`illustration art-${kind} ${className}`}>
      <div className="art-grid" />
      {kind === "nothing" ? (
        <>
          <span className="art-caption">
            a very important
            <br />
            non-agenda
          </span>
          <div className="paper-note">
            <span>today’s to-do</span>
            <div>☑ exist</div>
            <div>☐ the rest</div>
            <b>that’s enough.</b>
          </div>
          <span className="art-sun">☼</span>
          <span className="art-sticker">
            TAKE IT
            <br />
            EASY
          </span>
          <span className="art-squiggle">〰</span>
        </>
      ) : kind === "pockets" ? (
        <>
          <div className="receipt">
            CORNER STORE
            <br />
            ──────────
            <br />
            one good rock　$0
            <br />
            loose thoughts　$0
            <br />
            ──────────
            <br />
            TOTAL　 priceless
            <br />
            <br />
            THANK YOU ☺
          </div>
          <span className="rock">●</span>
          <span className="art-flower">✿</span>
          <span className="art-caption bottom">pocket-sized treasures</span>
        </>
      ) : kind === "plants" ? (
        <>
          <span className="plant-leaves">♧</span>
          <div className="plant-pot">☺</div>
          <span className="speech">
            water us,
            <br />
            bestie.
          </span>
        </>
      ) : (
        <>
          <span className="big-doodle">
            {kind === "dogs" ? "ʕ•ᴥ•ʔ" : kind === "toast" ? "☕" : "✳"}
          </span>
          <span className="art-caption bottom">
            {kind === "dogs"
              ? "a very good creature"
              : kind === "toast"
                ? "a crumb of a thought"
                : "weird little internet"}
          </span>
        </>
      )}
    </div>
  )
}
