/**
 * ============================================================
 *  cursor-overlay.mjs — Visual cursor + click highlights
 *  Injected into Playwright pages during video recording
 * ============================================================
 */

/**
 * CSS for the fake cursor and click ripple effect.
 * Since Playwright recordVideo doesn't capture the OS cursor,
 * we render a visible CSS cursor that follows mouse events.
 */
export const CURSOR_CSS = `
/* Hide real cursor */
* { cursor: none !important; }

/* Fake cursor */
#__video-cursor {
  position: fixed;
  top: 0; left: 0;
  width: 20px; height: 20px;
  pointer-events: none;
  z-index: 999999;
  transform: translate(-2px, -2px);
  transition: top 0.08s ease-out, left 0.08s ease-out;
}
#__video-cursor svg {
  filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.35));
}

/* Click ripple */
.click-ripple {
  position: fixed;
  pointer-events: none;
  z-index: 999998;
  width: 40px; height: 40px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.35);
  transform: translate(-50%, -50%) scale(0.3);
  animation: click-ripple-anim 0.5s ease-out forwards;
}
@keyframes click-ripple-anim {
  0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
}
`;

/**
 * JavaScript to inject into the page.
 * Creates a visible cursor element and listens for mouse events.
 */
export const CURSOR_SCRIPT = `
(() => {
  // Create cursor element
  const cursor = document.createElement('div');
  cursor.id = '__video-cursor';
  cursor.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36Z" fill="#fff" stroke="#000" stroke-width="1.5"/></svg>';
  document.body.appendChild(cursor);

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  }, true);

  // Click ripple
  document.addEventListener('mousedown', (e) => {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, true);
})();
`;

/**
 * Inject cursor overlay into a Playwright page.
 * Call this once after page.goto() or page.setContent().
 */
export async function injectCursorOverlay(page) {
  await page.addStyleTag({ content: CURSOR_CSS });
  await page.addScriptTag({ content: CURSOR_SCRIPT });
}
