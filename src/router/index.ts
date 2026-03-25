import { createRouter, createWebHistory } from 'vue-router'
import ProofChecker from '@/components/checker/ProofChecker.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            component: ProofChecker,
        },
    ],
})

export default router
