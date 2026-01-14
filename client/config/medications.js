/**
 * 药物配置
 * interval: 用药间隔（小时），0 表示无限制
 * isFeverMed: 是否为退烧药
 */
export const medications = [
  { name: '布洛芬', icon: '🔥', isFeverMed: true, interval: 6 },
  { name: '美林', icon: '💧', isFeverMed: true, interval: 6 },
  { name: '奥司他韦', icon: '💊', isFeverMed: false, interval: 12 },
  { name: '止咳糖浆', icon: '🍯', isFeverMed: false, interval: 0 },
  { name: '小儿氨酚黄那敏', icon: '🌿', isFeverMed: false, interval: 0 },
  { name: '其他', icon: '➕', isFeverMed: false, interval: 0 }
]

/**
 * 退烧药列表
 */
export const feverMeds = medications.filter(m => m.isFeverMed).map(m => m.name)
