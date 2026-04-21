// 変数初期化
let map, polyline;
let routeCoords = [];
let watchId = null;

let timerInterval = null;
let secondsElapsed = 0;
let isWalking = false;

// DOM要素
const timerEl = document.getElementById('timer');
const startStopBtn = document.getElementById('start-stop-btn');
const calendarBtn = document.getElementById('calendar-btn');
const closeCalendarBtn = document.getElementById('close-calendar-btn');
const calendarModal = document.getElementById('calendar-modal');
const recordList = document.getElementById('record-list');

// === 地図の初期化 (Leaflet) ===
function initMap() {
  // デフォルトは東京駅周辺
  map = L.map('map').setView([35.681236, 139.767125], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  polyline = L.polyline([], { color: '#2196F3', weight: 5 }).addTo(map);

  // 現在地を取得してマップの中心を移動
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      map.setView([position.coords.latitude, position.coords.longitude], 16);
    }, () => {
      console.warn("位置情報が取得できませんでした。");
    });
  }
}

// === タイマーと記録機能 ===
function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimer() {
  secondsElapsed++;
  timerEl.textContent = formatTime(secondsElapsed);
}

function saveRecord() {
  if (secondsElapsed === 0) return; // 0秒なら保存しない

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = formatTime(secondsElapsed);

  const newRecord = { date: dateStr, time: timeStr };
  
  // localStorageから既存データを取得
  let records = JSON.parse(localStorage.getItem('walk_records')) || [];
  records.push(newRecord);
  localStorage.setItem('walk_records', JSON.stringify(records));
}

// === 位置情報（ルート描画）の追跡 ===
function startTracking() {
  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(position => {
      const latLng = [position.coords.latitude, position.coords.longitude];
      routeCoords.push(latLng);
      polyline.setLatLngs(routeCoords);
      map.panTo(latLng);
    }, error => {
      console.warn("追跡エラー:", error);
    }, { enableHighAccuracy: true });
  }
}

function stopTracking() {
  if (navigator.geolocation && watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

// === ボタンイベント ===
startStopBtn.addEventListener('click', () => {
  if (!isWalking) {
    // 開始処理
    isWalking = true;
    startStopBtn.textContent = '停止';
    startStopBtn.classList.replace('start', 'stop');
    
    secondsElapsed = 0;
    timerEl.textContent = "00:00";
    routeCoords = [];
    polyline.setLatLngs([]);
    
    timerInterval = setInterval(updateTimer, 1000);
    startTracking();
  } else {
    // 停止処理
    isWalking = false;
    startStopBtn.textContent = '開始';
    startStopBtn.classList.replace('stop', 'start');
    
    clearInterval(timerInterval);
    stopTracking();
    saveRecord();
  }
});

// === カレンダー機能 ===
function loadRecords() {
  recordList.innerHTML = '';
  const records = JSON.parse(localStorage.getItem('walk_records')) || [];
  
  if (records.length === 0) {
    recordList.innerHTML = '<li>記録がありません</li>';
    return;
  }

  // 新しい記録を上に表示
  records.reverse().forEach(record => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${record.date}</span><span>⏱️ ${record.time}</span>`;
    recordList.appendChild(li);
  });
}

calendarBtn.addEventListener('click', () => {
  loadRecords();
  calendarModal.classList.remove('hidden');
});

closeCalendarBtn.addEventListener('click', () => {
  calendarModal.classList.add('hidden');
});

// 起動時にマップ初期化
window.onload = initMap;
