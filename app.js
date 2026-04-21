let map, polyline;
let routeCoords = [];
let watchId = null;
let timerInterval = null;
let secondsElapsed = 0;
let isWalking = false;

const timerEl = document.getElementById('timer');
const startStopBtn = document.getElementById('start-stop-btn');
const calendarBtn = document.getElementById('calendar-btn');
const closeCalendarBtn = document.getElementById('close-calendar-btn');
const calendarModal = document.getElementById('calendar-modal');
const recordList = document.getElementById('record-list');

// 1. 地図の土台だけ作成（ここでは権限を求めない）
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

// 2. 「開始」ボタンを押したときに初めて位置情報を要求
function startTracking() {
  if (!navigator.geolocation) {
    alert("このブラウザは位置情報に対応していません。");
    return;
  }

  watchId = navigator.geolocation.watchPosition(position => {
    const latLng = [position.coords.latitude, position.coords.longitude];
    
    // 初回だけ現在地にジャンプ
    if (routeCoords.length === 0) {
      map.setView(latLng, 17);
    }

    routeCoords.push(latLng);
    polyline.setLatLngs(routeCoords);
    map.panTo(latLng);
  }, error => {
    let msg = "";
    switch(error.code) {
      case error.PERMISSION_DENIED: msg = "位置情報の利用が拒否されました。設定を確認してください。"; break;
      case error.POSITION_UNAVAILABLE: msg = "位置情報が利用できません。"; break;
      case error.TIMEOUT: msg = "タイムアウトしました。"; break;
      default: msg = "エラーが発生しました。"; break;
    }
    alert(msg);
    stopWalking(); // エラー時は停止状態に戻す
  }, { 
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0 
  });
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function stopWalking() {
  isWalking = false;
  startStopBtn.textContent = '開始';
  startStopBtn.classList.replace('stop', 'start');
  clearInterval(timerInterval);
  stopTracking();
}

startStopBtn.addEventListener('click', () => {
  if (!isWalking) {
    isWalking = true;
    startStopBtn.textContent = '停止';
    startStopBtn.classList.replace('start', 'stop');
    
    secondsElapsed = 0;
    timerEl.textContent = "00:00";
    routeCoords = [];
    polyline.setLatLngs([]);
    
    timerInterval = setInterval(() => {
      secondsElapsed++;
      timerEl.textContent = formatTime(secondsElapsed);
    }, 1000);

    startTracking(); // ここで権限を要求
  } else {
    saveRecord();
    stopWalking();
  }
});

function saveRecord() {
  if (secondsElapsed < 5) return; // 短すぎる記録は無視
  const records = JSON.parse(localStorage.getItem('walk_records')) || [];
  records.push({
    date: new Date().toISOString().split('T')[0],
    time: formatTime(secondsElapsed)
  });
  localStorage.setItem('walk_records', JSON.stringify(records));
}

calendarBtn.addEventListener('click', () => {
  recordList.innerHTML = '';
  const records = JSON.parse(localStorage.getItem('walk_records')) || [];
  if (records.length === 0) {
    recordList.innerHTML = '<li>記録がありません</li>';
  } else {
    records.reverse().forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${r.date}</span><span>⏱️ ${r.time}</span>`;
      recordList.appendChild(li);
    });
  }
  calendarModal.classList.remove('hidden');
});

closeCalendarBtn.addEventListener('click', () => calendarModal.classList.add('hidden'));

window.onload = initMap;
