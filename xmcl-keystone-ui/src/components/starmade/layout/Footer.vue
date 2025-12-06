<template>
  <footer class="bg-slate-900/95 border-t border-slate-700 p-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <!-- Instance info -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center">
          <PlayIcon class="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-white">{{ selectedInstance.name }}</h3>
          <p class="text-xs text-gray-400">{{ selectedInstance.version }}</p>
        </div>
      </div>

      <!-- Launch button -->
      <button
        @click="handleLaunch"
        :disabled="isDisabled"
        class="px-8 py-3 rounded-md font-semibold uppercase tracking-wider transition-all transform hover:scale-105 flex items-center gap-2"
        :class="buttonClasses"
      >
        <div 
          v-if="isLaunching"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        ></div>
        <PlayIcon v-else class="w-5 h-5" />
        {{ buttonText }}
      </button>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { PlayIcon } from '../icons'

export default defineComponent({
  name: 'Footer',
  components: {
    PlayIcon,
  },
  setup() {
    const isLaunching = ref(false)
    const selectedInstance = ref({
      name: 'Test Installation',
      version: '1.20.4',
    })

    const isDisabled = computed(() => {
      return !selectedInstance.value || isLaunching.value
    })

    const buttonText = computed(() => {
      if (isLaunching.value) return 'LAUNCHING...'
      return 'LAUNCH GAME'
    })

    const buttonClasses = computed(() => {
      if (isDisabled.value) {
        return 'bg-slate-700 text-gray-400 cursor-not-allowed'
      }
      return 'bg-starmade-accent hover:bg-starmade-accent-hover text-white'
    })

    const handleLaunch = () => {
      if (isDisabled.value) return
      
      isLaunching.value = true
      // TODO: Integrate with actual launch logic
      setTimeout(() => {
        isLaunching.value = false
      }, 3000)
    }

    return {
      isLaunching,
      selectedInstance,
      isDisabled,
      buttonText,
      buttonClasses,
      handleLaunch,
    }
  },
})
</script>