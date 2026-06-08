import { useState, useRef, useCallback } from "react";

const SYSTEM_PROMPT = `You are an elite AI image prompt engineer with deep expertise in Midjourney, Flux, SDXL, Ideogram, Leonardo AI, and ChatGPT image generation.

When given a reference image, analyze it with extreme precision and return ONLY a valid JSON object (no markdown, no backticks, no preamble) with this exact structure:

{
  "subject": "Detailed description of the main subject(s)",
  "mainPrompt": "A full, detailed, production-quality prompt of 200-400 words covering subject, pose, facial expression, clothing/accessories, composition, camera angle, lens, lighting, color grading, background, environment, artistic style, rendering quality, and mood. Include technical AI keywords.",
  "shortPrompt": "A concise version under 100 words that captures the essential visual elements",
  "negativePrompt": "Comma-separated list of elements to avoid: bad anatomy, deformed, blurry, low quality, watermark, text, extra limbs, etc. tailored to this specific image",
  "styleTags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8"],
  "cameraSettings": {
    "lens": "e.g. 85mm portrait lens",
    "aperture": "e.g. f/1.8",
    "angle": "e.g. eye-level, slightly above",
    "framing": "e.g. medium close-up, rule of thirds",
    "dof": "e.g. shallow depth of field, subject in focus",
    "fov": "e.g. normal FOV"
  },
  "colorPalette": ["#hex1","#hex2","#hex3","#hex4","#hex5"],
  "lightingSetup": "Detailed description of the lighting: type, direction, quality, color temperature",
  "mood": "The emotional tone and atmosphere of the image",
  "platforms": {
    "midjourney": "Midjourney-specific suffix e.g. --ar 2:3 --v 6 --style raw --q 2",
    "flux": "Flux-specific guidance and style keywords",
    "sdxl": "SDXL-specific guidance with LoRA or style suggestions",
    "ideogram": "Ideogram-specific guidance",
    "leonardoAI": "Leonardo AI Image Guidance strength and model recommendations"
  }
}

Be exhaustive. Prioritize accuracy over creativity. Describe exactly what you see.`;

const TABS = [
  { id: "main", label: "Main Prompt" },
  { id: "short", label: "Short" },
  { id: "negative", label: "Negative" },
  { id: "camera", label: "Camera" },
  { id: "platforms", label: "Platforms" },
];

const PLATFORM_NAMES = {
  midjourney: "Midjourney",
  flux: "Flux",
  sdxl: "SDXL",
  ideogram: "Ideogram",
  leonardoAI: "Leonardo AI",
};

