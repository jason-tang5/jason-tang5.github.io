// the album the cd player plays
export const albumUrl = 'https://open.spotify.com/album/35I1NyorvFXQm14NSTQGY4';

// turns an album link into the clean url plus the embed url, or null if it isn't one
export function spotifyAlbum(url) {
  const match = /^https:\/\/open\.spotify\.com\/album\/([A-Za-z0-9]{22})(?:\?.*)?$/.exec(url);
  if (!match) return null;
  return {
    url: `https://open.spotify.com/album/${match[1]}`,
    embed: `https://open.spotify.com/embed/album/${match[1]}?utm_source=generator&theme=0`,
  };
}

// track list copied from spotify's embed on 2026-09-25. durations are in ms.
export const tracks = [
  { uri: 'spotify:track:0o9nSLwxvwa2jpkWAv1A7e', title: 'keep it lowkey', duration: 202000 },
  { uri: 'spotify:track:2mGICJePwFTIRJE5ShUuXD', title: "i know you'll like this", duration: 192000 },
  { uri: 'spotify:track:0Vdc6nn45DRGiAe83AfYHE', title: "ridin'", duration: 188000 },
  { uri: 'spotify:track:0uL4tVLBoUpA7Xqgd5nMUy', title: 'bourbon nights', duration: 185000 },
  { uri: 'spotify:track:4XO1vCpJA3pxUPWXJbFInH', title: 'let it be', duration: 154000 },
  { uri: 'spotify:track:60JfIBSy2xeFdKS7xYwBA1', title: 'pretty tricky', duration: 124759 },
  { uri: 'spotify:track:3fBeuNTKa6FRJqdGnfA6OR', title: "the beat's hot", duration: 139000 },
  { uri: 'spotify:track:4omilNkTyubVw372cCcsDK', title: 'sofa blues', duration: 208519 },
  { uri: 'spotify:track:6UVQrSDKxCKBFkY0PV60LK', title: 'another way', duration: 89500 },
  { uri: 'spotify:track:3z4Ih5iMHBOKDS7jCPvTvR', title: "don't sweat it", duration: 178000 },
  { uri: 'spotify:track:4eF04Mg5sa5BnRuOmzri1P', title: 'rusty', duration: 64177 },
  { uri: 'spotify:track:6QxXdUJH6yayqx1Qqw4zOC', title: 'close, but not there yet', duration: 138039 },
  { uri: 'spotify:track:6ILNJKefZdT8mIxtv6d8Nx', title: 'jazzy but not too jazzy', duration: 183199 },
  { uri: 'spotify:track:09gMKRfspvKwuTyhkqKcXW', title: 'step by step', duration: 141000 },
  { uri: 'spotify:track:72xWcTFNVMeyF0WwtvJYXX', title: 'minimalistic', duration: 226500 },
  { uri: 'spotify:track:0y6MbnHfyuLWyP1oaXNMpg', title: "that's neat", duration: 148000 },
  { uri: 'spotify:track:5w4xu2MiWWMz6CnSXjZXcA', title: 'stuck here', duration: 151000 },
  { uri: 'spotify:track:0YrOoozjBihclD34MvRFKA', title: 'tryin too hard', duration: 120000 },
  { uri: 'spotify:track:5QMyYEaxJLI0Y6ZOaHeI3X', title: 'best of times', duration: 159000 },
  { uri: 'spotify:track:4dSGu8iX5967uQvpKfAA5r', title: 'last night', duration: 176999 },
  { uri: 'spotify:track:4wN01eNGpYhIzfnXj9OMmF', title: 'with ease', duration: 164000 },
  { uri: 'spotify:track:1GYuM3kefNbPRCGgDTyuL8', title: "nothing that can't wait", duration: 139000 },
  { uri: 'spotify:track:3uQ5Jt14MJxBlIy0zfCR4b', title: 'little thing', duration: 176000 },
];
