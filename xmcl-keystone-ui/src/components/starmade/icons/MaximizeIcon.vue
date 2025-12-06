<script setup lang="ts">
interface Props {
  iconClass?: string;
}
withDefaults(defineProps<Props>(), { iconClass: 'w-5 h-5' });
</script>

<template>
  <svg 
    :class="iconClass"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/>
  </svg>
</template>
