<template>
  <div class="h-screen w-screen flex flex-col bg-starmade-bg overflow-hidden">
    <Header />
    
    <main class="flex-1 overflow-hidden p-6">
      <router-view />
    </main>
    
    <Footer />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Header from '@/components/starmade/layout/Header.vue'
import Footer from '@/components/starmade/layout/Footer.vue'

export default defineComponent({
  name: 'App',
  components: {
    Header,
    Footer,
  },
})
</script>

<style>
/* Import Tailwind base styles */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Global font imports */
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@700&family=Inter:wght@400;500;600&display=swap');

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>