// ===== 配置 =====
const API_CONFIG = {
  endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
  model: 'zai-org/GLM-4.5V',
  apiKey: 'sk-azemqaidnwggalhqwfdnkgygqxpgahpnmvzrzvhllnjfclin'
};

// ===== 状态 =====
let videoStream = null;
let currentCamera = 'environment';
let currentResults = null;
let currentImage = null; // 当前扫描的原图
let selectedIndex = 0;
let isScanning = false;
let progressInterval = null;
const HISTORY_KEY = 'wardrobe_scan_history';

function updateTime() {
  const t = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
  document.getElementById('currentTime').textContent = t;
}
updateTime();
setInterval(updateTime, 10000);

// ===== 摄像头 =====
async function startCamera(facingMode) {
  try {
    if (videoStream) videoStream.getTracks().forEach(t => t.stop());
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode || currentCamera, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
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
      document.getElementById('scanStatusText').textContent = '摄像头启动失败';
    }
  }
}

function switchCamera() { currentCamera = currentCamera === 'environment' ? 'user' : 'environment'; startCamera(currentCamera); }
async function requestPermission() { await startCamera('environment'); }

function pickFromGallery() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const r = new FileReader();
      r.onload = () => { currentImage = r.result; recognizeImage(r.result); };
      r.readAsDataURL(file);
    }
  };
  input.click();
}

