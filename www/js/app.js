// ===== 应用主逻辑 =====
let currentData = null;
let isScanning = false;

// 更新时间显示
function updateTime() {
  const now = new Date();
  const t = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
  document.getElementById('currentTime').textContent = t;
}
updateTime();
setInterval(updateTime, 10000);

// 扫描阶段描述
const SCAN_PHASES = [
  { progress: 15, text: '正在提取面料特征...' },
  { progress: 30, text: '分析织物纹理结构...' },
  { progress: 45, text: '识别纤维成分比例...' },
  { progress: 60, text: '检测附件及辅料...' },
  { progress: 75, text: '评估拆解方案...' },
  { progress: 88, text: '匹配库存分类规则...' },
  { progress: 100, text: '识别完成' }
];

// 开始扫描
function startScan() {
  if (isScanning) return;
  isScanning = true;

  // 选中随机数据集
  currentData = MOCK_DATA[Math.floor(Math.random() * MOCK_DATA.length)];

  // 显示扫描遮罩
  const overlay = document.getElementById('scanningOverlay');
  overlay.classList.remove('hidden');

  // 重置进度条
  const progressBar = document.getElementById('progressBar');
  const detailEl = document.getElementById('scanningDetail');
  progressBar.style.width = '0%';
  detailEl.textContent = '准备识别...';

  // 模拟扫描进度
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

  // 扫描完成
  setTimeout(() => {
    clearInterval(phaseInterval);
    progressBar.style.width = '100%';
    detailEl.textContent = '识别完成';

    // 延迟关闭遮罩并显示结果
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

  // 物品预览
  const itemImg = document.getElementById('itemImage');
  itemImg.textContent = d.emoji;
  document.getElementById('itemName').textContent = d.name;

  // 信息填充
  document.getElementById('infoType').textContent = d.type;
  document.getElementById('infoFabric').textContent = d.fabric;
  document.getElementById('infoDisassemble').textContent = d.disassemble;
  document.getElementById('infoCategory').textContent = d.category;

  // 素材拆解图
  const materialEmojis = ['◫', '▦', '◈', '▣'];
  d.materials.forEach((mat, i) => {
    const imgEl = document.getElementById('mat' + (i + 1));
    const labelEl = document.getElementById('matLabel' + (i + 1));
    if (imgEl) {
      imgEl.textContent = materialEmojis[i] || '◈';
      imgEl.style.background = `linear-gradient(135deg, ${mat.color}, ${adjustColor(mat.color, 30)})`;
    }
    if (labelEl) labelEl.textContent = mat.label;
  });

  // 置信度动画
  const confFill = document.getElementById('confidenceFill');
  const confValue = document.getElementById('confidenceValue');
  confFill.style.width = '0%';
  confValue.textContent = '0%';

  setTimeout(() => {
    confFill.style.width = d.confidence + '%';
    confValue.textContent = d.confidence + '%';
  }, 200);

  // 显示结果面板
  document.getElementById('resultOverlay').classList.remove('hidden');
}

// 关闭结果
function closeResult() {
  document.getElementById('resultOverlay').classList.add('hidden');
  currentData = null;
}

// 辅助：调整颜色亮度
function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
  const b = Math.min(255, (num & 0x0000FF) + percent);
  return `rgb(${r}, ${g}, ${b})`;
}

// 设备震动反馈（如果支持）
function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    if (!document.getElementById('resultOverlay').classList.contains('hidden')) {
      closeResult();
    } else if (!document.getElementById('scanningOverlay').classList.contains('hidden')) {
      // 扫描中忽略
    } else {
      startScan();
    }
  }
  if (e.key === 'Escape') closeResult();
});
