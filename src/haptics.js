// a little buzz for game buttons on phones.
// android (and anything else with the vibration api) just vibrates. iphones don't
// let web pages vibrate, but safari on ios 18+ gives a haptic tick when a switch
// style checkbox is toggled, so a hidden one is clicked instead
let iosSwitch;

function iosTick() {
  if (!iosSwitch) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.append(input);
    document.body.append(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

// ms is how long to buzz, or a pattern like [30, 60, 30]
export function buzz(ms = 12) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (navigator.vibrate) navigator.vibrate(ms);
  else if (matchMedia('(pointer: coarse)').matches) iosTick();
}
