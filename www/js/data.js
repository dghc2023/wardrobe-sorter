// ===== Mock 数据集 =====
const MOCK_DATA = [
  {
    id: 1,
    name: '女士收腰连衣裙',
    type: '连衣裙 / 中长款',
    fabric: '涤纶 65% · 粘纤 30% · 氨纶 5%',
    disassemble: '1) 分离拉链及纽扣 2) 切除腰封装饰带 3) 按涤纶/粘纤分类回收',
    category: 'B类 · 混纺织物 · 回收再造纤维',
    emoji: '👗',
    confidence: 97.2,
    materials: [
      { label: '主体面料', color: '#2a4a7a' },
      { label: '里衬', color: '#3a5a8a' },
      { label: '装饰带', color: '#c0a060' },
      { label: '辅料', color: '#6a7a8a' }
    ]
  },
  {
    id: 2,
    name: '男士羊毛混纺西装',
    type: '西装外套 / 正装',
    fabric: '羊毛 70% · 涤纶 25% · 氨纶 5%',
    disassemble: '1) 拆除金属纽扣 2) 分离肩垫及胸衬 3) 羊毛纤维干洗回收',
    category: 'A类 · 高价值纤维 · 干洗处理后再生',
    emoji: '🧥',
    confidence: 95.8,
    materials: [
      { label: '羊毛面料', color: '#3a4a5a' },
      { label: '内衬', color: '#5a6a7a' },
      { label: '肩垫', color: '#8a7a6a' },
      { label: '纽扣', color: '#c0a060' }
    ]
  },
  {
    id: 3,
    name: '轻薄羽绒服',
    type: '羽绒服 / 短款',
    fabric: '尼龙 100% · 填充: 白鸭绒 90%',
    disassemble: '1) 先回收羽绒填充物 2) 分离拉链及松紧带 3) 尼龙面料粉碎造粒',
    category: 'C类 · 羽绒/尼龙复合 · 需先分绒再回收',
    emoji: '🧥',
    confidence: 93.5,
    materials: [
      { label: '尼龙面料', color: '#2a5a7a' },
      { label: '羽绒填充', color: '#e8e0d0' },
      { label: '防风条', color: '#1a4a6a' },
      { label: '拉链', color: '#8a7a6a' }
    ]
  },
  {
    id: 4,
    name: '牛仔修身长裤',
    type: '长裤 / 休闲',
    fabric: '棉 98% · 氨纶 2%',
    disassemble: '1) 拆除金属铆钉及拉链 2) 切除裤腰标签 3) 全棉纤维打浆再生',
    category: 'A类 · 纯棉纤维 · 可打浆再造',
    emoji: '👖',
    confidence: 96.1,
    materials: [
      { label: '丹宁面料', color: '#2a4a7a' },
      { label: '袋布', color: '#c0b8a8' },
      { label: '铆钉', color: '#a08050' },
      { label: '标签', color: '#e0d0b0' }
    ]
  },
  {
    id: 5,
    name: '针织开衫',
    type: '开衫 / 中款',
    fabric: '棉 50% · 腈纶 40% · 锦纶 10%',
    disassemble: '1) 分离纽扣 2) 按棉/腈纶比例分类 3) 开松梳理后纺再生纱',
    category: 'B类 · 混纺针织 · 开松后纺再生纱线',
    emoji: '🧶',
    confidence: 91.7,
    materials: [
      { label: '针织主体', color: '#6a8a6a' },
      { label: '罗纹边', color: '#4a6a4a' },
      { label: '纽扣', color: '#a08060' },
      { label: '缝线', color: '#8aaa8a' }
    ]
  },
  {
    id: 6,
    name: '真丝印花衬衫',
    type: '衬衫 / 长袖',
    fabric: '桑蚕丝 100%',
    disassemble: '1) 拆除珍珠纽扣 2) 分离粘合衬领口 3) 蚕丝纤维精炼后纺纱',
    category: 'A类 · 天然蛋白纤维 · 高端回收路线',
    emoji: '👔',
    confidence: 98.3,
    materials: [
      { label: '真丝面料', color: '#c0a0a0' },
      { label: '领衬', color: '#e0d0c0' },
      { label: '纽扣', color: '#f0e8e0' },
      { label: '印花', color: '#a06080' }
    ]
  }
];
