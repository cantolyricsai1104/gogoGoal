import { GoalClassification, LifeWheelCategory } from './domain';

export const lifeWheelCategories: Array<[LifeWheelCategory, string, string]> = [
  ['health', '健康（身心）', '生理作息、運動、皮膚、睡眠、情緒心理，就係你最基礎嘅身體本錢。'],
  ['wealth', '財富／財務', '收入、儲蓄、理財、財務安全感，即你講嘅財富目標。'],
  ['career', '事業／職業', '工作、創業、項目發展、技能提升、職場成就感。'],
  ['relationships', '人際關係（人際／家庭／伴侶）', '親情、朋友、伴侶、社交圈子，對應你提到嘅人際。'],
  ['personal_growth', '個人成長', '學習新技能、自我提升、心態修煉、拓寬認知。'],
  ['leisure', '休閒娛樂', '興趣、玩樂、放鬆、愛好，唔使功利純粹享受生活。'],
  ['environment', '生活環境', '屋企、工作空間、居住舒適度、周邊環境整潔。'],
  ['meaning', '人生意義／貢獻', '做義工、協會幹事、創造價值、幫助他人、精神追求。'],
];

export const classificationLabels: Record<GoalClassification['activity'], string> = {
  running: '跑步',
  strength_training: '力量訓練',
  swimming: '游泳',
  cycling: '單車',
  walking: '步行',
  ball_sports: '球類運動',
  other: '其他運動',
};

export const goalActivities: GoalClassification['activity'][] = [
  'running', 'strength_training', 'swimming', 'cycling', 'walking', 'ball_sports', 'other',
];