function captureFrame() {
  const v = document.getElementById('cameraFeed');
  if (!v || !v.videoWidth) return null;
  const c = document.createElement('canvas');
  const scale = Math.min(1, 1024 / v.videoWidth);
  c.width = Math.round(v.videoWidth * scale);
  c.height = Math.round(v.videoHeight * scale);
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

// ===== 进度条 =====
function startProgressAnim() {
  let p = 0;
  const stages = [
    { max: 12, text: '正在提取物料特征...' },
    { max: 30, text: '分析纹理与结构...' },
    { max: 50, text: '识别材质成分...' },
    { max: 65, text: '检测附件及辅料...' },
    { max: 80, text: '评估拆解方案...' },
    { max: 90, text: '匹配库存分类...' }
  ];
  updateScanProgress(0, stages[0].text);
  if (progressInterval) clearInterval(progressInterval);
  let stageIdx = 0;
  progressInterval = setInterval(() => {
    p += Math.random() * 2.5 + 0.5;
    // 进入下一阶段
    if (stageIdx < stages.length - 1 && p >= stages[stageIdx].max) {
      stageIdx++;
      updateScanProgress(null, stages[stageIdx].text);
    }
    if (p > 90) p = 90;
    updateScanProgress(Math.round(p), null);
  }, 300);
}

function stopProgressAnim(text) {
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
  updateScanProgress(100, text || '识别完成');
}

function updateScanProgress(progress, text) {
  const bar = document.getElementById('progressBar');
  const detail = document.getElementById('scanningDetail');
  if (bar && progress !== null) bar.style.width = progress + '%';
  if (detail && text !== null) detail.textContent = text;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== API 识别 =====
async function recognizeImage(base64Image) {
  isScanning = true;
  const overlay = document.getElementById('scanningOverlay');
  overlay.classList.remove('hidden');

  const video = document.getElementById('cameraFeed');
  if (video && video.videoWidth) document.getElementById('statResolution').textContent = video.videoWidth + '×' + video.videoHeight;
  document.getElementById('statFrames').textContent = '--';

  startProgressAnim();

  // 强调多样性的 prompt
  const systemPrompt = `你是一个服装面料分析专家。分析图片中的服装/面料，返回 JSON（不要 markdown 标记）：

{
  "results": [
    {
      "name": "服装具体名称",
      "type": "成衣种类/版型",
      "fabric": "面料成分及比例",
      "disassemble": "拆解回收方案（分步骤）",
      "category": "库存分类建议",
      "confidence": 95.0,
      "materials": [
        {"label": "面料组成", "color": "#2a4a7a"},
        {"label": "面料组成", "color": "#3a5a8a"},
        {"label": "辅料名称", "color": "#c0a060"},
        {"label": "辅料名称", "color": "#6a7a8a"}
      ]
    }
  ]
}

重要：提供 3 个候选结果，它们必须是不同类型的服装/面料，不能都是同一个品类（例如：不能全是卫衣或全是连衣裙）。每个候选要从不同角度分析可能性，给出截然不同的分类判断。`;

  try {
    const resp = await fetch(API_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_CONFIG.apiKey },
      body: JSON.stringify({
        model: API_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [{ type: 'text', text: '分析这张图片，给出3个不同类型的候选结果' }, { type: 'image_url', image_url: { url: base64Image } }] }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });
    const data = await resp.json();
    let parsed = null;
    if (data.choices && data.choices[0]) {
      let content = data.choices[0].message.content;
      const m = content.match(/\[[\s\S]*\]/);
      if (m) { const arr = JSON.parse(m[0]); if (Array.isArray(arr) && arr.length > 0) parsed = arr; }
    }
    if (parsed) { currentResults = parsed; }
    else { throw new Error('parse fail'); }
  } catch (err) {
    console.error('API error:', err);
    const shuffled = [...MOCK_DATA].sort(() => Math.random() - 0.5);
    currentResults = shuffled.slice(0, 3);
  }

  stopProgressAnim();
  await delay(400);
  overlay.classList.add('hidden');
  isScanning = false;
  selectedIndex = 0;
  renderAll();
}

// ===== 开始扫描 =====
function startScan() {
  if (isScanning) return;
  if (!videoStream) { startCamera('environment'); return; }
  const img = captureFrame();
  if (img) { currentImage = img; recognizeImage(img); return; }
  currentImage = null;
  const shuffled = [...MOCK_DATA].sort(() => Math.random() - 0.5);
  currentResults = shuffled.slice(0, 3);
  selectedIndex = 0;
  showMockScan();
}

function showMockScan() {
  isScanning = true;
  const overlay = document.getElementById('scanningOverlay');
  overlay.classList.remove('hidden');
  const video = document.getElementById('cameraFeed');
  if (video && video.videoWidth) document.getElementById('statResolution').textContent = video.videoWidth + '×' + video.videoHeight;
  startProgressAnim();
  setTimeout(() => {
    stopProgressAnim();
    setTimeout(() => { overlay.classList.add('hidden'); isScanning = false; renderAll(); }, 400);
  }, 3000);
}

// ===== 渲染 =====
function renderAll() {
  if (!currentResults || currentResults.length === 0) return;
  renderTabs();
  renderDetail(selectedIndex);
  document.getElementById('resultOverlay').classList.remove('hidden');
  if (navigator.vibrate) navigator.vibrate(30);
}

function renderTabs() {
  const container = document.getElementById('resultTabs');
  container.innerHTML = '';
  currentResults.forEach((r, i) => {
    const tab = document.createElement('div');
    tab.className = 'result-tab' + (i === selectedIndex ? ' active' : '');
    tab.innerHTML = `<span>${r.name || '候选' + (i + 1)}</span><span class="tab-conf">${(r.confidence || 0).toFixed(1)}%</span>`;
    tab.onclick = () => selectResult(i);
    container.appendChild(tab);
  });
}

function selectResult(index) {
  selectedIndex = index;
  renderTabs();
  renderDetail(index);
}

// ===== 渲染详情 =====
function renderDetail(index) {
  const d = currentResults[index] || currentResults[0];

  // 原图显示
  const imgContainer = document.getElementById('itemImage');
  if (currentImage) {
    imgContainer.innerHTML = '<img src="' + currentImage + '" alt="扫描原图">';
    imgContainer.onclick = function() { openImageViewer(currentImage); };
  } else {
    imgContainer.innerHTML = '<span class="item-emoji">' + (d.emoji || '👕') + '</span>';
    imgContainer.onclick = null;
  }

  document.getElementById('itemName').textContent = d.name || '未知物料';
  document.getElementById('itemTag').textContent = d.type || '-';

  document.getElementById('infoType').textContent = d.type || '-';
  document.getElementById('infoFabric').textContent = d.fabric || '-';
  document.getElementById('infoDisassemble').textContent = d.disassemble || '-';
  document.getElementById('infoCategory').textContent = d.category || '-';

  // 素材拆解 → 文字 chips
  const container = document.getElementById('materialChips');
  container.innerHTML = '';
  (d.materials || []).forEach(mat => {
    const chip = document.createElement('span');
    chip.className = 'material-chip';
    chip.textContent = mat.label;
    chip.style.background = mat.color || '#64748B';
    container.appendChild(chip);
  });

  const cv = document.getElementById('confidenceValue');
  cv.textContent = '0%';
  setTimeout(() => { cv.textContent = (d.confidence || 92).toFixed(1) + '%'; }, 400);
}

// ===== 历史记录 =====
function saveToHistory() {
  if (!currentResults || currentResults.length === 0) return;
  const history = loadHistory();
  const entry = {
    id: Date.now(),
    timestamp: new Date().toLocaleString('zh-CN'),
    image: currentImage || null,
    results: JSON.parse(JSON.stringify(currentResults)),
    selectedIndex: selectedIndex,
    name: currentResults[selectedIndex]?.name || '未知物料'
  };
  history.unshift(entry);
  if (history.length > 50) history.length = 50; // 最多保留50条
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('存储空间不足，尝试清理旧记录');
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
    } catch (e2) {}
  }
}

function loadHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function openHistory() {
  renderHistoryList();
  document.getElementById('historyOverlay').classList.remove('hidden');
}

function closeHistory() {
  document.getElementById('historyOverlay').classList.add('hidden');
}

