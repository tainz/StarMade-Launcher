<script setup lang="ts">
import Header from '@/components/starmade/layout/Header.vue';
import Footer from '@/components/starmade/layout/Footer.vue';
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-starmade-bg overflow-hidden font-sans text-white">
    <Header />
    
    <main class="flex-1 overflow-hidden p-6">
      <router-view />
    </main>
    
    <Footer />
  </div>
</template>

<style>
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Custom scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>