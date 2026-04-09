import { createApp } from 'vue'
import './style.css'
import 'vue3-toastify/dist/index.css'
import App from './App.vue'
import router from './router'
import Vue3Toastify from 'vue3-toastify'

const app = createApp(App)
app.use(router)
app.use(Vue3Toastify, {
  autoClose: 3000,
  position: 'top-right',
  theme: 'light',
  style: {
    fontFamily: 'Manrope, Inter, sans-serif',
    fontSize: '14px',
  }
})
app.mount('#app')