export default function App() {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageType, setImageType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("main");
  const [copied, setCopied] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const loadFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
      setImageType(file.type);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const clearAll = () => {
    setImage(null); setImageBase64(null); setImageType(null);
    setResult(null); setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const copyText = useCallback((text, key) => {
    navigator.clipboard.writeText(text || "");
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const analyze = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imageType, data: imageBase64 } },
              { type: "text", text: "Analyze this reference image pixel by pixel and reverse-engineer it into a professional AI image-generation prompt. Return only the JSON object." }
            ]
          }]
        })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || `Error ${res.status}`);
      }
      const data = await res.json();
      const raw = (data.content || []).map(i => i.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setActiveTab("main");
    } catch (err) {
      setError(err.message || "Analysis failed. Try again with a clear image.");
    } finally {
      setLoading(false);
    }
  };

  const s = {
    app: { minHeight: "100vh", background: "#0a0a0f", color: "#e8e8f0", fontFamily: "'DM Mono','Fira Code',monospace", position: "relative" },
    grid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#1a1a2e18 1px,transparent 1px),linear-gradient(90deg,#1a1a2e18 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0 },
    scanLine: { position: "fixed", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg,transparent,#4444ff,transparent)", animation: "scan 3s ease-in-out infinite", pointerEvents: "none", zIndex: 999 },
    wrap: { position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "28px 18px" },
    heading: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(30px,5vw,46px)", letterSpacing: 6, background: "linear-gradient(135deg,#8888ff,#ccccff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" },
    headerBorder: { borderBottom: "1px solid #1a1a2e", paddingBottom: 20, marginBottom: 28 },
    slabel: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#44448a", marginBottom: 8 },
    promptBox: { background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: 4, padding: "14px 16px", fontSize: 12, lineHeight: 1.85, color: "#c0c0e0", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" },
    card: { background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: 4, padding: 14 },
  };

  return (
    <div style={s.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0f}::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:2px}
        @keyframes scan{0%{top:0;opacity:1}100%{top:100vh;opacity:0}}
        @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .drop-zone{border:1px dashed #2a2a4a;border-radius:4px;cursor:pointer;transition:all .3s;overflow:hidden}
        .drop-zone.empty{padding:44px 20px;text-align:center}
        .drop-zone:hover,.drop-zone.over{border-color:#5555cc;background:#1a1a2e20}
        .tab-btn{background:none;border:none;border-bottom:2px solid transparent;color:#555577;padding:9px 15px;font-family:inherit;font-size:11px;letter-spacing:1.5px;cursor:pointer;transition:all .2s;text-transform:uppercase}
        .tab-btn:hover{color:#9999cc}.tab-btn.active{color:#8888ff;border-bottom-color:#5555ff}
        .copy-btn{background:none;border:1px solid #2a2a4a;color:#6666aa;padding:5px 13px;border-radius:3px;font-family:inherit;font-size:11px;cursor:pointer;transition:all .2s;letter-spacing:1px}
        .copy-btn:hover{border-color:#5555cc;color:#9999ff;background:#1a1a2e}
        .copy-btn.ok{border-color:#44aa66;color:#44cc77;background:#0a2a1a}
        .analyze-btn{background:linear-gradient(135deg,#2222aa,#4444cc);border:1px solid #5555dd;color:#ccccff;padding:12px 36px;font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:3px;cursor:pointer;border-radius:3px;transition:all .3s;margin-bottom:22px}
        .analyze-btn:hover:not(:disabled){background:linear-gradient(135deg,#3333bb,#5555dd);box-shadow:0 0 30px #3333aa40;transform:translateY(-1px)}
        .analyze-btn:disabled{opacity:.4;cursor:not-allowed}
        .tag{display:inline-block;background:#1a1a2e;border:1px solid #2a2a4a;color:#8888cc;padding:3px 10px;border-radius:3px;font-size:11px;letter-spacing:.5px;margin:3px;transition:all .2s}
        .tag:hover{background:#2a2a4a;color:#aaaaff}
        .swatch{width:30px;height:30px;border-radius:3px;border:1px solid #2a2a3a;cursor:pointer;transition:transform .2s;flex-shrink:0}
        .swatch:hover{transform:scale(1.2)}
        .plat-card{background:#0d0d18;border:1px solid #1e1e30;border-radius:4px;padding:14px;margin-bottom:10px;transition:border-color .2s}
        .plat-card:hover{border-color:#333366}
        .cam-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .cam-card{background:#0d0d18;border:1px solid #1e1e30;border-radius:4px;padding:12px 14px}
        .loading-bar{height:2px;width:200px;margin:0 auto;background:linear-gradient(90deg,#2222aa,#6644ff,#2222aa);background-size:200% 100%;animation:shimmer 1.5s linear infinite;border-radius:1px}
        .pulse-dot{width:12px;height:12px;border-radius:50%;background:#4444ff;margin:0 auto 14px;animation:pulse 1s ease-in-out infinite}
      `}</style>

      <div style={s.grid} />
      {loading && <div style={s.scanLine} />}

      <div style={s.wrap}>
        {/* Header */}
        <div style={s.headerBorder}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
            <h1 style={s.heading}>PROMPT FORGE</h1>
            <span style={{ fontSize: 10, letterSpacing: 3, color: "#44448a", textTransform: "uppercase" }}>AI Image Analyst v2</span>
          </div>
          <p style={{ marginTop: 7, fontSize: 11, color: "#44448a", letterSpacing: 1 }}>
            Upload a reference image → Get production-ready prompts for Midjourney, Flux, SDXL, Ideogram & more
          </p>
        </div>

        {/* Layout */}
        <div style={{ display: "grid", gridTemplateColumns: image ? "clamp(220px,30%,300px) 1fr" : "1fr", gap: 24, alignItems: "start" }}>

          {/* ── LEFT ── */}
          <div>
            <div style={s.slabel}>// reference image</div>
            <div
              className={`drop-zone${image ? "" : " empty"}`}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files[0]); }}
            >
              {image
                ? <img src={image} alt="Reference" style={{ width: "100%", display: "block" }} />
                : <>
                    <div style={{ fontSize: 28, opacity: .2, marginBottom: 10 }}>⬡</div>
                    <div style={{ fontSize: 12, color: "#555577", letterSpacing: 1 }}>DROP IMAGE HERE</div>
                    <div style={{ fontSize: 10, color: "#333355", marginTop: 5 }}>or click to browse</div>
                  </>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => loadFile(e.target.files[0])} />

            {image && (
              <button onClick={clearAll} style={{ marginTop: 7, fontSize: 10, letterSpacing: 1, background: "none", border: "1px solid #1e1e2e", color: "#444466", padding: "5px 12px", borderRadius: 3, cursor: "pointer", width: "100%", fontFamily: "inherit", transition: "all .2s" }}>
                CLEAR IMAGE
              </button>
            )}

            {/* Palette */}
            {result?.colorPalette && (
              <div style={{ marginTop: 20 }}>
                <div style={s.slabel}>// color palette</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {result.colorPalette.map((c, i) => (
                    <div key={i} className="swatch" style={{ background: c }} title={c} onClick={() => copyText(c, `col${i}`)} />
                  ))}
                </div>
              </div>
            )}

            {result?.lightingSetup && (
              <div style={{ marginTop: 18 }}>
                <div style={s.slabel}>// lighting</div>
                <div style={{ fontSize: 11, color: "#8888aa", lineHeight: 1.7 }}>{result.lightingSetup}</div>
              </div>
            )}
            {result?.mood && (
              <div style={{ marginTop: 14 }}>
                <div style={s.slabel}>// mood</div>
                <div style={{ fontSize: 11, color: "#8888aa", lineHeight: 1.7, fontStyle: "italic" }}>{result.mood}</div>
              </div>
            )}
            {result?.styleTags && (
              <div style={{ marginTop: 14 }}>
                <div style={s.slabel}>// style tags</div>
                <div>{result.styleTags.map((t, i) => <span key={i} className="tag">{t}</span>)}</div>
              </div>
            )}
          </div>

          {/* ── RIGHT ── */}
          <div>
            {imageBase64 && !loading && (
              <button className="analyze-btn" onClick={analyze} disabled={loading}>⬡ ANALYZE IMAGE</button>
            )}

            {!image && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, color: "#333355" }}>
                <div style={{ fontSize: 48, opacity: .15, marginBottom: 14 }}>◈</div>
                <div style={{ fontSize: 11, letterSpacing: 2, textAlign: "center", lineHeight: 2.2 }}>Upload a reference image<br />to begin prompt analysis</div>
              </div>
            )}

            {loading && (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div className="pulse-dot" />
                <div style={{ fontSize: 11, letterSpacing: 3, color: "#5555aa", marginBottom: 14 }}>ANALYZING IMAGE...</div>
                <div className="loading-bar" />
                <div style={{ fontSize: 10, color: "#333355", letterSpacing: 1, marginTop: 12 }}>extracting visual metadata · reverse engineering prompt</div>
              </div>
            )}

            {error && (
              <div style={{ background: "#1a0a0a", border: "1px solid #441111", borderRadius: 4, padding: 16, color: "#cc4444", fontSize: 12 }}>
                ⚠ {error}
              </div>
            )}

            {result && (
              <>
                {/* Subject */}
                <div style={{ ...s.card, marginBottom: 18 }}>
                  <div style={s.slabel}>// subject detected</div>
                  <div style={{ fontSize: 12, color: "#9999bb", lineHeight: 1.7 }}>{result.subject}</div>
                </div>

                {/* Tabs */}
                <div style={{ borderBottom: "1px solid #1a1a2e", marginBottom: 18, display: "flex", flexWrap: "wrap" }}>
                  {TABS.map(t => (
                    <button key={t.id} className={`tab-btn${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
                  ))}
                </div>

                {/* Main */}
                {activeTab === "main" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={s.slabel}>// main prompt</div>
                      <button className={`copy-btn${copied === "main" ? " ok" : ""}`} onClick={() => copyText(result.mainPrompt, "main")}>{copied === "main" ? "✓ COPIED" : "COPY"}</button>
                    </div>
                    <div style={s.promptBox}>{result.mainPrompt}</div>
                    {result.platforms?.midjourney && (
                      <div style={{ marginTop: 10, fontSize: 11, color: "#5555aa", background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 3, padding: "8px 12px" }}>
                        <span style={{ color: "#444466" }}>MJ suffix → </span>{result.platforms.midjourney}
                      </div>
                    )}
                  </>
                )}

                {/* Short */}
                {activeTab === "short" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={s.slabel}>// short prompt (&lt;100 words)</div>
                      <button className={`copy-btn${copied === "short" ? " ok" : ""}`} onClick={() => copyText(result.shortPrompt, "short")}>{copied === "short" ? "✓ COPIED" : "COPY"}</button>
                    </div>
                    <div style={s.promptBox}>{result.shortPrompt}</div>
                  </>
                )}

                {/* Negative */}
                {activeTab === "negative" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={s.slabel}>// negative prompt</div>
                      <button className={`copy-btn${copied === "neg" ? " ok" : ""}`} onClick={() => copyText(result.negativePrompt, "neg")}>{copied === "neg" ? "✓ COPIED" : "COPY"}</button>
                    </div>
                    <div style={{ ...s.promptBox, color: "#cc6666" }}>{result.negativePrompt}</div>
                  </>
                )}

                {/* Camera */}
                {activeTab === "camera" && result.cameraSettings && (
                  <>
                    <div style={{ ...s.slabel, marginBottom: 14 }}>// camera settings</div>
                    <div className="cam-grid">
                      {Object.entries(result.cameraSettings).map(([k, v]) => (
                        <div key={k} className="cam-card">
                          <div style={{ fontSize: 9, letterSpacing: 2, color: "#44448a", textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                          <div style={{ fontSize: 12, color: "#aaaacc" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 18 }}>
                      <div style={{ ...s.slabel, marginBottom: 10 }}>// full camera string</div>
                      <div style={{ ...s.promptBox, fontSize: 11 }}>{Object.entries(result.cameraSettings).map(([k, v]) => `${k}: ${v}`).join(" | ")}</div>
                    </div>
                  </>
                )}

                {/* Platforms */}
                {activeTab === "platforms" && result.platforms && (
                  <>
                    <div style={{ ...s.slabel, marginBottom: 14 }}>// platform-specific guidance</div>
                    {Object.entries(result.platforms).map(([k, v]) => (
                      <div key={k} className="plat-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontSize: 10, letterSpacing: 2, color: "#7777bb", textTransform: "uppercase" }}>{PLATFORM_NAMES[k] || k}</div>
                          <button className={`copy-btn${copied === k ? " ok" : ""}`} onClick={() => copyText(v, k)}>{copied === k ? "✓" : "COPY"}</button>
                        </div>
                        <div style={{ fontSize: 11, color: "#8888aa", lineHeight: 1.7 }}>{v}</div>
                      </div>
                    ))}
                  </>
                )}

                {/* Quick copy */}
                <div style={{ ...s.card, marginTop: 22 }}>
                  <div style={s.slabel}>// quick copy</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {[
                      { key: "qmain", label: "MAIN", text: result.mainPrompt },
                      { key: "qshort", label: "SHORT", text: result.shortPrompt },
                      { key: "qneg", label: "NEGATIVE", text: result.negativePrompt },
                      { key: "qtags", label: "TAGS", text: result.styleTags?.join(", ") },
                      { key: "qall", label: "ALL", text: `MAIN:\n${result.mainPrompt}\n\nSHORT:\n${result.shortPrompt}\n\nNEGATIVE:\n${result.negativePrompt}\n\nTAGS:\n${result.styleTags?.join(", ")}` },
                    ].map(({ key, label, text }) => (
                      <button key={key} className={`copy-btn${copied === key ? " ok" : ""}`} onClick={() => copyText(text, key)}>
                        {copied === key ? `✓ ${label}` : label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 44, borderTop: "1px solid #0e0e1e", paddingTop: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 9, letterSpacing: 2, color: "#222244" }}>
          <span>PROMPT FORGE // AI IMAGE ANALYST</span>
          <span>MJ · FLUX · SDXL · IDEOGRAM · LEONARDO · CHATGPT</span>
        </div>
      </div>
    </div>
  );
}
