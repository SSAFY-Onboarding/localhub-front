import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/posts', name: 'posts', component: () => import('@/views/PostListView.vue') },
    { path: '/posts/new', name: 'post-new', component: () => import('@/views/PostCreateView.vue') },
    { path: '/posts/:id', name: 'post-detail', component: () => import('@/views/PostDetailView.vue') },
    { path: '/posts/:id/edit', name: 'post-edit', component: () => import('@/views/PostEditView.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
})

export default router
