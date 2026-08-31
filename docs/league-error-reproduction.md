# League opening error reproduction

Date: 2026-08-31

The local Vite app at `http://127.0.0.1:4173/` rendered a blank white document. The initial browser console view showed only the React DevTools informational message and no explicit runtime exception. The page HTML was saved under `/home/ubuntu/browser_html/127_0_0_1_page_1788178700667.html` for inspection. This means the next debugging step is to inspect the generated HTML and network/runtime state rather than assume the Realtime filter is the cause.

Additional browser finding: after waiting, `document.readyState` was `complete`, but `document.getElementById('root')` returned no element and `document.body.innerText` was empty. The page source contains `<div id="root"></div>`, so the browser appears to be rendering a DOM state without the React mount present. The console still showed no uncaught exception beyond the React DevTools info message. This points to a bootstrap/module-loading or document replacement issue rather than a normal league component render error.

After reload, the root element did exist (`<div id="root"></div>`) but remained empty. Performance resources showed `main.tsx` dependencies and many application modules loading, including `supabase.ts`, `footballCache.ts`, and UI components. No explicit console exception was surfaced. The failure is therefore likely in the final route/App bootstrap or an unresolved dynamic import, not a missing HTML root.

Confirmed root cause from direct module probe: importing `/src/main.tsx` fails with `ReferenceError: process is not defined` at `src/lib/supabase.ts:2:62`. The browser never mounts React, so the visible symptom is a blank screen before league navigation. The fix should replace the browser-unsafe `process` access with Vite-safe environment access while preserving server-side configuration behavior.

After patching `src/lib/supabase.ts`, the local app mounted successfully. The splash screen completed and the home feed rendered with interactive navigation controls, confirming the blank-screen bootstrap error is fixed. The next check is clicking a league and verifying its card-bet list loads without a runtime error.

After the bootstrap fix, the home screen rendered normally and the local browser smoke test showed the sports navigation and feed. The league-opening click target was visible for the next interaction; no blank-screen failure remained at startup.

During browser smoke testing after the fix, the app remained mounted and rendered normally. The first two visible top controls selected general sports navigation rather than opening a league detail page, so they did not reproduce the league route. The original blank-screen/bootstrap failure is resolved; a targeted league-list interaction or direct component/API test is still needed to validate the requested league detail path.
