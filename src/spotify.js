// loads spotify's iframe api once and hands back the api object.
// if it fails or times out we clear the cached promise so the next play click can retry.
let apiPromise;

export function loadSpotifyApi() {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(fail, 12000);

    function fail() {
      clearTimeout(timeout);
      script.remove();
      apiPromise = null;
      reject(new Error('Spotify could not load.'));
    }

    // spotify calls this global once the script is ready
    window.onSpotifyIframeApiReady = api => {
      clearTimeout(timeout);
      resolve(api);
    };

    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  });

  return apiPromise;
}
