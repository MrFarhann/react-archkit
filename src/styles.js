// One small, responsive stylesheet is used for plain CSS and Tailwind projects.
// Generated shadcn components use the same semantic class names as the plain UI.
export function appStyles(tailwind) {
  return `${tailwind ? '@import "tailwindcss";\n' : ''}
:root {
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #21362c;
  background: #f7f8f3;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
body { min-width: 320px; margin: 0; }
button, input { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
button { cursor: pointer; }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid #71996d; outline-offset: 3px; }
.page-shell { min-height: 100vh; display: flex; flex-direction: column; background: #f7f8f3; }
@supports (min-height: 100svh) { .page-shell { min-height: 100svh; } }
.topbar, .footer { width: min(1160px, calc(100% - 80px)); margin-inline: auto; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.topbar { min-height: 88px; border-bottom: 1px solid #dfe6da; }
.brand { display: inline-flex; align-items: center; gap: 11px; color: #1f372b; text-decoration: none; }
.brand-mark { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 11px; color: #def0c7; background: #294b38; font-size: 18px; line-height: 1; }
.brand-copy { display: flex; flex-direction: column; gap: 3px; }
.brand-name { font-size: 18px; font-weight: 750; letter-spacing: -.055em; line-height: 1; }
.brand-name span { color: #8aaa7a; }
.brand-caption { color: #607765; font-size: 9px; font-weight: 700; letter-spacing: .09em; line-height: 1.4; }
.topbar-badge { display: inline-flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1px solid #e0e9dc; border-radius: 999px; color: #526b58; background: #f4f8f1; font-size: 10px; font-weight: 700; letter-spacing: .06em; white-space: nowrap; }
.topbar-status-dot { width: 7px; height: 7px; flex: none; border-radius: 50%; background: #7da474; box-shadow: 0 0 0 3px #e4efdf; }
.topbar-nav { display: flex; align-items: center; gap: 3px; padding: 4px; border: 1px solid #e0e9dc; border-radius: 12px; background: #f1f6ee; }
.topbar-nav-link { display: inline-flex; align-items: center; min-height: 36px; padding: 0 14px; border-radius: 8px; color: #526b58; font-size: 12px; font-weight: 700; text-decoration: none; white-space: nowrap; }
.topbar-nav-link:hover { color: #294d39; background: #e7f0e3; }
.topbar-nav-link[aria-current='page'], .topbar-nav-link[data-status='active'] { color: #294d39; background: #fff; box-shadow: 0 1px 4px rgb(35 63 44 / 10%); }
.app { width: min(1080px, calc(100% - 80px)); flex: 1; margin: 0 auto; padding: 74px 0 84px; display: grid; grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr); gap: clamp(48px, 7vw, 100px); align-items: center; }
.hero { min-width: 0; padding: 12px 0; }
.eyebrow { display: flex; align-items: center; gap: 9px; margin: 0 0 24px; color: #596e5e; font-size: 11px; font-weight: 750; letter-spacing: .15em; line-height: 1.5; text-transform: uppercase; }
.eyebrow span { color: #7fa06e; font-size: 15px; }
.hero-title, .hero h1 { max-width: 12ch; margin: 0; color: #20382c; font-size: clamp(48px, 5.8vw, 76px); font-weight: 740; letter-spacing: -.065em; line-height: 1.04; }
.hero-title em { color: #78966f; font-family: Georgia, 'Times New Roman', serif; font-weight: 400; }
.hero-copy { max-width: 35ch; margin: 23px 0 0; color: #5e7565; font-size: 16px; line-height: 1.75; }
.hero-meta { display: flex; align-items: center; gap: 10px; margin: 42px 0 0; color: #596e5e; font-size: 12px; font-weight: 650; letter-spacing: .01em; }
.hero-meta-dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: #8eaf7b; box-shadow: 0 0 0 4px #e9f1e3; }
.workspace { min-width: 0; overflow: hidden; display: block; padding: clamp(25px, 3vw, 36px); border: 1px solid #e2e8df; border-radius: 22px; background: #fff; box-shadow: 0 24px 70px rgb(35 63 44 / 7%), 0 3px 10px rgb(35 63 44 / 3%); }
.workspace-intro { min-width: 0; }
.section-heading, .list-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.section-heading { margin-bottom: 24px; }
.section-heading h2, .list-heading h2 { margin: 0; color: #253d30; font-size: 21px; font-weight: 740; letter-spacing: -.045em; line-height: 1.2; }
.section-heading h2 span { color: #8aa87b; }
.section-kicker { margin: 0 0 7px; color: #5e7565; font-size: 10px; font-weight: 750; letter-spacing: .14em; line-height: 1.4; text-transform: uppercase; }
.workspace-helper { margin: 7px 0 0; color: #5e7565; font-size: 12px; line-height: 1.5; }
.task-count { flex: none; padding: 7px 10px; border-radius: 999px; color: #527257; background: #eef5e9; font-size: 11px; font-weight: 700; white-space: nowrap; }
.task-form { display: flex; align-items: stretch; gap: 9px; }
.input-wrap { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #dfe8dc; border-radius: 11px; color: #85a186; background: #fafcf9; transition: border-color .18s ease, box-shadow .18s ease; }
.input-wrap:focus-within { border-color: #87aa80; outline: 3px solid #526e50; outline-offset: 2px; box-shadow: 0 0 0 3px #e7f1e3; }
.input-wrap > span { flex: none; font-size: 20px; line-height: 1; }
.task-form input { width: 100%; min-width: 0; height: 48px; padding: 0; border: 0; outline: none; box-shadow: none; color: #263d30; background: transparent; font-size: 13px; }
.task-form input::placeholder { color: #5e7565; opacity: 1; }
.task-form input:focus-visible { outline: none; box-shadow: none; }
.task-form .add-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 50px; padding: 0 17px; border: 0; border-radius: 11px; color: #fff; background: #294d39; font-size: 13px; font-weight: 700; white-space: nowrap; box-shadow: none; transition: background .18s ease, transform .18s ease; }
.task-form .add-button:hover { background: #36634a; }
.task-form .add-button:active { transform: translateY(1px); }
.task-form-hint { margin: 9px 0 0; color: #5e7565; font-size: 11px; line-height: 1.5; }
.list-heading { margin-top: 30px; padding-bottom: 12px; border-bottom: 1px solid #ebf0e9; }
.list-label { margin: 0; color: #657a6b; font-size: 10px; font-weight: 750; letter-spacing: .12em; line-height: 1.4; text-transform: uppercase; }
.list-count { color: #5e7565; font-size: 11px; white-space: nowrap; }
.task-list { margin: 0; padding: 0; list-style: none; }
.task-row { min-height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 0; border-bottom: 1px solid #edf1eb; }
.task-row:last-child { border-bottom: 0; }
.task-title { min-width: 0; overflow-wrap: anywhere; color: #304b39; font-size: 14px; line-height: 1.5; }
.task-title.completed { color: #5e7565; text-decoration: line-through; }
.toggle { flex: none; padding: 8px 10px; border: 1px solid #dce7d9; border-radius: 9px; color: #4d7057; background: #fff; font-size: 11px; font-weight: 700; line-height: 1.3; box-shadow: none; transition: background .18s ease, border-color .18s ease; }
.toggle:hover { border-color: #bfd3bd; background: #f4f9f1; }
.toggle[aria-pressed='true'] { color: #4f7055; border-color: #d8e8d4; background: #eff7eb; }
.empty { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; padding: 28px 12px 18px; text-align: center; }
.empty-icon { position: relative; width: 52px; height: 52px; display: grid; place-items: center; margin-bottom: 15px; border: 1px solid #e5eee0; border-radius: 17px; color: #73966c; background: #f4f9f0; font-size: 23px; line-height: 1; }
.empty-title { margin: 0; color: #405d49; font-size: 14px; font-weight: 700; }
.empty-copy { max-width: 28ch; margin: 7px 0 0; color: #5e7565; font-size: 12px; line-height: 1.55; }
.footer { min-height: 76px; padding: 18px 0; border-top: 1px solid #dfe6da; }
.footer-attribution { display: flex; flex-direction: column; gap: 3px; }
.footer-copy, .footer-credit { margin: 0; color: #596e5e; font-size: 12px; line-height: 1.5; }
.footer-credit a { color: #355c42; font-weight: 700; text-decoration: none; }
.footer-credit a:hover { text-decoration: underline; text-underline-offset: 4px; }
.footer-links { display: flex; align-items: center; gap: 22px; }
.footer-links a { color: #5c7461; font-size: 12px; font-weight: 650; text-decoration: none; }
.footer-links a:hover { color: #294d39; text-decoration: underline; text-underline-offset: 4px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 800px) {
  .topbar, .footer, .app { width: min(600px, calc(100% - 48px)); }
  .topbar { min-height: 76px; }
  .app { grid-template-columns: minmax(0, 1fr); gap: 36px; align-content: start; padding: 54px 0 64px; }
  .hero-title, .hero h1 { max-width: none; font-size: clamp(46px, 9vw, 64px); }
  .hero-meta { margin-top: 26px; }
}
@media (max-width: 460px) {
  .topbar, .footer, .app { width: calc(100% - 36px); }
  .topbar { gap: 12px; }
  .topbar-badge { padding: 8px 10px; font-size: 9px; }
  .topbar-nav-link { padding-inline: 10px; }
  .app { gap: 30px; padding: 42px 0 52px; }
  .hero-title, .hero h1 { font-size: clamp(39px, 10.5vw, 52px); }
  .hero-copy { font-size: 14px; }
  .workspace { padding: 22px 18px; border-radius: 18px; }
  .task-form { flex-direction: column; }
  .task-form .add-button { width: 100%; }
  .footer { min-height: 88px; flex-wrap: wrap; align-content: center; gap: 12px; }
}
@media (max-width: 360px) { .topbar-badge { display: none; } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
`;
}
