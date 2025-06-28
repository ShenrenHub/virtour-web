import './assets/main.css'

import { createApp } from 'vue'
// @ts-ignore
import App from './App.vue'
import router from './router'
import { registerLicense } from '@syncfusion/ej2-base'

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
// main.ts
// Registering Syncfusion<sup style="font-size:70%">&reg;</sup> license key
registerLicense(
  'Ngo9BigBOggjHTQxAR8/V1NNaF5cXmBCe0xyWmFZfVtgdV9CYlZVQ2Y/P1ZhSXxWdkFjXX5ddHZQR2FYUUF9XUs=',
)

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})

const app = createApp(App)

app.use(router)

app.use(vuetify)

app.mount('#app');


// const script = document.createElement('script')

// script.async = true
// script.defer = true
// document.head.appendChild(script)

// createApp(App).mount('#app')
