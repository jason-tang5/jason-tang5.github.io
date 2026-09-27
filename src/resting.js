// on a phone, the desktop rests like a screensaver: once the phone has sat still with
// nobody touching it for a while, the icons, windows and taskbar fade away and only
// the wallpaper is left. picking the phone up (the motion sensor), or touching it,
// brings everything back.
// iphones only share motion after the visitor allows it, which safari will only ask
// from inside a tap, so the first tap asks. without motion it just wakes on touch.
import { onBeforeUnmount, onMounted, ref } from 'vue';

const restAfter = 20000;
// how much the phone has to move (m/s², gravity included) between readings to count
const nudge = 0.6;

export function useResting(allowed) {
  const resting = ref(false);
  let timer;
  let asked = false;
  let lastMotion = null;

  function wake() {
    resting.value = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (allowed()) resting.value = true;
    }, restAfter);
  }

  function askForMotion() {
    if (asked) return;
    asked = true;
    // only safari has requestPermission. everywhere else motion just works
    window.DeviceMotionEvent?.requestPermission?.().catch(() => {});
  }

  // the tap that wakes the desktop shouldn't also press whatever is underneath, so
  // its click is swallowed
  let swallow = false;
  function down(event) {
    askForMotion();
    swallow = resting.value;
    if (swallow) event.stopPropagation();
    wake();
  }

  function clicked(event) {
    if (!swallow) return;
    swallow = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function motion(event) {
    const a = event.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    if (lastMotion) {
      const moved = Math.hypot(a.x - lastMotion.x, a.y - lastMotion.y, a.z - lastMotion.z);
      if (moved > nudge) wake();
    }
    lastMotion = { x: a.x, y: a.y, z: a.z };
  }

  onMounted(() => {
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('click', clicked, true);
    document.addEventListener('keydown', wake, true);
    document.addEventListener('scroll', wake, true);
    addEventListener('devicemotion', motion);
    wake();
  });

  onBeforeUnmount(() => {
    clearTimeout(timer);
    document.removeEventListener('pointerdown', down, true);
    document.removeEventListener('click', clicked, true);
    document.removeEventListener('keydown', wake, true);
    document.removeEventListener('scroll', wake, true);
    removeEventListener('devicemotion', motion);
  });

  return { resting, wake };
}
