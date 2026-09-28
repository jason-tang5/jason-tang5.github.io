<script setup>
// a little ms-dos prompt on the about page that "builds" each project in turn: it types
// the command, spins for a moment, prints done, then moves on to the next. the last one
// is what i'm building right now, so it never finishes. it just spins until the whole
// thing clears and starts over. the arrow in its title bar folds it up to just that
// bar and back down. it only runs while you can see it, and with reduced motion it
// shows a finished run, standing still
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { projects } from '../content.mjs';

const props = defineProps({ visible: Boolean });

// oldest first, ending on what's being built now
const order = ['reversi-ai', 'fpga-2048', 'portfolio', 'mini-ml'];
const builds = [...order.filter(id => projects.some(p => p.id === id)), 'small-llm'];
// the lines on screen: { text, state } where state is typing, building or done
const lines = ref([]);
const spinner = ref('|');
const screen = ref(null);
const open = ref(true);

const spinFrames = ['|', '/', '-', '\\'];
let onScreen = false;
let alive = true;
let timer = 0;
let spin = 0;

const wait = ms => new Promise(resolve => {
  timer = setTimeout(resolve, ms);
});
// holds the run where it is while the window's hidden or the terminal's scrolled away
async function whenSeen() {
  while (alive && !(props.visible && onScreen)) await wait(250);
}

async function run() {
  while (alive) {
    lines.value = [];
    for (const [i, name] of builds.entries()) {
      const full = `building ${name}...`;
      lines.value.push({ text: '', state: 'typing' });
      const line = lines.value[lines.value.length - 1];
      for (const char of full) {
        await whenSeen();
        line.text += char;
        await wait(28);
      }
      line.state = 'building';
      const last = i === builds.length - 1;
      await wait(last ? 4500 : 450 + Math.random() * 550);
      await whenSeen();
      if (!last) line.state = 'done';
      await wait(200);
    }
  }
}

let observer;
onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lines.value = builds.map((name, i) => ({ text: `building ${name}...`, state: i < builds.length - 1 ? 'done' : 'building' }));
    return;
  }
  // folding it up pulls the screen out of the page, so the observer sees it leave and
  // the run holds until it's opened again
  observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; });
  observer.observe(screen.value);
  spin = setInterval(() => {
    if (props.visible && onScreen) spinner.value = spinFrames[(spinFrames.indexOf(spinner.value) + 1) % spinFrames.length];
  }, 120);
  run();
});

onBeforeUnmount(() => {
  alive = false;
  clearTimeout(timer);
  clearInterval(spin);
  observer?.disconnect();
});
</script>

<template>
  <div class="build-terminal raised" :class="{ open }">
    <button class="build-terminal-title" :aria-expanded="open" @click="open = !open">
      <svg viewBox="0 0 7 7" aria-hidden="true" shape-rendering="crispEdges"><path d="M2 0h1v7H2zM3 1h1v5H3zM4 2h1v3H4zM5 3h1v1H5z"/></svg>
      MS-DOS Prompt - build
    </button>
    <!-- decoration only: the projects themselves are listed properly elsewhere -->
    <div v-show="open" ref="screen" class="build-terminal-screen" aria-hidden="true" :style="{ '--rows': builds.length * 2 - 1 }">
      <template v-for="(line, i) in lines" :key="i">
        <div>
          <span class="prompt">&gt;</span> {{ line.text }}<span v-if="line.state === 'typing'" class="cursor">_</span><span v-else-if="line.state === 'building'" class="spinner"> {{ spinner }}</span>
        </div>
        <div v-if="line.state === 'done'" class="done">√ done</div>
      </template>
    </div>
  </div>
</template>
