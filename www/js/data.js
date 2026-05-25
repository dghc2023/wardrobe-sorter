// ===== Mock 数据集 - 仓库分拣物料 =====
const MOCK_DATA = [
  {
    id: 1,
    name: '塑料四眼纽扣 (白色 15mm)',
    material: '塑料/聚酯',
    zone: 'A区',
    shelf: 'A-03-12',
    category: '辅料-纽扣类',
    handling: '放入A区第3排第12格，与同类白色纽扣合并',
    confidence: 96.8,
    tags: [
      { label: '纽扣', color: '#0A66C2' },
      { label: '塑料', color: '#059669' },
      { label: '白色', color: '#6B7280' }
    ]
  },
  {
    id: 2,
    name: '金属拉链 (YKK 30cm 古铜色)',
    material: '金属/锌合金+聚酯',
    zone: 'B区',
    shelf: 'B-02-08',
    category: '辅料-拉链类',
    handling: '放入B区第2排第8格，按长度分拣至30cm区',
    confidence: 95.2,
    tags: [
      { label: '拉链', color: '#0A66C2' },
      { label: '金属', color: '#D97706' },
      { label: '30cm', color: '#7C3AED' }
    ]
  },
  {
    id: 3,
    name: '棉质花边蕾丝 (白色 5cm宽)',
    material: '棉 100%',
    zone: 'C区',
    shelf: 'C-01-15',
    category: '辅料-花边类',
    handling: '放入C区第1排第15格，卷筒直立摆放避免褶皱',
    confidence: 93.7,
    tags: [
      { label: '花边', color: '#0A66C2' },
      { label: '棉质', color: '#059669' },
      { label: '蕾丝', color: '#EC4899' }
    ]
  },
  {
    id: 4,
    name: '涤纶织唛标签 (5×3cm 定制款)',
    material: '涤纶 100%',
    zone: 'A区',
    shelf: 'A-05-06',
    category: '辅料-商标类',
    handling: '放入A区第5排第6格，按字母序排列',
    confidence: 91.5,
    tags: [
      { label: '织唛', color: '#0A66C2' },
      { label: '涤纶', color: '#059669' },
      { label: '标签', color: '#6B7280' }
    ]
  },
  {
    id: 5,
    name: '松紧带 (黑色 2cm宽)',
    material: '橡胶/涤纶混纺',
    zone: 'C区',
    shelf: 'C-03-22',
    category: '辅料-松紧类',
    handling: '放入C区第3排第22格，成卷堆放',
    confidence: 94.3,
    tags: [
      { label: '松紧带', color: '#0A66C2' },
      { label: '橡胶混纺', color: '#D97706' },
      { label: '黑色', color: '#374151' }
    ]
  },
  {
    id: 6,
    name: '透明水晶纽扣 (12mm 四眼)',
    material: '树脂/亚克力',
    zone: 'A区',
    shelf: 'A-03-18',
    category: '辅料-纽扣类',
    handling: '放入A区第3排第18格，避光存放防止发黄',
    confidence: 97.1,
    tags: [
      { label: '纽扣', color: '#0A66C2' },
      { label: '亚克力', color: '#059669' },
      { label: '透明', color: '#9CA3AF' }
    ]
  }
];
