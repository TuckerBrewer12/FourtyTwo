export function hapticLight() {
  try { navigator.vibrate?.(10) } catch {}
}

export function hapticMedium() {
  try { navigator.vibrate?.(25) } catch {}
}

export function hapticHeavy() {
  try { navigator.vibrate?.(50) } catch {}
}

export function hapticSuccess() {
  try { navigator.vibrate?.([10, 30, 10]) } catch {}
}

export function hapticError() {
  try { navigator.vibrate?.([30, 20, 30]) } catch {}
}
