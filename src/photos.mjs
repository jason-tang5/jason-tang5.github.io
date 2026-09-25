// photos for the my pictures app. each one has a full size webp and a small
// thumbnail next to it in assets/photos. dog photos are named dog-<id>, anything
// else sets `file` explicitly.
const asset = name => new URL(`../assets/photos/${name}`, import.meta.url).href;

const list = [
  { id: 1, date: '2026-01-28', width: 1091, height: 1200, description: 'Pocky resting in a car with his tongue peeking out', caption: 'his name is', name: 'Pocky' },
  { id: 2, date: '2026-04-07', width: 900, height: 1200, description: 'A close-up of a dog looking up at the camera' },
  { id: 3, date: '2026-04-07', width: 900, height: 1200, description: 'Two dogs facing each other in a living room', caption: 'and he has a friend called', name: 'pringle' },
  { id: 4, date: '2026-04-07', width: 900, height: 1200, description: 'A dog lying on its side for a scratch' },
  { id: 5, date: '2026-04-07', width: 900, height: 1200, description: 'A close-up of a dog wearing a collar' },
  { id: 6, date: '2026-04-07', width: 900, height: 1200, description: 'A dog lying on the floor with its tongue out' },
  { id: 7, date: '2024-04-22', file: 'volleyball-1', width: 1295, height: 861, description: 'The volleyball team in tri-campus league champions shirts sitting on the court with the trophy', caption: 'he cant stop winning' },
  { id: 8, date: '2025-03-10', file: 'volleyball-2', width: 1279, height: 854, description: 'The St. George volleyball team posing with the trophy under a 15–11 fifth-set scoreboard' },
  { id: 9, date: '2025-03-10', file: 'volleyball-3', width: 1279, height: 852, description: 'A St. George player lifting the trophy as teammates cheer' },
];

export const photos = list.map(photo => {
  const file = photo.file ?? `dog-${photo.id}`;
  return {
    ...photo,
    source: asset(`${file}.webp`),
    thumbnail: asset(`${file}-thumb.webp`),
  };
});
