// The same responsive presentation is shared by every architecture and style option.
export function appStyles(tailwind) {
  return `${tailwind ? '@import "tailwindcss";\n' : ''}
:root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1c2925; background: #f5f6f2; font-synthesis: none; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
* { box-sizing: border-box; }
body { min-width: 320px; margin: 0; }
button, input { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
button { cursor: pointer; }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid #a3cf73; outline-offset: 3px; }
.page-shell { min-height: 100vh; display: flex; flex-direction: column; }
@supports (min-height: 100svh) { .page-shell { min-height: 100svh; } }
.topbar { width: min(1120px, calc(100% - 64px)); min-height: clamp(64px, 8vh, 82px); flex-shrink: 0; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid #e3e7df; }
.brand { display: inline-flex; align-items: center; gap: 10px; color: #1c2925; text-decoration: none; }
.brand-mark { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px; color: #d7f6b8; background: #213c31; font-size: 17px; font-weight: 800; }
.brand-name { font-size: 16px; font-weight: 750; letter-spacing: -.04em; }
.topbar-badge { padding: 7px 11px; border: 1px solid #dce5d7; border-radius: 999px; color: #58705e; background: #f9fbf7; font-size: 11px; font-weight: 700; letter-spacing: .02em; }
.app { width: min(680px, calc(100% - 40px)); flex: 1; margin: 0 auto; padding: clamp(24px, 4vh, 64px) 0; }
.hero { margin-bottom: clamp(20px, 3vh, 31px); }
.eyebrow { display: flex; align-items: center; gap: 8px; margin: 0 0 clamp(10px, 1.6vh, 17px); color: #6a8070; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.eyebrow span { color: #88aa74; font-size: 14px; }
.hero-title, .hero h1 { margin: 0; color: #20342b; font-size: clamp(36px, min(6vw, 6.5vh), 54px); font-weight: 750; letter-spacing: -.065em; line-height: 1.08; }
.hero-title em { color: #769771; font-family: Georgia, serif; font-weight: 400; }
.hero-copy { margin: 13px 0 0; color: #78877d; font-size: 15px; line-height: 1.6; }
.workspace { overflow: hidden; padding: clamp(20px, 3vh, 28px); border: 1px solid #e5eae1; border-radius: 20px; background: #fff; box-shadow: 0 14px 40px #28472a09, 0 3px 10px #28472a06; }
.section-heading, .list-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.section-heading { margin-bottom: 17px; }
.section-heading h2, .list-heading h2, .list-label { margin: 0; color: #23382d; font-size: 14px; font-weight: 750; letter-spacing: -.02em; }
.section-kicker { margin: 0 0 7px; color: #91a197; font-size: 10px; font-weight: 750; letter-spacing: .12em; }
.task-count, .list-count { color: #75877a; font-size: 12px; white-space: nowrap; }
.task-form { display: flex; align-items: stretch; gap: 10px; }
.input-wrap { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 0 14px; border: 1px solid #e0e7dd; border-radius: 10px; color: #8ea68f; background: #fbfcfa; transition: border-color .18s, box-shadow .18s; }
.input-wrap:focus-within { border-color: #a2bd95; box-shadow: 0 0 0 3px #eaf4e4; }
.input-wrap > span { font-size: 21px; line-height: 1; }
.task-form input { width: 100%; min-width: 0; height: 46px; padding: 0; border: 0; outline: none; color: #25382d; background: transparent; font-size: 13px; }
.task-form input::placeholder { color: #a0ada3; }
.task-form input:focus-visible { outline: none; }
.task-form .add-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 18px; border: 0; border-radius: 10px; color: #fff; background: #274a37; font-size: 13px; font-weight: 700; white-space: nowrap; transition: background .18s, transform .18s; }
.task-form .add-button:hover { background: #356248; }
.task-form .add-button:active { transform: translateY(1px); }
.list-heading { margin-top: clamp(20px, 3vh, 32px); padding-bottom: 13px; border-bottom: 1px solid #edf0ea; }
.task-list { margin: 0; padding: 0; list-style: none; }
.task-row { min-height: 62px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f0f2ee; }
.task-title { min-width: 0; overflow-wrap: anywhere; color: #3c4f42; font-size: 14px; line-height: 1.5; }
.task-title.completed, .completed { color: #9ca9a0; text-decoration: line-through; }
.toggle { flex: none; padding: 8px 11px; border: 1px solid #e5eae3; border-radius: 8px; color: #607767; background: #fff; font-size: 11px; font-weight: 700; transition: background .18s, border-color .18s; }
.toggle:hover { border-color: #cbdcc9; background: #f4f9f1; }
.toggle[aria-pressed='true'] { color: #557557; border-color: #e1ecdd; background: #eff7eb; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: clamp(120px, 16vh, 205px); text-align: center; }
.empty-icon { width: 46px; height: 46px; display: grid; place-items: center; margin-bottom: 15px; border: 1px solid #e7eee4; border-radius: 15px; color: #7a9b79; background: #f5f9f2; font-size: 23px; line-height: 1; }
.empty-title { margin: 0; color: #506354; font-size: 13px; font-weight: 700; }
.empty-copy { margin: 6px 0 0; color: #a1ada3; font-size: 12px; line-height: 1.5; }
.footer { width: min(1120px, calc(100% - 64px)); min-height: clamp(60px, 8vh, 82px); flex-shrink: 0; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; border-top: 1px solid #e3e7df; }
.footer-copy { margin: 0; color: #98a59b; font-size: 12px; }
.footer-links { display: flex; align-items: center; gap: 22px; }
.footer-links a { color: #65796a; font-size: 12px; font-weight: 650; text-decoration: none; }
.footer-links a:hover { color: #274a37; text-decoration: underline; text-underline-offset: 4px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 520px) {
  .topbar, .footer { width: calc(100% - 40px); }
  .topbar { min-height: 70px; }
  .app { padding: 55px 0 60px; }
  .workspace { padding: 21px; border-radius: 16px; }
  .task-form { flex-direction: column; }
  .task-form .add-button { width: 100%; }
  .footer { min-height: 92px; flex-wrap: wrap; align-content: center; gap: 12px; padding: 20px 0; }
}
`;
}
