// Embedded into portable local film pages; no storage or network requests.
(() => {
  const video = document.querySelector('video');
  const box = document.querySelector('.currentFilmCaption');
  const scenes = JSON.parse(document.getElementById('film-timeline').textContent);
  const study = document.getElementById('film-pause-at-chapter');
  const status = document.getElementById('film-playback-status');
  const previousButton = document.getElementById('film-previous');
  const nextButton = document.getElementById('film-next');
  let previous = -1;
  let stoppedAtBoundary = false;
  let boundarySeek = false;
  const sceneAt = time => {
    const index = scenes.findIndex(s => time >= s.start && time < s.end);
    return index >= 0 ? index : time >= scenes.at(-1).end ? scenes.length - 1 : 0;
  };
  function update() {
    const index = sceneAt(video.currentTime);
    if (study.checked && !video.paused && !video.seeking && previous >= 0 && index > previous) {
      video.pause();
      stoppedAtBoundary = true;
      boundarySeek = true;
      video.currentTime = scenes[previous].end - 0.12;
      status.textContent = 'この章の終わりで停止しました。「次の章へ」または再生で続きを見られます。';
      return;
    }
    if (index === previous) return;
    previous = index;
    box.querySelector('strong').textContent = scenes[index].title;
    box.querySelector('p').textContent = scenes[index].caption;
    previousButton.disabled = index === 0;
    nextButton.disabled = index === scenes.length - 1;
    document.querySelectorAll('[data-time]').forEach(button => {
      if (Number(button.dataset.time) === scenes[index].start) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }
  function go(index) {
    stoppedAtBoundary = false;
    status.textContent = '';
    previous = -1;
    video.currentTime = scenes[index].start;
    video.play().catch(() => { status.textContent = '動画の再生ボタンを押して続けてください。'; });
    update();
  }
  previousButton.onclick = () => go(Math.max(0, sceneAt(video.currentTime) - 1));
  nextButton.onclick = () => go(Math.min(scenes.length - 1, sceneAt(video.currentTime) + 1));
  document.getElementById('film-replay').onclick = () => go(sceneAt(video.currentTime));
  document.getElementById('film-speed').onchange = event => { video.playbackRate = Number(event.target.value); };
  // Seeking is deliberate navigation, not natural arrival at a chapter boundary.
  video.addEventListener('seeking', () => {
    if (boundarySeek) boundarySeek = false;
    else { stoppedAtBoundary = false; status.textContent = ''; }
    previous = -1; update();
  });
  video.addEventListener('play', () => {
    if (stoppedAtBoundary) {
      const index = Math.min(scenes.length - 1, sceneAt(video.currentTime) + 1);
      stoppedAtBoundary = false; previous = -1; video.currentTime = scenes[index].start;
    }
    status.textContent = '';
  });
  video.addEventListener('timeupdate', update);
  video.addEventListener('seeked', update);
  document.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => {
    stoppedAtBoundary = false; status.textContent = ''; previous = -1;
  }, {capture: true}));
  update();
})();
