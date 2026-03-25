import { ref, watch } from 'vue'

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const saved = localStorage.getItem('dark-mode')
const isDark = ref(saved !== null ? saved === 'true' : prefersDark)

document.documentElement.classList.toggle('dark', isDark.value)

watch(isDark, (val) => {
    document.documentElement.classList.toggle('dark', val)
    localStorage.setItem('dark-mode', String(val))
})

export function useDarkMode() {
    const toggle = () => {
        isDark.value = !isDark.value
    }
    return { isDark, toggle }
}
