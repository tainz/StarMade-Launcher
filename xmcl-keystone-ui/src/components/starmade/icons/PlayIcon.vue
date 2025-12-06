<!-- src/components/starmade/icons/PlayIcon.vue -->
<script setup lang="ts">
interface Props {
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  class: 'w-5 h-5'
})
</script>

<template>
  <svg
    :class="props.class"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
</template>