function renderHistoryList() {
  const container = document.getElementById('historyList');
  const history = loadHistory();
  container.innerHTML = '';

  if (history.length === 0) {
    container.innerHTML = '<div class="history-empty">暂无扫描记录</div>';
    document.getElementById('clearHistoryBtn').style.display = 'none';
    return;
  }

  document.getElementById('clearHistoryBtn').style.display = 'block';

  history.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'history-item';

    const thumb = document.createElement('div');
    thumb.className = 'history-thumb';
    if (item.image) {
      thumb.innerHTML = '<img src="' + item.image + '" alt="缩略图">';
    } else {
      thumb.innerHTML = '<span style="font-size:24px">👕</span>';
    }

    const info = document.createElement('div');
    info.className = 'history-info';
    info.innerHTML = '<div class="history-name">' + (item.name || '未知物料') + '</div>' +
      '<div class="history-time">' + (item.timestamp || '') + '</div>';

    const del = document.createElement('button');
    del.className = 'history-del';
    del.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    del.onclick = (e) => { e.stopPropagation(); deleteHistoryItem(item.id); };

    div.appendChild(thumb);
    div.appendChild(info);
    div.appendChild(del);
    div.onclick = () => viewHistoryItem(item.id);
    container.appendChild(div);
  });
}

function deleteHistoryItem(id) {
  const history = loadHistory().filter(h => h.id !== id);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}
  renderHistoryList();
}

function clearHistory() {
  if (!confirm('确定清空所有扫描记录？')) return;
  try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
  renderHistoryList();
}

function viewHistoryItem(id) {
  const history = loadHistory();
  const item = history.find(h => h.id === id);
  if (!item) return;

  currentResults = JSON.parse(JSON.stringify(item.results));
  currentImage = item.image || null;
  selectedIndex = item.selectedIndex || 0;
  closeHistory();
  renderAll();
}
function openManualInput() {
  ['manualName','manualType','manualFabric','manualDisassemble','manualCategory'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('manualOverlay').classList.remove('hidden');
}

function closeManualInput() { document.getElementById('manualOverlay').classList.add('hidden'); }

function submitManualInput() {
  const name = document.getElementById('manualName').value.trim() || '未命名物料';
  const type = document.getElementById('manualType').value.trim() || '未分类';
  const fabric = document.getElementById('manualFabric').value.trim() || '未指定';
  const disassemble = document.getElementById('manualDisassemble').value.trim() || '待确认';
  const category = document.getElementById('manualCategory').value.trim() || '未分类';

  currentResults = [{
    name, type, fabric, disassemble, category, confidence: 100,
    materials: [{ label: '待确认', color: '#64748B' }]
  }];
  currentImage = null;
  selectedIndex = 0;
  closeManualInput();
  document.getElementById('resultOverlay').classList.add('hidden');
  closeEditModal();
  setTimeout(() => renderAll(), 100);
}

// ===== 编辑弹窗 =====
function openEditModal() {
  if (!currentResults || !currentResults[selectedIndex]) return;
  document.getElementById('editName').value = currentResults[selectedIndex].name || '';
  document.getElementById('editOverlay').classList.remove('hidden');
}

function closeEditModal() { document.getElementById('editOverlay').classList.add('hidden'); }

function submitEdit() {
  if (!currentResults || !currentResults[selectedIndex]) return;
  const name = document.getElementById('editName').value.trim();
  if (name) currentResults[selectedIndex].name = name;
  closeEditModal();
  renderTabs();
  renderDetail(selectedIndex);
}

// ===== 关闭结果 =====
function closeResult() {
  saveToHistory();
  document.getElementById('resultOverlay').classList.add('hidden');
  closeEditModal();
  currentResults = null;
  currentImage = null;
}

// ===== 大图查看 =====
function openImageViewer(src) {
  if (!src) return;
  document.getElementById('viewerImage').src = src;
  document.getElementById('imageViewer').classList.remove('hidden');
}

function closeImageViewer() {
  document.getElementById('imageViewer').classList.add('hidden');
  document.getElementById('viewerImage').src = '';
}

function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
  const b = Math.min(255, (num & 0x0000FF) + percent);
  return `rgb(${r}, ${g}, ${b})`;
}

document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (!document.getElementById('resultOverlay').classList.contains('hidden')) closeResult();
    else if (!document.getElementById('manualOverlay').classList.contains('hidden')) {}
    else if (!document.getElementById('editOverlay').classList.contains('hidden')) {}
    else if (!document.getElementById('scanningOverlay').classList.contains('hidden')) {}
    else startScan();
  }
  if (e.key === 'Escape') { closeResult(); closeManualInput(); closeEditModal(); closeImageViewer(); closeHistory(); }
});

document.addEventListener('DOMContentLoaded', () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) startCamera('environment');
  else document.getElementById('permitOverlay').classList.remove('hidden');
});
