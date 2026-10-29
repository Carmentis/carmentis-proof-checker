import { ref } from 'vue'

interface Options {
    storageKey: string
    initial: number
    min: number
    max: number
    /** Distance moved by one arrow key press. */
    step?: number
}

/** Width of a side panel that the user can drag (or use arrow keys on) to resize; remembered between visits. */
export function useResizablePanel({ storageKey, initial, min, max, step = 16 }: Options) {
    const clamp = (value: number) => Math.min(max, Math.max(min, value))
    const saved = Number(localStorage.getItem(storageKey))
    const width = ref(clamp(Number.isFinite(saved) && saved > 0 ? saved : initial))
    const dragging = ref(false)

    const set = (value: number) => {
        width.value = clamp(value)
        localStorage.setItem(storageKey, String(width.value))
    }

    let startX = 0
    let startWidth = 0

    function onPointerDown(event: PointerEvent) {
        if (event.button !== 0) return
        ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
        startX = event.clientX
        startWidth = width.value
        dragging.value = true
    }

    function onPointerMove(event: PointerEvent) {
        if (!dragging.value) return
        width.value = clamp(startWidth + event.clientX - startX)
    }

    function onPointerUp(event: PointerEvent) {
        if (!dragging.value) return
        dragging.value = false
        ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
        set(width.value)
    }

    function onKeydown(event: KeyboardEvent) {
        const moves: Record<string, () => void> = {
            ArrowLeft: () => set(width.value - step),
            ArrowRight: () => set(width.value + step),
            Home: () => set(min),
            End: () => set(max),
        }
        const move = moves[event.key]
        if (!move) return
        event.preventDefault()
        move()
    }

    return {
        width,
        dragging,
        min,
        max,
        reset: () => set(initial),
        handlers: {
            pointerdown: onPointerDown,
            pointermove: onPointerMove,
            pointerup: onPointerUp,
            pointercancel: onPointerUp,
            keydown: onKeydown,
        },
    }
}
