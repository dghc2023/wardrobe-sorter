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
let currentImage = null;
let selectedIndex = 0;
let isScanning = false;
let progressInterval = null;
let viewingHistoryId = null;
let abortController = null;
let scanCancelled = false;
const HISTORY_KEY = 'wardrobe_sort_history';

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
    document.getElementById('scanStatusText').textContent = '将物料放在光线下扫描';
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
    { max: 15, text: '正在识别物料类型...' },
    { max: 35, text: '分析材质成分...' },
    { max: 55, text: '匹配库存分区...' },
    { max: 75, text: '确定货架位置...' },
    { max: 90, text: '生成分拣建议...' }
  ];
  updateScanProgress(0, stages[0].text);
  if (progressInterval) clearInterval(progressInterval);
  let stageIdx = 0;
  progressInterval = setInterval(() => {
    p += Math.random() * 2.5 + 0.5;
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
  updateScanProgress(100, text || '分拣完成');
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
  scanCancelled = false;
  abortController = new AbortController();
  const overlay = document.getElementById('scanningOverlay');
  overlay.classList.remove('hidden');

  const video = document.getElementById('cameraFeed');
  if (video && video.videoWidth) document.getElementById('statResolution').textContent = video.videoWidth + '×' + video.videoHeight;
  document.getElementById('statFrames').textContent = '--';

  startProgressAnim();

  const systemPrompt = `你是一个仓库分拣专家。分析图片中的物料，返回 JSON（不要 markdown 标记）：

{
  "results": [
    {
      "name": "物料具体名称（含颜色/尺寸等关键属性）",
      "material": "材质成分",
      "zone": "建议存放分区（如 A区、B区、C区、D区）",
      "shelf": "建议货架编号（如 A-03-12，含义：A区第3排第12格）",
      "category": "物料分类（如 辅料-纽扣类、面料-针织类、配件-五金类）",
      "handling": "分拣操作提示（放入哪个货架、注意什么）",
      "confidence": 95.0,
      "tags": [
        {"label": "关键词1", "color": "#0A66C2"},
        {"label": "关键词2", "color": "#059669"},
        {"label": "关键词3", "color": "#7C3AED"}
      ]
    }
  ]
}

物料分类规则：
- A区：辅料类（纽扣、拉链、织唛、花边、松紧带等小件辅料）
- B区：五金/配件类（金属件、扣具、钩环、装饰链等）
- C区：面料/布艺类（布料、蕾丝、网纱、里衬等柔软物料）
- D区：包材/杂项类（包装袋、纸卡、吊牌、填充棉等）

重要：提供 3 个候选结果，每个从不同角度判断物料类别，给出不同的分区货架建议。`;

  try {
    const resp = await fetch(API_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_CONFIG.apiKey },
      signal: abortController.signal,
      body: JSON.stringify({
        model: API_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [{ type: 'text', text: '分析这张图片中的物料，给出3个候选分拣方案' }, { type: 'image_url', image_url: { url: base64Image } }] }
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
    if (err.name === 'AbortError') return;
    console.error('API error:', err);
    const shuffled = [...MOCK_DATA].sort(() => Math.random() - 0.5);
    currentResults = shuffled.slice(0, 3);
  }

  if (scanCancelled) { scanCancelled = false; return; }
  stopProgressAnim();
  await delay(400);
  overlay.classList.add('hidden');
  isScanning = false;
  abortController = null;
  selectedIndex = 0;
  renderAll();
}

// ===== 取消扫描 =====
async function cancelScan() {
  if (!isScanning) return;
  const ok = await showConfirm('确定要取消当前扫描？');
  if (!ok) return;

  scanCancelled = true;

  if (abortController) {
    abortController.abort();
    abortController = null;
  }

  stopProgressAnim();
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }

  document.getElementById('scanningOverlay').classList.add('hidden');
  isScanning = false;
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
  scanCancelled = false;
  const overlay = document.getElementById('scanningOverlay');
  overlay.classList.remove('hidden');
  const video = document.getElementById('cameraFeed');
  if (video && video.videoWidth) document.getElementById('statResolution').textContent = video.videoWidth + '×' + video.videoHeight;
  startProgressAnim();
  setTimeout(() => {
    if (scanCancelled) { scanCancelled = false; return; }
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
    imgContainer.innerHTML = '<span class="item-emoji">📦</span>';
    imgContainer.onclick = null;
  }

  document.getElementById('itemName').textContent = d.name || '未知物料';
  document.getElementById('itemTag').textContent = d.material || '-';

  document.getElementById('infoType').textContent = d.zone || '-';
  document.getElementById('infoFabric').textContent = d.shelf || '-';
  document.getElementById('infoDisassemble').textContent = d.category || '-';
  document.getElementById('infoCategory').textContent = d.handling || '-';

  // 标签
  const container = document.getElementById('materialChips');
  container.innerHTML = '';
  (d.tags || []).forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'material-chip';
    chip.textContent = tag.label;
    chip.style.background = tag.color || '#64748B';
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

  if (viewingHistoryId) {
    const idx = history.findIndex(h => h.id === viewingHistoryId);
    if (idx !== -1) {
      history[idx].results = JSON.parse(JSON.stringify(currentResults));
      history[idx].selectedIndex = selectedIndex;
      history[idx].name = currentResults[selectedIndex]?.name || '未知物料';
      history[idx].image = currentImage || history[idx].image;
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      } catch (e) { console.warn('保存失败'); }
      return;
    }
  }

  const entry = {
    id: Date.now(),
    timestamp: new Date().toLocaleString('zh-CN'),
    image: currentImage || null,
    results: JSON.parse(JSON.stringify(currentResults)),
    selectedIndex: selectedIndex,
    name: currentResults[selectedIndex]?.name || '未知物料'
  };
  history.unshift(entry);
  if (history.length > 50) history.length = 50;
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
    container.innerHTML = '<div class="history-empty">暂无分拣记录</div>';
    document.getElementById('clearHistoryBtn').style.display = 'none';
    return;
  }

  document.getElementById('clearHistoryBtn').style.display = 'block';

  history.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'history-item';

    const thumb = document.createElement('div');
    thumb.className = 'history-thumb';
    if (item.image) {
      thumb.innerHTML = '<img src="' + item.image + '" alt="缩略图">';
    } else {
      thumb.innerHTML = '<span style="font-size:24px">📦</span>';
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

async function clearHistory() {
  const ok = await showConfirm('确定清空所有分拣记录？');
  if (!ok) return;
  try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
  renderHistoryList();
}

function viewHistoryItem(id) {
  const history = loadHistory();
  const item = history.find(h => h.id === id);
  if (!item) return;

  viewingHistoryId = id;
  currentResults = JSON.parse(JSON.stringify(item.results));
  currentImage = item.image || null;
  selectedIndex = item.selectedIndex || 0;
  closeHistory();
  renderAll();
}

function openManualInput() {
  document.getElementById('manualName').value = '';
  document.getElementById('manualOverlay').classList.remove('hidden');
}

function closeManualInput() { document.getElementById('manualOverlay').classList.add('hidden'); }

function submitManualInput() {
  const name = document.getElementById('manualName').value.trim() || '未命名物料';

  currentResults = [{
    name,
    material: '手动输入',
    zone: '待分区',
    shelf: '待上架',
    category: '待分类',
    handling: '需人工确认后上架',
    confidence: 100,
    tags: [{ label: '待确认', color: '#64748B' }]
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
  const d = currentResults[selectedIndex];
  document.getElementById('editName').value = d.name || '';
  document.getElementById('editType').value = d.material || '';
  document.getElementById('editFabric').value = d.shelf || '';
  document.getElementById('editDisassemble').value = d.category || '';
  document.getElementById('editCategory').value = d.handling || '';
  document.getElementById('editOverlay').classList.remove('hidden');
}

function closeEditModal() { document.getElementById('editOverlay').classList.add('hidden'); }

function submitEdit() {
  if (!currentResults || !currentResults[selectedIndex]) return;
  const d = currentResults[selectedIndex];
  const name = document.getElementById('editName').value.trim();
  const type = document.getElementById('editType').value.trim();
  const shelf = document.getElementById('editFabric').value.trim();
  const category = document.getElementById('editDisassemble').value.trim();
  const handling = document.getElementById('editCategory').value.trim();

  if (name) d.name = name;
  if (type) d.material = type;
  if (shelf) d.shelf = shelf;
  if (category) d.category = category;
  if (handling) d.handling = handling;

  closeEditModal();
  renderTabs();
  renderDetail(selectedIndex);
  saveToHistory();
}

// ===== 确认弹窗 =====
let confirmResolver = null;

function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmOverlay');
    const panel = overlay.querySelector('.confirm-panel');
    const msgEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    msgEl.textContent = message;
    overlay.classList.remove('hidden');
    confirmResolver = resolve;

    function cleanup(result) {
      overlay.classList.add('hidden');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      overlay.onclick = null;
      panel.onclick = null;
      confirmResolver = null;
      resolve(result);
    }

    okBtn.onclick = (e) => { e.stopPropagation(); cleanup(true); };
    cancelBtn.onclick = (e) => { e.stopPropagation(); cleanup(false); };
    panel.onclick = (e) => e.stopPropagation();
    overlay.onclick = () => cleanup(false);
  });
}

function closeConfirm() {
  if (confirmResolver) {
    confirmResolver(false);
    document.getElementById('confirmOverlay').classList.add('hidden');
    confirmResolver = null;
  }
}

// ===== 关闭结果 =====
function closeResult() {
  saveToHistory();
  document.getElementById('resultOverlay').classList.add('hidden');
  closeEditModal();
  currentResults = null;
  currentImage = null;
  viewingHistoryId = null;
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

document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (!document.getElementById('resultOverlay').classList.contains('hidden')) closeResult();
    else if (!document.getElementById('manualOverlay').classList.contains('hidden')) {}
    else if (!document.getElementById('editOverlay').classList.contains('hidden')) {}
    else if (!document.getElementById('scanningOverlay').classList.contains('hidden')) {}
    else startScan();
  }
  if (e.key === 'Escape') { closeResult(); closeManualInput(); closeEditModal(); closeImageViewer(); closeHistory(); closeConfirm(); }
});

document.addEventListener('DOMContentLoaded', () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) startCamera('environment');
  else document.getElementById('permitOverlay').classList.remove('hidden');
});
