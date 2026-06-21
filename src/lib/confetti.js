// Tiny self-contained confetti burst — no dependency, no network. Appends a fullscreen
// canvas, animates particles under gravity, removes itself when they fall off-screen.
let active = false

export function burst({ count = 120 } = {}) {
  if (typeof document === 'undefined') return
  if (active) return // avoid stacking canvases on rapid PRs
  // Respect reduced-motion preference.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  active = true

  const cv = document.createElement('canvas')
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  const dpr = window.devicePixelRatio || 1
  cv.width = innerWidth * dpr
  cv.height = innerHeight * dpr
  document.body.appendChild(cv)
  const ctx = cv.getContext('2d')
  ctx.scale(dpr, dpr)

  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#eab308']
  const cx = innerWidth / 2, cy = innerHeight * 0.35
  const parts = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 4 + Math.random() * 9
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[(Math.random() * colors.length) | 0],
      life: 1,
    }
  })

  let raf
  function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    let alive = false
    for (const p of parts) {
      p.vy += 0.25 // gravity
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      if (p.y < innerHeight + 20) alive = true
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    }
    if (alive) {
      raf = requestAnimationFrame(frame)
    } else {
      cancelAnimationFrame(raf)
      cv.remove()
      active = false
    }
  }
  frame()
}
