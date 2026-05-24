// ===== 摄像头管理 =====
let videoStream = null;
let currentCamera = 'environment';
let currentData = null;
let isScanning = false;

// 更新时间
function updateTime() {
  const now = new Date();
  const t = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
  document.getElementById('currentTime').textContent = t;
}
updateTime();
setInterval(updateTime, 10000);

// 启动摄像头
async function startCamera(facingMode) {
  try {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    const constraints = {
      video: {
        facingMode: facingMode || currentCamera,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoStream = stream;
    const video = document.getElementById('cameraFeed');
    video.srcObject = stream;
    await video.play();
    document.getElementById('permitOverlay').classList.add('hidden');
    document.getElementById('scanStatusText').textContent = '将待分拣物料置于扫描框内';
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      document.getElementById('permitOverlay').classList.remove('hidden');
    } else if (err.name === 'NotFoundError') {
      document.getElementById('scanStatusText').textContent = '未检测到摄像头';
    } else {
      document.getElementById('scanStatusText').textContent = '摄像头启动失败: ' + err.message;
    }
  }
}

// 切换摄像头
function switchCamera() {
  currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
  startCamera(currentCamera);
}

// 请求权限
async function requestPermission() {
  await startCamera('environment');
}

// 从相册选取
function pickFromGallery() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      currentData = MOCK_DATA[Math.floor(Math.random() * MOCK_DATA.length)];
      showResult();
    }
  };
  input.click();
}

// 扫描阶段定义
const SCAN_PHASES = [
  { progress: 15, text: '正在提取物料特征...' },
  { progress: 30, text: '分析纹理与结构...' },
  { progress: 45, text: '识别材质成分...' },
  { progress: 60, text: '检测附件及辅料...' },
  { progress: 75, text: '评估拆解方案...' },
  { progress: 88, text: '匹配库存分类...' },
  { progress: 100, text: '识别完成' }
];

// 开始扫描
function startScan() {
  if (isScanning) return;
  if (!videoStream) {
    startCamera('environment');
    return;
  }
  isScanning = true;

  currentData = MOCK_DATA[Math.floor(Math.random() * MOCK_DATA.length)];

  const overlay = document.getElementById('scanningOverlay');
  overlay.classList.remove('hidden');

  const progressBar = document.getElementById('progressBar');
  const detailEl = document.getElementById('scanningDetail');
  progressBar.style.width = '0%';
  detailEl.textContent = '准备识别...';

  // 更新扫描统计
  const video = document.getElementById('cameraFeed');
  if (video && video.videoWidth) {
    document.getElementById('statResolution').textContent = video.videoWidth + '×' + video.videoHeight;
  } else {
    document.getElementById('statResolution').textContent = '加载中';
  }
  document.getElementById('statFrames').textContent = '24 fps';

  // 模拟进度
  let phaseIdx = 0;
  const phaseInterval = setInterval(() => {
    if (phaseIdx >= SCAN_PHASES.length) {
      clearInterval(phaseInterval);
      return;
    }
    const phase = SCAN_PHASES[phaseIdx];
    progressBar.style.width = phase.progress + '%';
    detailEl.textContent = phase.text;
    phaseIdx++;
  }, 350);

  setTimeout(() => {
    clearInterval(phaseInterval);
    progressBar.style.width = '100%';
    detailEl.textContent = '识别完成';
    setTimeout(() => {
      overlay.classList.add('hidden');
      isScanning = false;
      showResult();
    }, 500);
  }, SCAN_PHASES.length * 350 + 300);
}

// 显示结果
function showResult() {
  if (!currentData) return;
  const d = currentData;

  document.getElementById('itemEmoji').textContent = d.emoji;
  document.getElementById('itemName').textContent = d.name;
  document.getElementById('itemTag').textContent = d.type;

  document.getElementById('infoType').textContent = d.type;
  document.getElementById('infoFabric').textContent = d.fabric;
  document.getElementById('infoDisassemble').textContent = d.disassemble;
  document.getElementById('infoCategory').textContent = d.category;

  const icons = ['◫', '▦', '◈', '▣'];
  d.materials.forEach((mat, i) => {
    const imgEl = document.getElementById('mat' + (i + 1));
    const labelEl = document.getElementById('matLabel' + (i + 1));
    if (imgEl) {
      imgEl.textContent = icons[i] || '◈';
      imgEl.style.background = `linear-gradient(135deg, ${mat.color}, ${adjustColor(mat.color, 25)})`;
    }
    if (labelEl) labelEl.textContent = mat.label;
  });

  const badge = document.getElementById('confidenceBadge');
  const confValue = document.getElementById('confidenceValue');
  confValue.textContent = '0%';

  setTimeout(() => {
    confValue.textContent = d.confidence + '%';
    badge.classList.add('animate');
  }, 400);

  document.getElementById('resultOverlay').classList.remove('hidden');
  if (navigator.vibrate) navigator.vibrate(30);
}

function closeResult() {
  document.getElementById('resultOverlay').classList.add('hidden');
  currentData = null;
}

function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
  const b = Math.min(255, (num & 0x0000FF) + percent);
  return `rgb(${r}, ${g}, ${b})`;
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (!document.getElementById('resultOverlay').classList.contains('hidden')) {
      closeResult();
    } else if (!document.getElementById('scanningOverlay').classList.contains('hidden')) {
    } else {
      startScan();
    }
  }
  if (e.key === 'Escape') closeResult();
});

// 自动启动摄像头
document.addEventListener('DOMContentLoaded', () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    startCamera('environment');
  } else {
    document.getElementById('permitOverlay').classList.remove('hidden');
    document.getElementById('permit-desc').textContent = '当前设备不支持摄像头访问';
  }
});
