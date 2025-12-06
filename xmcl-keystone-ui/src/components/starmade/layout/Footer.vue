<script setup lang="ts">
import { ref } from 'vue';
import PlayIcon from '@/components/starmade/icons/PlayIcon.vue';

// Mock data
const selectedInstance = ref({
  name: 'Test Installation',
  version: '1.20.4',
  icon: null
});

const isLaunching = ref(false);
</script>

<template>
  <footer class="bg-slate-900/95 border-t border-slate-700 p-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <!-- Instance Info -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center">
          <PlayIcon icon-class="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-white">{{ selectedInstance?.name || 'No Instance Selected' }}</h3>
          <p class="text-xs text-gray-400">{{ selectedInstance?.version || 'Select an instance to play' }}</p>
        </div>
      </div>
      
      <!-- Launch Button -->
      <button 
        class="px-8 py-3 rounded-md font-semibold uppercase tracking-wider transition-all transform hover:scale-105 flex items-center gap-2"
        :class="selectedInstance ? 'bg-starmade-accent hover:bg-starmade-accent-light text-white' : 'bg-slate-700 text-gray-400 cursor-not-allowed'"
        :disabled="!selectedInstance"
      >
        <PlayIcon icon-class="w-5 h-5" />
        <span>{{ isLaunching ? 'Launching...' : 'Launch Game' }}</span>
      </button>
    </div>
  </footer>
</template>