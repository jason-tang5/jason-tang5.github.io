// figures out when a spotify track actually finished so the cd player can move
// to the next one. the embed doesn't send a real "ended" event, so we watch the
// position updates and guess. it should only fire once per track, and never
// when the user just hit pause.
const endSlack = 250; // ms, the embed often stops a little short of the end

export function createPlaybackEndTracker() {
  let previous;
  let played = false;
  let manualPause = false;
  let finished = false;

  return {
    reset() {
      previous = undefined;
      played = false;
      manualPause = false;
      finished = false;
    },

    pause() {
      manualPause = true;
    },

    update(data) {
      const duration = data.duration || previous?.duration || 0;
      const atEnd = duration > 0 && data.position >= duration;

      // some embeds jump the position back to zero when the track ends,
      // so also check where the previous update was
      const stoppedAtEnd = data.isPaused && duration > 0 && (
        data.position >= duration - endSlack ||
        (data.position === 0 && previous?.position >= duration - endSlack)
      );

      const ended = played && !finished && !manualPause && !data.isBuffering && (atEnd || stoppedAtEnd);

      if (!data.isPaused && !data.isBuffering) {
        played = true;
        manualPause = false;
      }

      previous = data;
      if (ended) finished = true;
      return ended;
    },
  };
}
