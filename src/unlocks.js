// things you earn on the desktop. right now that's just beating breakout in
// contact, which unlocks the mail window. it's saved in the browser, so it
// sticks until you press restart in the game.
import { read, remove, save } from './storage.js';

export const contactBeaten = () => read('contact-beaten') === 'yes';
export const beatContact = () => save('contact-beaten', 'yes');
export const forgetContact = () => remove('contact-beaten');

// which locked apps are open to this visitor
const unlocked = { mail: contactBeaten };
export const isUnlocked = id => Boolean(unlocked[id]?.());
