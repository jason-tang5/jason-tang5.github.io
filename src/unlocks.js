// things you earn on the desktop. right now that's just beating breakout in
// contact, which unlocks the mail window. it's saved in the browser and stays
// unlocked for good, even after restarting the game.
import { read, remove, save } from './storage.js';

export const contactBeaten = () => read('contact-beaten') === 'yes';
export const beatContact = () => {
  save('contact-beaten', 'yes');
  remove('contact-board-reset');
};

// the cleared board (with the email showing) comes back on reopen until restart
// puts the bricks back. mail stays unlocked either way
export const contactBoardCleared = () => contactBeaten() && read('contact-board-reset') !== 'yes';
export const resetContactBoard = () => save('contact-board-reset', 'yes');

// which locked apps are open to this visitor
const unlocked = { mail: contactBeaten };
export const isUnlocked = id => Boolean(unlocked[id]?.());
