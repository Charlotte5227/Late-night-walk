let map, polyline, currentPosMarker;
let routeCoords = [];
let watchId = null;
let timerInterval = null;
let secondsElapsed = 0;
let isWalking = false;
let startTime = null;

const timerEl = document.getElementById('timer');
const startStopBtn = document.getElementById('start-stop-btn');
const savePathBtn = document.getElementById('save-path-btn');
const calendarBtn = document.getElementById('calendar-btn');
const closeCalendarBtn = document.getElementById('close-calendar-btn');
const calendarModal = document.getElementById('calendar-modal');
const recordList = document.getElementById('record-list');

// 🚶 アイコンの設定
const manIcon = L.divIcon({
  html: '<div style="font-size: 30px;">🚶</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

function initMap() {
  map = L.map('map').setView([35.681236, 139.767125], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  polyline = L.polyline([], { color: '#2196F3', weight: 5 }).addTo(map);
}

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function startTracking() {
  if (!navigator.geolocation) return;

  watchId = navigator.geolocation.watchPosition(position => {
    const latLng = [position.coords.latitude, position.coords.longitude];
    
    // 🚶 現在地マーカーの更新
    if (!currentPosMarker) {
      currentPosMarker = L.marker(latLng, {icon: manIcon}).addTo(map);
      map.setView(latLng, 17);
    } else {
      currentPosMarker.setLatLng(latLng);
    }

    routeCoords.push(latLng);
    polyline.setLatLngs(routeCoords);
    map.panTo(latLng);
  }, error => {
    console.error(error);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

startStopBtn.addEventListener('click', () => {
  if (!isWalking) {
    // 開始
    isWalking = true;
    startTime = new Date();
    startStopBtn.textContent = '停止';
    startStopBtn.classList.replace('start', 'stop');
    savePathBtn.style.display = 'none'; // 保存ボタンを隠す
    
    secondsElapsed = 0;
    timerEl.textContent = "00:00";
    routeCoords = [];
    polyline.setLatLngs([]);
    polyline.setStyle({color: '#2196F3'}); // 通常の色
    
    timerInterval = setInterval(() => {
      secondsElapsed++;
      timerEl.textContent = formatTime(secondsElapsed);
    }, 1000);

    startTracking();
  } else {
    // 停止
    const endTime = new Date();
    // 1分(60秒)未満は保存しない
    if (secondsElapsed < 60) {
      alert("1分未満の散歩は記録されません。");
      resetUI();
    } else {
      stopWalking();
      savePathBtn.style.display = 'block'; // 保存ボタンを表示
      // 停止時に記録用のデータを一時保持
      window.lastWalk = { start: startTime, end: endTime, duration: formatTime(secondsElapsed), coords: [...routeCoords] };
    }
  }
});

// 「経路を保存」ボタン
savePathBtn.addEventListener('click', () => {
  if (!window.lastWalk) return;
  
  // 経路を真紅色にする
  polyline.setStyle({color: '#dc143c'});
  
  // 記録を保存
  const records = JSON.parse(localStorage.getItem('walk_records')) || [];
  const walkId = "path_" + Date.now();
  
  records.push({
    id: walkId,
    date: window.lastWalk.start.toLocaleDateString(),
    start: window.lastWalk.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    end: window.lastWalk.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    duration: window.lastWalk.duration
  });
  
  localStorage.setItem('walk_records', JSON.stringify(records));
  // 経路座標データを「ファイル」として保存
  localStorage.setItem(walkId, JSON.stringify(window.lastWalk.coords));
  
  alert("経路を真紅色で表示し、保存しました！");
  savePathBtn.style.display = 'none';
});

function resetUI() {
  isWalking = false;
  startStopBtn.textContent = '開始';
  startStopBtn.classList.replace('stop', 'start');
  clearInterval(timerInterval);
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

function stopWalking() {
  clearInterval(timerInterval);
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  isWalking = false;
  startStopBtn.textContent = '開始';
  startStopBtn.classList.replace('stop', 'start');
}

// カレンダー表示
calendarBtn.addEventListener('click', () => {
  recordList.innerHTML = '';
  const records = JSON.parse(localStorage.getItem('walk_records')) || [];
  if (records.length === 0) {
    recordList.innerHTML = '<li>記録がありません(1分以上歩いて保存してください)</li>';
  } else {
    records.reverse().forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="record-info">
          <span>${r.date} (${r.start}〜${r.end})</span>
          <span>⏱️ ${r.duration}</span>
        </div>
        <button class="path-view-btn" onclick="viewSavedPath('${r.id}')">経路を表示</button>
      `;
      recordList.appendChild(li);
    });
  }
  calendarModal.classList.remove('hidden');
});

// 保存された経路を地図に再表示
window.viewSavedPath = function(id) {
  const coords = JSON.parse(localStorage.getItem(id));
  if (coords && coords.length > 0) {
    polyline.setLatLngs(coords);
    polyline.setStyle({color: '#dc143c'}); // 保存されたものは真紅色
    map.fitBounds(polyline.getBounds());
    calendarModal.classList.add('hidden');
  } else {
    alert("経路データが見つかりません。");
  }
};

closeCalendarBtn.addEventListener('click', () => calendarModal.classList.add('hidden'));
window.onload = initMap;
