import type { Category, Course, Student, Schedule, Enrollment, Teacher, Grade, Evaluation, EvaluationConfig, StudentGroup, Mentor, Leader, Department } from '@/types';

/** Mock 数据版本号 — 修改后自动覆盖 localStorage 旧数据 */
export const MOCK_VERSION = '3.1';

export const departments: Department[] = [
  { id: 'dept-1', name: '计算机学院', color: '#3b82f6' },
  { id: 'dept-2', name: '数理学院', color: '#10b981' },
  { id: 'dept-3', name: '外国语学院', color: '#f59e0b' },
  { id: 'dept-4', name: '软件学院', color: '#8b5cf6' },
  { id: 'dept-5', name: '数据科学学院', color: '#06b6d4' },
  { id: 'dept-6', name: '人工智能学院', color: '#ec4899' },
  { id: 'dept-7', name: '网络空间安全学院', color: '#ef4444' },
];

/** 班级 → 学院映射 */
export const departmentClasses: Record<string, string[]> = {
  'dept-1': ['计算机2101班', '计算机2102班', '物联网工程2101班'],
  'dept-2': ['3班', '4班'],
  'dept-3': ['5班'],
  'dept-4': ['软件工程2101班', '软件工程2102班'],
  'dept-5': ['数据科学2101班'],
  'dept-6': ['人工智能2101班'],
  'dept-7': ['网络安全2101班'],
};

export const categories: Category[] = [
  // 计算机学院
  { id: 'cat-1', name: '编程开发', color: '#3b82f6', courseCount: 7, departmentId: 'dept-1' },
  { id: 'cat-3', name: '设计创意', color: '#f59e0b', courseCount: 2, departmentId: 'dept-1' },
  { id: 'cat-4', name: '商务管理', color: '#8b5cf6', courseCount: 4, departmentId: 'dept-1' },
  { id: 'cat-8', name: '前端设计', color: '#a855f7', courseCount: 0, departmentId: 'dept-1' },
  { id: 'cat-9', name: '后端架构', color: '#84cc16', courseCount: 0, departmentId: 'dept-1' },
  // 数理学院
  { id: 'cat-2', name: '数据科学', color: '#10b981', courseCount: 4, departmentId: 'dept-2' },
  { id: 'cat-6', name: '高等数学', color: '#ef4444', courseCount: 0, departmentId: 'dept-2' },
  { id: 'cat-7', name: '大学物理', color: '#06b6d4', courseCount: 0, departmentId: 'dept-2' },
  // 外国语学院
  { id: 'cat-5', name: '语言学习', color: '#ec4899', courseCount: 3, departmentId: 'dept-3' },
  { id: 'cat-10', name: '商务翻译', color: '#f97316', courseCount: 0, departmentId: 'dept-3' },
];

export const courses: Course[] = [
  { id: 'course-1', title: 'React 前端开发实战', description: '从零到一掌握 React 18 核心特性，包括 Hooks、Context、Suspense 等高级用法，完成企业级项目开发。', categoryId: 'cat-1', cover: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop', credits: 6, duration: 48, status: 'active', createdAt: '2026-06-01', teacher: '王老师', mentor: '张导师' },
  { id: 'course-2', title: 'Python 数据分析入门', description: '学习 Python 数据处理、分析和可视化，掌握 Pandas、NumPy、Matplotlib 等核心库。', categoryId: 'cat-2', cover: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=300&fit=crop', credits: 5, duration: 36, status: 'active', createdAt: '2026-06-05', teacher: '李老师' },
  { id: 'course-3', title: 'UI/UX 设计思维', description: '系统学习用户体验设计流程，从用户研究到原型设计，打造令人惊艳的产品体验。', categoryId: 'cat-3', cover: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop', credits: 4, duration: 32, status: 'active', createdAt: '2026-06-10', teacher: '陈老师' },
  { id: 'course-4', title: 'TypeScript 高级编程', description: '深入 TypeScript 类型系统、泛型、装饰器、条件类型等高级特性，提升代码质量。', categoryId: 'cat-1', cover: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=400&h=300&fit=crop', credits: 5, duration: 40, status: 'active', createdAt: '2026-06-15', teacher: '王老师' },
  { id: 'course-5', title: '机器学习基础', description: '掌握机器学习核心算法，包括线性回归、决策树、SVM、神经网络等，理论与实践结合。', categoryId: 'cat-2', cover: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop', credits: 7, duration: 56, status: 'active', createdAt: '2026-06-20', teacher: '张老师' },
  { id: 'course-6', title: '项目管理实战', description: '学习敏捷开发、Scrum 框架、项目规划与风险管理，提升团队协作效率。', categoryId: 'cat-4', cover: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop', credits: 4, duration: 28, status: 'active', createdAt: '2026-07-01', teacher: '刘老师' },
  { id: 'course-7', title: 'Node.js 后端开发', description: '使用 Node.js + Express 构建 RESTful API，掌握数据库设计、认证授权、部署运维。', categoryId: 'cat-1', cover: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=300&fit=crop', credits: 6, duration: 44, status: 'inactive', createdAt: '2026-07-05', teacher: '王老师' },
  { id: 'course-8', title: 'SQL 数据库设计', description: '从基础 SQL 到高级查询优化，掌握关系型数据库设计与性能调优。', categoryId: 'cat-2', cover: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&h=300&fit=crop', credits: 3, duration: 24, status: 'draft', createdAt: '2026-07-08', teacher: '李老师' },
  { id: 'course-9', title: 'Photoshop 图像处理', description: '从基础工具到高级合成技巧，掌握商业级图像处理技能。', categoryId: 'cat-3', cover: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=300&fit=crop', credits: 3, duration: 20, status: 'active', createdAt: '2026-07-10', teacher: '陈老师' },
  { id: 'course-10', title: '商务英语沟通', description: '提升职场英语听说读写能力，涵盖商务会议、邮件写作、演讲表达等场景。', categoryId: 'cat-5', cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop', credits: 4, duration: 32, status: 'active', createdAt: '2026-07-12', teacher: '赵老师' },
  { id: 'course-11', title: 'Vue 3 组合式 API', description: '深入学习 Vue 3 Composition API、Pinia 状态管理、Vite 构建工具，构建现代化前端应用。', categoryId: 'cat-1', cover: 'https://images.unsplash.com/photo-1619410283995-43d9134e7656?w=400&h=300&fit=crop', credits: 5, duration: 36, status: 'active', createdAt: '2026-07-15', teacher: '王老师' },
  { id: 'course-12', title: '日语初级入门', description: '从五十音图开始，系统学习日语语法、词汇和日常会话，达到N5水平。', categoryId: 'cat-5', cover: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=300&fit=crop', credits: 4, duration: 28, status: 'active', createdAt: '2026-07-16', teacher: '孙老师' },
  { id: 'course-13', title: '领导力与团队管理', description: '培养卓越领导力，学习团队激励、冲突处理、决策制定等管理技能。', categoryId: 'cat-4', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop', credits: 3, duration: 24, status: 'draft', createdAt: '2026-07-17', teacher: '刘老师' },
  { id: 'course-14', title: 'AI 生成式应用开发', description: '结合大模型与前端/后端能力，快速构建智能问答、内容生成与自动化助手。', categoryId: 'cat-1', cover: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop', credits: 5, duration: 40, status: 'active', createdAt: '2026-07-18', teacher: '周老师' },
  { id: 'course-15', title: '数据可视化与商业分析', description: '学习如何将复杂数据转化为直观报表和交互式可视化，提升决策表达能力。', categoryId: 'cat-2', cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop', credits: 4, duration: 32, status: 'active', createdAt: '2026-07-19', teacher: '钱老师' },
  { id: 'course-16', title: '高效沟通与表达训练', description: '提升会议汇报、演讲展示和跨部门沟通能力，适合职场与学习场景。', categoryId: 'cat-4', cover: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=300&fit=crop', credits: 3, duration: 24, status: 'active', createdAt: '2026-07-20', teacher: '吴老师' },
  { id: 'course-17', title: '英语口语进阶训练', description: '从日常口语到商务场景表达，帮助学员建立更自信的英语交流习惯。', categoryId: 'cat-5', cover: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop', credits: 4, duration: 28, status: 'active', createdAt: '2026-07-21', teacher: '孙老师' },
  { id: 'course-18', title: 'Docker 容器化部署', description: '掌握 Docker 容器技术，包括镜像构建、容器编排、Docker Compose 和 Kubernetes 基础，实现高效的应用部署。', categoryId: 'cat-1', cover: 'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=400&h=300&fit=crop', credits: 4, duration: 32, status: 'active', createdAt: '2026-07-22', teacher: '周老师' },
  { id: 'course-19', title: '微服务架构设计', description: '学习微服务拆分原则、服务注册发现、API 网关、配置中心、分布式事务等微服务核心架构设计。', categoryId: 'cat-1', cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop', credits: 5, duration: 40, status: 'active', createdAt: '2026-07-23', teacher: '钱老师' },
  { id: 'course-20', title: '产品经理实战', description: '从需求分析到产品上线，系统学习产品经理工作流程，掌握用户调研、原型设计、数据分析等核心技能。', categoryId: 'cat-4', cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop', credits: 4, duration: 28, status: 'active', createdAt: '2026-07-24', teacher: '吴老师' },
];

export const students: Student[] = [
  // ====== 计算机2101班 (12人) ======
  { id: 'stu-1', name: '张明', studentId: 'S2024001', className: '计算机2101班', phone: '13800001234', email: 'zhangming@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangming', joinDate: '2026-06-01', status: 'active', enrollmentScore: 645 },
  { id: 'stu-2', name: '李华', studentId: 'S2024002', className: '计算机2101班', phone: '13900005678', email: 'lihua@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lihua', joinDate: '2026-06-03', status: 'active', enrollmentScore: 580 },
  { id: 'stu-3', name: '王芳', studentId: 'S2024003', className: '计算机2101班', phone: '13700009012', email: 'wangfang@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang', joinDate: '2026-06-05', status: 'active', enrollmentScore: 620 },
  { id: 'stu-4', name: '赵磊', studentId: 'S2024004', className: '计算机2101班', phone: '13600003456', email: 'zhaolei@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaolei', joinDate: '2026-06-08', status: 'active', enrollmentScore: 550 },
  { id: 'stu-5', name: '陈静', studentId: 'S2024005', className: '计算机2101班', phone: '13500007890', email: 'chenjing@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenjing', joinDate: '2026-06-10', status: 'active', enrollmentScore: 670 },
  { id: 'stu-6', name: '刘洋', studentId: 'S2024006', className: '计算机2101班', phone: '13400002345', email: 'liuyang@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liuyang', joinDate: '2026-06-12', status: 'active', enrollmentScore: 530 },
  { id: 'stu-7', name: '孙丽', studentId: 'S2024007', className: '计算机2101班', phone: '13300006789', email: 'sunli@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sunli', joinDate: '2026-06-15', status: 'active', enrollmentScore: 600 },
  { id: 'stu-8', name: '周杰', studentId: 'S2024008', className: '计算机2101班', phone: '13200000123', email: 'zhoujie@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhoujie', joinDate: '2026-06-18', status: 'inactive', enrollmentScore: 480 },
  { id: 'stu-101', name: '杨浩然', studentId: 'S2024025', className: '计算机2101班', phone: '13100001111', email: 'yanghaoran@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yanghaoran', joinDate: '2026-06-20', status: 'active', enrollmentScore: 610 },
  { id: 'stu-102', name: '朱子轩', studentId: 'S2024026', className: '计算机2101班', phone: '13000002222', email: 'zhuzixuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhuzixuan', joinDate: '2026-06-22', status: 'active', enrollmentScore: 595 },
  { id: 'stu-103', name: '徐梓涵', studentId: 'S2024027', className: '计算机2101班', phone: '15900003333', email: 'xuzihan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xuzihan', joinDate: '2026-06-25', status: 'active', enrollmentScore: 630 },
  { id: 'stu-104', name: '马欣怡', studentId: 'S2024028', className: '计算机2101班', phone: '15800004444', email: 'maxinyi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maxinyi', joinDate: '2026-06-28', status: 'active', enrollmentScore: 585 },

  // ====== 计算机2102班 (10人) ======
  { id: 'stu-105', name: '高雨桐', studentId: 'S2024029', className: '计算机2102班', phone: '15700005555', email: 'gaoyutong@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaoyutong', joinDate: '2026-06-01', status: 'active', enrollmentScore: 610 },
  { id: 'stu-106', name: '林思远', studentId: 'S2024030', className: '计算机2102班', phone: '15600006666', email: 'linsiyuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=linsiyuan', joinDate: '2026-06-03', status: 'active', enrollmentScore: 640 },
  { id: 'stu-107', name: '黄天佑', studentId: 'S2024031', className: '计算机2102班', phone: '15500007777', email: 'huangtianyou@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=huangtianyou', joinDate: '2026-06-05', status: 'active', enrollmentScore: 560 },
  { id: 'stu-108', name: '何可昕', studentId: 'S2024032', className: '计算机2102班', phone: '15400008888', email: 'hekexin@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hekexin', joinDate: '2026-06-08', status: 'active', enrollmentScore: 625 },
  { id: 'stu-109', name: '郭佳琪', studentId: 'S2024033', className: '计算机2102班', phone: '15300009999', email: 'guojiaqi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guojiaqi', joinDate: '2026-06-10', status: 'active', enrollmentScore: 590 },
  { id: 'stu-110', name: '罗梦瑶', studentId: 'S2024034', className: '计算机2102班', phone: '15200000000', email: 'luomengyao@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luomengyao', joinDate: '2026-06-12', status: 'active', enrollmentScore: 670 },
  { id: 'stu-111', name: '梁婉婷', studentId: 'S2024035', className: '计算机2102班', phone: '15100001212', email: 'liangwanting@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liangwanting', joinDate: '2026-06-15', status: 'active', enrollmentScore: 545 },
  { id: 'stu-112', name: '宋俊熙', studentId: 'S2024036', className: '计算机2102班', phone: '15000003434', email: 'songjunxi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=songjunxi', joinDate: '2026-06-18', status: 'inactive', enrollmentScore: 490 },
  { id: 'stu-113', name: '郑皓轩', studentId: 'S2024037', className: '计算机2102班', phone: '14900005656', email: 'zhenghaoxuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhenghaoxuan', joinDate: '2026-06-20', status: 'active', enrollmentScore: 600 },
  { id: 'stu-114', name: '冯博文', studentId: 'S2024038', className: '计算机2102班', phone: '14800007878', email: 'fengbowen@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fengbowen', joinDate: '2026-06-22', status: 'active', enrollmentScore: 635 },

  // ====== 软件工程2101班 (11人) ======
  { id: 'stu-9', name: '吴婷', studentId: 'S2024009', className: '软件工程2101班', phone: '13100004567', email: 'wuting@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wuting', joinDate: '2026-06-20', status: 'active', enrollmentScore: 610 },
  { id: 'stu-10', name: '郑凯', studentId: 'S2024010', className: '软件工程2101班', phone: '13000008901', email: 'zhengkai@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhengkai', joinDate: '2026-06-22', status: 'active', enrollmentScore: 520 },
  { id: 'stu-11', name: '黄丽', studentId: 'S2024011', className: '软件工程2101班', phone: '15900002345', email: 'huangli@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=huangli', joinDate: '2026-06-25', status: 'active', enrollmentScore: 640 },
  { id: 'stu-12', name: '林伟', studentId: 'S2024012', className: '软件工程2101班', phone: '15800006789', email: 'linwei@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=linwei', joinDate: '2026-06-28', status: 'active', enrollmentScore: 500 },
  { id: 'stu-13', name: '何雪', studentId: 'S2024013', className: '软件工程2101班', phone: '15700000123', email: 'hexue@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hexue', joinDate: '2026-07-01', status: 'active', enrollmentScore: 665 },
  { id: 'stu-115', name: '邓雅婷', studentId: 'S2024039', className: '软件工程2101班', phone: '15600001122', email: 'dengyating@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dengyating', joinDate: '2026-06-01', status: 'active', enrollmentScore: 580 },
  { id: 'stu-116', name: '彭若曦', studentId: 'S2024040', className: '软件工程2101班', phone: '15500003344', email: 'pengruoxi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pengruoxi', joinDate: '2026-06-03', status: 'active', enrollmentScore: 620 },
  { id: 'stu-117', name: '许子墨', studentId: 'S2024041', className: '软件工程2101班', phone: '15400005566', email: 'xuzimo@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xuzimo', joinDate: '2026-06-05', status: 'active', enrollmentScore: 555 },
  { id: 'stu-118', name: '韩梓萱', studentId: 'S2024042', className: '软件工程2101班', phone: '15300007788', email: 'hanzixuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hanzixuan', joinDate: '2026-06-08', status: 'active', enrollmentScore: 645 },
  { id: 'stu-119', name: '冯宇航', studentId: 'S2024043', className: '软件工程2101班', phone: '15200009900', email: 'fengyuhang@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fengyuhang', joinDate: '2026-06-10', status: 'active', enrollmentScore: 575 },
  { id: 'stu-120', name: '朱思琪', studentId: 'S2024044', className: '软件工程2101班', phone: '15100001234', email: 'zhusiqi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhusiqi', joinDate: '2026-06-12', status: 'active', enrollmentScore: 610 },

  // ====== 软件工程2102班 (9人) ======
  { id: 'stu-14', name: '马强', studentId: 'S2024014', className: '软件工程2102班', phone: '15600004567', email: 'maqiang@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maqiang', joinDate: '2026-07-03', status: 'inactive', enrollmentScore: 460 },
  { id: 'stu-15', name: '胡敏', studentId: 'S2024015', className: '软件工程2102班', phone: '15500008901', email: 'humin@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=humin', joinDate: '2026-07-05', status: 'active', enrollmentScore: 590 },
  { id: 'stu-16', name: '高飞', studentId: 'S2024016', className: '软件工程2102班', phone: '15400002345', email: 'gaofei@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaofei', joinDate: '2026-07-08', status: 'active', enrollmentScore: 565 },
  { id: 'stu-121', name: '秦雨泽', studentId: 'S2024045', className: '软件工程2102班', phone: '15300005678', email: 'qinyuze@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=qinyuze', joinDate: '2026-06-15', status: 'active', enrollmentScore: 620 },
  { id: 'stu-122', name: '尹致远', studentId: 'S2024046', className: '软件工程2102班', phone: '15200009012', email: 'yinzhiyuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yinzhiyuan', joinDate: '2026-06-18', status: 'active', enrollmentScore: 540 },
  { id: 'stu-123', name: '姜晨曦', studentId: 'S2024047', className: '软件工程2102班', phone: '15100003456', email: 'jiangchenxi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jiangchenxi', joinDate: '2026-06-20', status: 'active', enrollmentScore: 680 },
  { id: 'stu-124', name: '董皓宇', studentId: 'S2024048', className: '软件工程2102班', phone: '15000007890', email: 'donghaoyu@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=donghaoyu', joinDate: '2026-06-22', status: 'active', enrollmentScore: 510 },
  { id: 'stu-125', name: '肖紫涵', studentId: 'S2024049', className: '软件工程2102班', phone: '14900001234', email: 'xiaoZihan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoZihan', joinDate: '2026-06-25', status: 'active', enrollmentScore: 630 },
  { id: 'stu-126', name: '曹诗涵', studentId: 'S2024050', className: '软件工程2102班', phone: '14800005678', email: 'caoshihan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=caoshihan', joinDate: '2026-06-28', status: 'active', enrollmentScore: 595 },

  // ====== 数据科学2101班 (10人) ======
  { id: 'stu-17', name: '欧阳雪', studentId: 'S2024017', className: '数据科学2101班', phone: '15300001234', email: 'ouyangxue@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ouyangxue', joinDate: '2026-07-10', status: 'active', enrollmentScore: 685 },
  { id: 'stu-18', name: '慕容枫', studentId: 'S2024018', className: '数据科学2101班', phone: '15200005678', email: 'murongfeng@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=murongfeng', joinDate: '2026-07-12', status: 'active', enrollmentScore: 630 },
  { id: 'stu-127', name: '范雨萱', studentId: 'S2024051', className: '数据科学2101班', phone: '15100009012', email: 'fanyuxuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fanyuxuan', joinDate: '2026-06-01', status: 'active', enrollmentScore: 660 },
  { id: 'stu-128', name: '方天翊', studentId: 'S2024052', className: '数据科学2101班', phone: '15000003456', email: 'fangtianyi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fangtianyi', joinDate: '2026-06-03', status: 'active', enrollmentScore: 580 },
  { id: 'stu-129', name: '邓欣妍', studentId: 'S2024053', className: '数据科学2101班', phone: '14900007890', email: 'dengxinyan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dengxinyan', joinDate: '2026-06-05', status: 'active', enrollmentScore: 700 },
  { id: 'stu-130', name: '任俊豪', studentId: 'S2024054', className: '数据科学2101班', phone: '14800001234', email: 'renjunhao@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=renjunhao', joinDate: '2026-06-08', status: 'active', enrollmentScore: 555 },
  { id: 'stu-131', name: '卢雅琪', studentId: 'S2024055', className: '数据科学2101班', phone: '14700005678', email: 'luYaqi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luYaqi', joinDate: '2026-06-10', status: 'active', enrollmentScore: 625 },
  { id: 'stu-132', name: '蒋泽宇', studentId: 'S2024056', className: '数据科学2101班', phone: '14600009012', email: 'jiangzeyu@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jiangzeyu', joinDate: '2026-06-12', status: 'active', enrollmentScore: 690 },
  { id: 'stu-133', name: '沈佳怡', studentId: 'S2024057', className: '数据科学2101班', phone: '14500003456', email: 'shenjiayi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shenjiayi', joinDate: '2026-06-15', status: 'inactive', enrollmentScore: 470 },
  { id: 'stu-134', name: '韩东明', studentId: 'S2024058', className: '数据科学2101班', phone: '14400007890', email: 'handongming@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=handongming', joinDate: '2026-06-18', status: 'active', enrollmentScore: 610 },

  // ====== 人工智能2101班 (12人) ======
  { id: 'stu-135', name: '唐雨桐', studentId: 'S2024059', className: '人工智能2101班', phone: '13300001111', email: 'tangyutong@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tangyutong', joinDate: '2026-06-01', status: 'active', enrollmentScore: 670 },
  { id: 'stu-136', name: '段思远', studentId: 'S2024060', className: '人工智能2101班', phone: '13200002222', email: 'duansiyuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=duansiyuan', joinDate: '2026-06-03', status: 'active', enrollmentScore: 590 },
  { id: 'stu-137', name: '雷可昕', studentId: 'S2024061', className: '人工智能2101班', phone: '13100003333', email: 'leKexin@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leKexin', joinDate: '2026-06-05', status: 'active', enrollmentScore: 640 },
  { id: 'stu-138', name: '倪昊轩', studentId: 'S2024062', className: '人工智能2101班', phone: '13000004444', email: 'nihaoxuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nihaoxuan', joinDate: '2026-06-08', status: 'active', enrollmentScore: 560 },
  { id: 'stu-139', name: '阎梦瑶', studentId: 'S2024063', className: '人工智能2101班', phone: '15900005555', email: 'yanmengyao@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yanmengyao', joinDate: '2026-06-10', status: 'active', enrollmentScore: 710 },
  { id: 'stu-140', name: '柯俊熙', studentId: 'S2024064', className: '人工智能2101班', phone: '15800006666', email: 'kejunxi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kejunxi', joinDate: '2026-06-12', status: 'active', enrollmentScore: 600 },
  { id: 'stu-141', name: '蓝诗涵', studentId: 'S2024065', className: '人工智能2101班', phone: '15700007777', email: 'lanshihan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lanshihan', joinDate: '2026-06-15', status: 'active', enrollmentScore: 635 },
  { id: 'stu-142', name: '董子睿', studentId: 'S2024066', className: '人工智能2101班', phone: '15600008888', email: 'dongzirui@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dongzirui', joinDate: '2026-06-18', status: 'active', enrollmentScore: 575 },
  { id: 'stu-143', name: '温馨怡', studentId: 'S2024067', className: '人工智能2101班', phone: '15500009999', email: 'wenxinyi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wenxinyi', joinDate: '2026-06-20', status: 'active', enrollmentScore: 680 },
  { id: 'stu-144', name: '程浩宇', studentId: 'S2024068', className: '人工智能2101班', phone: '15400000000', email: 'chenghaoyu@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenghaoyu', joinDate: '2026-06-22', status: 'active', enrollmentScore: 545 },
  { id: 'stu-145', name: '苏雅琪', studentId: 'S2024069', className: '人工智能2101班', phone: '15300001212', email: 'suyaqi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=suyaqi', joinDate: '2026-06-25', status: 'active', enrollmentScore: 620 },
  { id: 'stu-146', name: '魏泽川', studentId: 'S2024070', className: '人工智能2101班', phone: '15200003434', email: 'weizechuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=weizechuan', joinDate: '2026-06-28', status: 'inactive', enrollmentScore: 495 },

  // ====== 网络安全2101班 (8人) ======
  { id: 'stu-147', name: '褚雨辰', studentId: 'S2024071', className: '网络安全2101班', phone: '15100005656', email: 'chuyuchen@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chuyuchen', joinDate: '2026-06-01', status: 'active', enrollmentScore: 650 },
  { id: 'stu-148', name: '卫天明', studentId: 'S2024072', className: '网络安全2101班', phone: '15000007878', email: 'weitianming@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=weitianming', joinDate: '2026-06-03', status: 'active', enrollmentScore: 585 },
  { id: 'stu-149', name: '蒋雨彤', studentId: 'S2024073', className: '网络安全2101班', phone: '14900009090', email: 'jiangyutong@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jiangyutong', joinDate: '2026-06-05', status: 'active', enrollmentScore: 615 },
  { id: 'stu-150', name: '沈子轩', studentId: 'S2024074', className: '网络安全2101班', phone: '14800001212', email: 'shenzixuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shenzixuan', joinDate: '2026-06-08', status: 'active', enrollmentScore: 570 },
  { id: 'stu-151', name: '韩佳琪', studentId: 'S2024075', className: '网络安全2101班', phone: '14700003434', email: 'hanjiaqi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hanjiaqi', joinDate: '2026-06-10', status: 'active', enrollmentScore: 640 },
  { id: 'stu-152', name: '杨皓宇', studentId: 'S2024076', className: '网络安全2101班', phone: '14600005656', email: 'yanghaoyu2@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yanghaoyu2', joinDate: '2026-06-12', status: 'active', enrollmentScore: 555 },
  { id: 'stu-153', name: '朱梦瑶', studentId: 'S2024077', className: '网络安全2101班', phone: '14500007878', email: 'zhumengyao@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhumengyao', joinDate: '2026-06-15', status: 'active', enrollmentScore: 690 },
  { id: 'stu-154', name: '秦俊杰', studentId: 'S2024078', className: '网络安全2101班', phone: '14400009090', email: 'qinjunjie@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=qinjunjie', joinDate: '2026-06-18', status: 'active', enrollmentScore: 520 },

  // ====== 物联网工程2101班 (9人) ======
  { id: 'stu-155', name: '许文博', studentId: 'S2024079', className: '物联网工程2101班', phone: '13300001122', email: 'xubenbo@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xubenbo', joinDate: '2026-06-01', status: 'active', enrollmentScore: 600 },
  { id: 'stu-156', name: '邓雅雯', studentId: 'S2024080', className: '物联网工程2101班', phone: '13200003344', email: 'dengyawen@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dengyawen', joinDate: '2026-06-03', status: 'active', enrollmentScore: 635 },
  { id: 'stu-157', name: '方子墨', studentId: 'S2024081', className: '物联网工程2101班', phone: '13100005566', email: 'fangzimo@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fangzimo', joinDate: '2026-06-05', status: 'active', enrollmentScore: 575 },
  { id: 'stu-158', name: '冯思琪', studentId: 'S2024082', className: '物联网工程2101班', phone: '13000007788', email: 'fengsiqi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fengsiqi', joinDate: '2026-06-08', status: 'active', enrollmentScore: 660 },
  { id: 'stu-159', name: '蒋天佑', studentId: 'S2024083', className: '物联网工程2101班', phone: '15900009900', email: 'jiangtianyou@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jiangtianyou', joinDate: '2026-06-10', status: 'active', enrollmentScore: 545 },
  { id: 'stu-160', name: '韩雨萱', studentId: 'S2024084', className: '物联网工程2101班', phone: '15800001122', email: 'hanyuxuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hanyuxuan', joinDate: '2026-06-12', status: 'active', enrollmentScore: 620 },
  { id: 'stu-161', name: '罗子轩', studentId: 'S2024085', className: '物联网工程2101班', phone: '15700003344', email: 'luozixuan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luozixuan', joinDate: '2026-06-15', status: 'inactive', enrollmentScore: 480 },
  { id: 'stu-162', name: '谢佳怡', studentId: 'S2024086', className: '物联网工程2101班', phone: '15600005566', email: 'xiejiayi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiejiayi', joinDate: '2026-06-18', status: 'active', enrollmentScore: 675 },
  { id: 'stu-163', name: '唐浩宇', studentId: 'S2024087', className: '物联网工程2101班', phone: '15500007788', email: 'tanghaoyu@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tanghaoyu', joinDate: '2026-06-20', status: 'active', enrollmentScore: 590 },

  // ====== 其他班级学生 (旧数据兼容) ======
  { id: 'stu-19', name: '令狐冲', studentId: '2024019', className: '3班', phone: '15100009012', email: 'linghuchong@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=linghuchong', joinDate: '2026-07-14', status: 'active', enrollmentScore: 590 },
  { id: 'stu-20', name: '杨过', studentId: '2024020', className: '3班', phone: '15000003456', email: 'yangguo@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yangguo', joinDate: '2026-07-16', status: 'active', enrollmentScore: 540 },
  { id: 'stu-21', name: '小龙女', studentId: '2024021', className: '3班', phone: '14900007890', email: 'xiaolongnv@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaolongnv', joinDate: '2026-07-18', status: 'active', enrollmentScore: 610 },
  { id: 'stu-22', name: '独孤求败', studentId: '2024022', className: '3班', phone: '14800000001', email: 'dugu@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dugu', joinDate: '2026-07-20', status: 'active', enrollmentScore: 720 },
  { id: 'stu-23', name: '韦小宝', studentId: '2024023', className: '3班', phone: '14700000002', email: 'weixb@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=weixiaobao', joinDate: '2026-07-20', status: 'active', enrollmentScore: 420 },
  { id: 'stu-24', name: '乔峰', studentId: '2024024', className: '3班', phone: '14600000003', email: 'qiaofeng@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=qiaofeng', joinDate: '2026-07-20', status: 'active', enrollmentScore: 680 },
];

export const schedules: Schedule[] = [
  // 周一 · 2026-07-27
  { id: 'sch-1', courseId: 'course-1', title: 'React 前端开发实战', startDate: '2026-07-27', endDate: '2026-07-27', timeSlot: '09:00-11:00', room: 'A101', teacher: '王老师' },
  { id: 'sch-9', courseId: 'course-10', title: '商务英语沟通', startDate: '2026-07-27', endDate: '2026-07-27', timeSlot: '09:00-11:00', room: 'A103', teacher: '赵老师' },
  { id: 'sch-3', courseId: 'course-3', title: 'UI/UX 设计思维', startDate: '2026-07-27', endDate: '2026-07-27', timeSlot: '14:00-17:00', room: 'B201', teacher: '陈老师' },
  // 周二 · 2026-07-28
  { id: 'sch-2', courseId: 'course-2', title: 'Python 数据分析入门', startDate: '2026-07-28', endDate: '2026-07-28', timeSlot: '09:00-11:00', room: 'A102', teacher: '李老师' },
  { id: 'sch-27', courseId: 'course-18', title: 'Docker 容器化部署', startDate: '2026-07-28', endDate: '2026-07-28', timeSlot: '09:00-11:00', room: 'D401', teacher: '周老师' },
  { id: 'sch-28', courseId: 'course-19', title: '微服务架构设计', startDate: '2026-07-28', endDate: '2026-07-28', timeSlot: '14:00-17:00', room: 'D402', teacher: '钱老师' },
  // 周三 · 2026-07-29
  { id: 'sch-4', courseId: 'course-4', title: 'TypeScript 高级编程', startDate: '2026-07-29', endDate: '2026-07-29', timeSlot: '09:00-11:00', room: 'A101', teacher: '王老师' },
  { id: 'sch-5', courseId: 'course-5', title: '机器学习基础', startDate: '2026-07-29', endDate: '2026-07-29', timeSlot: '09:00-12:00', room: 'C301', teacher: '张老师' },
  { id: 'sch-11', courseId: 'course-12', title: '日语初级入门', startDate: '2026-07-29', endDate: '2026-07-29', timeSlot: '09:00-11:00', room: 'A102', teacher: '孙老师' },
  { id: 'sch-26', courseId: 'course-17', title: '英语口语进阶训练', startDate: '2026-07-29', endDate: '2026-07-29', timeSlot: '13:30-15:00', room: 'A103', teacher: '孙老师' },
  { id: 'sch-7', courseId: 'course-6', title: '项目管理实战', startDate: '2026-07-29', endDate: '2026-07-29', timeSlot: '14:00-16:00', room: 'B202', teacher: '刘老师' },
  // 周四 · 2026-07-30
  { id: 'sch-25', courseId: 'course-16', title: '高效沟通与表达训练', startDate: '2026-07-30', endDate: '2026-07-30', timeSlot: '09:00-10:30', room: 'B203', teacher: '吴老师' },
  { id: 'sch-8', courseId: 'course-9', title: 'Photoshop 图像处理', startDate: '2026-07-30', endDate: '2026-07-30', timeSlot: '09:00-12:00', room: 'B201', teacher: '陈老师' },
  { id: 'sch-23', courseId: 'course-14', title: 'AI 生成式应用开发', startDate: '2026-07-30', endDate: '2026-07-30', timeSlot: '14:00-16:00', room: 'D401', teacher: '周老师' },
  // 周五 · 2026-07-31
  { id: 'sch-10', courseId: 'course-11', title: 'Vue 3 组合式 API', startDate: '2026-07-31', endDate: '2026-07-31', timeSlot: '09:00-11:00', room: 'A101', teacher: '王老师' },
  { id: 'sch-29', courseId: 'course-20', title: '产品经理实战', startDate: '2026-07-31', endDate: '2026-07-31', timeSlot: '09:00-11:00', room: 'B203', teacher: '吴老师' },
  { id: 'sch-24', courseId: 'course-15', title: '数据可视化与商业分析', startDate: '2026-07-31', endDate: '2026-07-31', timeSlot: '14:00-16:00', room: 'C302', teacher: '钱老师' },
];

export const enrollments: Enrollment[] = [
  { id: 'enr-1', studentId: 'stu-1', courseId: 'course-1', scheduleId: 'sch-1', enrollDate: '2026-07-01', progress: 65, status: 'in_progress' },
  { id: 'enr-2', studentId: 'stu-2', courseId: 'course-1', scheduleId: 'sch-1', enrollDate: '2026-07-01', progress: 70, status: 'in_progress' },
  { id: 'enr-3', studentId: 'stu-3', courseId: 'course-2', scheduleId: 'sch-2', enrollDate: '2026-07-02', progress: 40, status: 'in_progress' },
  { id: 'enr-4', studentId: 'stu-4', courseId: 'course-2', scheduleId: 'sch-2', enrollDate: '2026-07-02', progress: 35, status: 'in_progress' },
  { id: 'enr-5', studentId: 'stu-5', courseId: 'course-3', scheduleId: 'sch-3', enrollDate: '2026-07-03', progress: 50, status: 'in_progress' },
  { id: 'enr-6', studentId: 'stu-1', courseId: 'course-4', scheduleId: 'sch-4', enrollDate: '2026-07-05', progress: 20, status: 'in_progress' },
  { id: 'enr-7', studentId: 'stu-6', courseId: 'course-4', scheduleId: 'sch-4', enrollDate: '2026-07-05', progress: 25, status: 'in_progress' },
  { id: 'enr-8', studentId: 'stu-7', courseId: 'course-5', scheduleId: 'sch-5', enrollDate: '2026-07-06', progress: 15, status: 'in_progress' },
  { id: 'enr-9', studentId: 'stu-8', courseId: 'course-5', scheduleId: 'sch-5', enrollDate: '2026-07-06', progress: 100, status: 'completed' },
  { id: 'enr-10', studentId: 'stu-9', courseId: 'course-6', scheduleId: 'sch-7', enrollDate: '2026-07-08', progress: 10, status: 'in_progress' },
  { id: 'enr-11', studentId: 'stu-10', courseId: 'course-9', scheduleId: 'sch-8', enrollDate: '2026-07-10', progress: 0, status: 'enrolled' },
  { id: 'enr-12', studentId: 'stu-11', courseId: 'course-10', scheduleId: 'sch-9', enrollDate: '2026-07-12', progress: 0, status: 'enrolled' },
  { id: 'enr-13', studentId: 'stu-12', courseId: 'course-11', scheduleId: 'sch-10', enrollDate: '2026-07-13', progress: 0, status: 'enrolled' },
  { id: 'enr-14', studentId: 'stu-13', courseId: 'course-12', scheduleId: 'sch-11', enrollDate: '2026-07-14', progress: 0, status: 'enrolled' },
  { id: 'enr-15', studentId: 'stu-14', courseId: 'course-3', scheduleId: 'sch-3', enrollDate: '2026-07-03', progress: 100, status: 'completed' },
  { id: 'enr-16', studentId: 'stu-15', courseId: 'course-1', scheduleId: 'sch-1', enrollDate: '2026-07-01', progress: 80, status: 'in_progress' },
  { id: 'enr-17', studentId: 'stu-16', courseId: 'course-2', scheduleId: 'sch-2', enrollDate: '2026-07-02', progress: 60, status: 'in_progress' },
  { id: 'enr-18', studentId: 'stu-2', courseId: 'course-5', scheduleId: 'sch-5', enrollDate: '2026-07-06', progress: 30, status: 'in_progress' },
  { id: 'enr-19', studentId: 'stu-4', courseId: 'course-6', scheduleId: 'sch-7', enrollDate: '2026-07-08', progress: 5, status: 'in_progress' },
  { id: 'enr-20', studentId: 'stu-7', courseId: 'course-10', scheduleId: 'sch-9', enrollDate: '2026-07-12', progress: 0, status: 'enrolled' },
  { id: 'enr-21', studentId: 'stu-1', courseId: 'course-14', scheduleId: 'sch-23', enrollDate: '2026-07-18', progress: 45, status: 'in_progress' },
  { id: 'enr-22', studentId: 'stu-1', courseId: 'course-15', scheduleId: 'sch-24', enrollDate: '2026-07-19', progress: 75, status: 'in_progress' },
  { id: 'enr-23', studentId: 'stu-1', courseId: 'course-16', scheduleId: 'sch-25', enrollDate: '2026-07-20', progress: 30, status: 'in_progress' },
  { id: 'enr-24', studentId: 'stu-2', courseId: 'course-17', scheduleId: 'sch-26', enrollDate: '2026-07-21', progress: 60, status: 'in_progress' },
  { id: 'enr-25', studentId: 'stu-17', courseId: 'course-14', scheduleId: 'sch-23', enrollDate: '2026-07-20', progress: 20, status: 'in_progress' },
  { id: 'enr-26', studentId: 'stu-17', courseId: 'course-18', scheduleId: 'sch-27', enrollDate: '2026-07-22', progress: 0, status: 'enrolled' },
  { id: 'enr-27', studentId: 'stu-17', courseId: 'course-1', scheduleId: 'sch-1', enrollDate: '2026-07-20', progress: 55, status: 'in_progress' },
  { id: 'enr-28', studentId: 'stu-18', courseId: 'course-15', scheduleId: 'sch-24', enrollDate: '2026-07-21', progress: 30, status: 'in_progress' },
  { id: 'enr-29', studentId: 'stu-18', courseId: 'course-19', scheduleId: 'sch-28', enrollDate: '2026-07-23', progress: 0, status: 'enrolled' },
  { id: 'enr-30', studentId: 'stu-19', courseId: 'course-3', scheduleId: 'sch-3', enrollDate: '2026-07-21', progress: 40, status: 'in_progress' },
  { id: 'enr-31', studentId: 'stu-19', courseId: 'course-16', scheduleId: 'sch-25', enrollDate: '2026-07-22', progress: 15, status: 'in_progress' },
  { id: 'enr-32', studentId: 'stu-19', courseId: 'course-10', scheduleId: 'sch-9', enrollDate: '2026-07-22', progress: 0, status: 'enrolled' },
  { id: 'enr-33', studentId: 'stu-20', courseId: 'course-5', scheduleId: 'sch-5', enrollDate: '2026-07-22', progress: 10, status: 'in_progress' },
  { id: 'enr-34', studentId: 'stu-20', courseId: 'course-20', scheduleId: 'sch-29', enrollDate: '2026-07-24', progress: 0, status: 'enrolled' },
  { id: 'enr-35', studentId: 'stu-21', courseId: 'course-12', scheduleId: 'sch-11', enrollDate: '2026-07-22', progress: 0, status: 'enrolled' },
  { id: 'enr-36', studentId: 'stu-21', courseId: 'course-17', scheduleId: 'sch-26', enrollDate: '2026-07-23', progress: 0, status: 'enrolled' },
  { id: 'enr-37', studentId: 'stu-22', courseId: 'course-1', scheduleId: 'sch-1', enrollDate: '2026-07-20', progress: 90, status: 'in_progress' },
  { id: 'enr-38', studentId: 'stu-22', courseId: 'course-4', scheduleId: 'sch-4', enrollDate: '2026-07-20', progress: 85, status: 'in_progress' },
  { id: 'enr-39', studentId: 'stu-22', courseId: 'course-14', scheduleId: 'sch-23', enrollDate: '2026-07-20', progress: 75, status: 'in_progress' },
  { id: 'enr-40', studentId: 'stu-22', courseId: 'course-15', scheduleId: 'sch-24', enrollDate: '2026-07-20', progress: 80, status: 'in_progress' },
  { id: 'enr-41', studentId: 'stu-23', courseId: 'course-2', scheduleId: 'sch-2', enrollDate: '2026-07-20', progress: 15, status: 'in_progress' },
  { id: 'enr-42', studentId: 'stu-23', courseId: 'course-10', scheduleId: 'sch-9', enrollDate: '2026-07-20', progress: 5, status: 'in_progress' },
  { id: 'enr-43', studentId: 'stu-23', courseId: 'course-16', scheduleId: 'sch-25', enrollDate: '2026-07-20', progress: 0, status: 'enrolled' },
  { id: 'enr-44', studentId: 'stu-24', courseId: 'course-1', scheduleId: 'sch-1', enrollDate: '2026-07-20', progress: 60, status: 'in_progress' },
  { id: 'enr-45', studentId: 'stu-24', courseId: 'course-5', scheduleId: 'sch-5', enrollDate: '2026-07-20', progress: 40, status: 'in_progress' },
  { id: 'enr-46', studentId: 'stu-24', courseId: 'course-11', scheduleId: 'sch-10', enrollDate: '2026-07-20', progress: 25, status: 'in_progress' },
  { id: 'enr-47', studentId: 'stu-24', courseId: 'course-18', scheduleId: 'sch-27', enrollDate: '2026-07-20', progress: 0, status: 'enrolled' },
];

/** AI 分层记录（key: `${courseId}||${studentId}`，与 store 中 studentTiers 一致） */
export const studentTiers: Record<string, import('@/types').StudentTierRecord> = {
  // course-1（React 前端开发实战）
  'course-1||stu-1': { courseId: 'course-1', studentId: 'stu-1', tier: 'excellent', score: 92, createdAt: '2026-07-10T10:00:00.000Z' },
  'course-1||stu-22': { courseId: 'course-1', studentId: 'stu-22', tier: 'excellent', score: 95, createdAt: '2026-07-10T10:00:00.000Z' },
  'course-1||stu-2': { courseId: 'course-1', studentId: 'stu-2', tier: 'advanced', score: 84, createdAt: '2026-07-10T10:00:00.000Z' },
  'course-1||stu-15': { courseId: 'course-1', studentId: 'stu-15', tier: 'advanced', score: 86, createdAt: '2026-07-10T10:00:00.000Z' },
  'course-1||stu-17': { courseId: 'course-1', studentId: 'stu-17', tier: 'basic', score: 62, createdAt: '2026-07-11T10:00:00.000Z' },
  // course-4（TypeScript 高级编程）
  'course-4||stu-1': { courseId: 'course-4', studentId: 'stu-1', tier: 'excellent', score: 90, createdAt: '2026-07-12T10:00:00.000Z' },
  'course-4||stu-22': { courseId: 'course-4', studentId: 'stu-22', tier: 'excellent', score: 94, createdAt: '2026-07-12T10:00:00.000Z' },
  'course-4||stu-6': { courseId: 'course-4', studentId: 'stu-6', tier: 'basic', score: 58, createdAt: '2026-07-12T10:00:00.000Z' },
  // course-11（Vue 3 组合式 API）
  'course-11||stu-12': { courseId: 'course-11', studentId: 'stu-12', tier: 'basic', score: 65, createdAt: '2026-07-13T10:00:00.000Z' },
  'course-11||stu-24': { courseId: 'course-11', studentId: 'stu-24', tier: 'advanced', score: 80, createdAt: '2026-07-13T10:00:00.000Z' },
}

export const teachers: Teacher[] = [
  { id: 't-1', name: '王老师', phone: '13800001001', email: 'wang@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang', courseIds: ['course-1', 'course-4', 'course-7', 'course-11'] },
  { id: 't-2', name: '李老师', phone: '13800001002', email: 'li@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li', courseIds: ['course-2', 'course-8'] },
  { id: 't-3', name: '陈老师', phone: '13800001003', email: 'chen@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chen', courseIds: ['course-3', 'course-9'] },
  { id: 't-4', name: '张老师', phone: '13800001004', email: 'zhang@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang', courseIds: ['course-5'] },
  { id: 't-5', name: '刘老师', phone: '13800001005', email: 'liu@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liu', courseIds: ['course-6', 'course-13'] },
  { id: 't-6', name: '赵老师', phone: '13800001006', email: 'zhao@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhao', courseIds: ['course-10'] },
  { id: 't-7', name: '孙老师', phone: '13800001007', email: 'sun@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sun', courseIds: ['course-12', 'course-17'] },
  { id: 't-8', name: '周老师', phone: '13800001008', email: 'zhou@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhou', courseIds: ['course-14', 'course-18'] },
  { id: 't-9', name: '钱老师', phone: '13800001009', email: 'qian@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=qian', courseIds: ['course-15', 'course-19'] },
  { id: 't-10', name: '吴老师', phone: '13800001010', email: 'wu@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wu', courseIds: ['course-16', 'course-20'] },
  { id: 't-11', name: '郑老师', phone: '13700002011', email: 'zheng@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zheng', courseIds: [] },
  { id: 't-12', name: '刘院长', phone: '13900003001', email: 'liuhead@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liuhead', courseIds: ['course-22'] },
];

/** 企业导师 */
export const mentors: Mentor[] = [
  { id: 'm-1', name: '张导师', phone: '13900002001', email: 'zhangmentor@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangmentor', courseIds: ['course-1', 'course-14'] },
  { id: 'm-2', name: '李导师', phone: '13900002002', email: 'limentor@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=limentor', courseIds: ['course-4', 'course-11'] },
  { id: 'm-3', name: '王导师', phone: '13900002003', email: 'wangmentor@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangmentor', courseIds: ['course-5', 'course-15'] },
  { id: 'm-4', name: '陈导师', phone: '13900002004', email: 'chenmentor@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenmentor', courseIds: ['course-3', 'course-20'] },
];

/** 学院领导 */
export const leaders: Leader[] = [
  { id: 'l-1', name: '刘院长', phone: '13900003001', email: 'liuhead@example.com', categoryIds: ['cat-1', 'cat-2'], asTeacher: true, teacherCourseIds: ['course-1', 'course-11'] },
  { id: 'l-2', name: '陈院长', phone: '13900003002', email: 'chenhead@example.com', categoryIds: ['cat-3', 'cat-4', 'cat-5'], asMentor: false },
  { id: 'l-3', name: '张院长', phone: '13900003003', email: 'zhanghead@example.com', categoryIds: ['cat-1', 'cat-4'], asMentor: true, mentorCourseIds: ['course-6', 'course-16'] },
  // 新增演示账号
  { id: 'l-4', name: '周院长', phone: '13900003004', email: 'zhouhead@example.com', categoryIds: ['cat-5'], asMentor: false },
  { id: 'l-5', name: '吴院长', phone: '13900003005', email: 'wuhead@example.com', categoryIds: ['cat-3'], asMentor: true, mentorCourseIds: ['course-3', 'course-9'] },
  { id: 'l-6', name: '郑院长', phone: '13900003006', email: 'zhenghead@example.com', categoryIds: ['cat-1'], asTeacher: true, teacherCourseIds: ['course-4', 'course-7'] },
];

export const grades: Grade[] = [
  { id: 'g-1', studentId: 'stu-1', courseId: 'course-1', score: 88, semester: '2026年', comment: '表现优秀', gradedAt: '2026-07-15' },
  { id: 'g-2', studentId: 'stu-2', courseId: 'course-1', score: 92, semester: '2026年', comment: '非常好', gradedAt: '2026-07-15' },
  { id: 'g-3', studentId: 'stu-3', courseId: 'course-2', score: 75, semester: '2026年', comment: '需要加强练习', gradedAt: '2026-07-16' },
  { id: 'g-4', studentId: 'stu-4', courseId: 'course-2', score: 80, semester: '2026年', comment: '良好', gradedAt: '2026-07-16' },
  { id: 'g-5', studentId: 'stu-5', courseId: 'course-3', score: 85, semester: '2026年', comment: '设计感不错', gradedAt: '2026-07-17' },
  { id: 'g-6', studentId: 'stu-8', courseId: 'course-5', score: 95, semester: '2026年', comment: '优秀学员', gradedAt: '2026-07-17' },
  { id: 'g-7', studentId: 'stu-14', courseId: 'course-3', score: 70, semester: '2026年', comment: '继续努力', gradedAt: '2026-07-15' },
  { id: 'g-8', studentId: 'stu-15', courseId: 'course-1', score: 90, semester: '2026年', comment: '很棒', gradedAt: '2026-07-16' },
  { id: 'g-9', studentId: 'stu-1', courseId: 'course-14', score: 86, semester: '2026年', comment: '具备较好的应用理解能力', gradedAt: '2026-07-22' },
  { id: 'g-10', studentId: 'stu-1', courseId: 'course-15', score: 91, semester: '2026年', comment: '数据分析能力突出', gradedAt: '2026-07-22' },
  { id: 'g-11', studentId: 'stu-1', courseId: 'course-16', score: 78, semester: '2026年', comment: '表达较清晰，继续加强节奏控制', gradedAt: '2026-07-23' },
  { id: 'g-12', studentId: 'stu-17', courseId: 'course-14', score: 82, semester: '2026年', comment: '应用能力较好，继续深入', gradedAt: '2026-07-25' },
  { id: 'g-13', studentId: 'stu-19', courseId: 'course-3', score: 76, semester: '2026年', comment: '设计基础扎实', gradedAt: '2026-07-24' },
  { id: 'g-14', studentId: 'stu-18', courseId: 'course-15', score: 88, semester: '2026年', comment: '数据分析能力出色', gradedAt: '2026-07-25' },
];

// ========== 评价系统 Mock 数据 ==========

export const evaluationConfigs: import('@/types').EvaluationConfig[] = [
  { courseId: 'course-1', template: 'all', frequency: 'biweekly', hasMentor: true, overdueRule: 'average' },
  { courseId: 'course-2', template: 'standard', frequency: 'per_unit', hasMentor: false, overdueRule: 'average' },
  { courseId: 'course-3', template: 'simple', frequency: 'biweekly', hasMentor: false, overdueRule: 'none' },
  { courseId: 'course-4', template: 'standard', frequency: 'biweekly', hasMentor: false, overdueRule: 'average' },
  { courseId: 'course-5', template: 'all', frequency: 'per_unit', hasMentor: true, overdueRule: 'average' },
  { courseId: 'course-6', template: 'simple', frequency: 'biweekly', hasMentor: false, overdueRule: 'none' },
  { courseId: 'course-9', template: 'standard', frequency: 'per_unit', hasMentor: false, overdueRule: 'average' },
  { courseId: 'course-10', template: 'simple', frequency: 'biweekly', hasMentor: false, overdueRule: 'none' },
  { courseId: 'course-11', template: 'standard', frequency: 'biweekly', hasMentor: false, overdueRule: 'average' },
  { courseId: 'course-12', template: 'simple', frequency: 'biweekly', hasMentor: false, overdueRule: 'none' },
  { courseId: 'course-14', template: 'project', frequency: 'project_milestone', hasMentor: true, overdueRule: 'average' },
  { courseId: 'course-15', template: 'standard', frequency: 'biweekly', hasMentor: false, overdueRule: 'average' },
  { courseId: 'course-16', template: 'simple', frequency: 'biweekly', hasMentor: false, overdueRule: 'none' },
  { courseId: 'course-17', template: 'standard', frequency: 'biweekly', hasMentor: false, overdueRule: 'average' },
  { courseId: 'course-18', template: 'project', frequency: 'project_milestone', hasMentor: true, overdueRule: 'average' },
  { courseId: 'course-19', template: 'project', frequency: 'project_milestone', hasMentor: true, overdueRule: 'average' },
  { courseId: 'course-20', template: 'standard', frequency: 'per_unit', hasMentor: false, overdueRule: 'average' },
];

export const studentGroups: import('@/types').StudentGroup[] = [
  { id: 'grp-1', courseId: 'course-1', name: '第一组', memberIds: ['stu-1', 'stu-2', 'stu-3', 'stu-4'] },
  { id: 'grp-2', courseId: 'course-1', name: '第二组', memberIds: ['stu-5', 'stu-6', 'stu-7', 'stu-8'] },
  { id: 'grp-3', courseId: 'course-1', name: '第三组', memberIds: ['stu-9', 'stu-10', 'stu-11', 'stu-12'] },
  { id: 'grp-4', courseId: 'course-1', name: '第四组', memberIds: ['stu-13', 'stu-15', 'stu-16'] },
  { id: 'grp-5', courseId: 'course-1', name: '第五组', memberIds: ['stu-17', 'stu-18', 'stu-19'] },
  { id: 'grp-6', courseId: 'course-2', name: 'A组', memberIds: ['stu-3', 'stu-4', 'stu-16'] },
  { id: 'grp-7', courseId: 'course-2', name: 'B组', memberIds: ['stu-6', 'stu-10', 'stu-12'] },
  { id: 'grp-8', courseId: 'course-3', name: '设计一组', memberIds: ['stu-5', 'stu-14', 'stu-19'] },
  { id: 'grp-9', courseId: 'course-4', name: 'TS学习小组', memberIds: ['stu-1', 'stu-6', 'stu-11'] },
  { id: 'grp-10', courseId: 'course-5', name: 'ML团队', memberIds: ['stu-7', 'stu-8', 'stu-20'] },
  { id: 'grp-11', courseId: 'course-14', name: 'A组', memberIds: ['stu-1', 'stu-17', 'stu-19'] },
  { id: 'grp-12', courseId: 'course-14', name: 'B组', memberIds: ['stu-2', 'stu-18', 'stu-20'] },
  { id: 'grp-13', courseId: 'course-14', name: 'C组', memberIds: ['stu-3', 'stu-5', 'stu-15'] },
  { id: 'grp-14', courseId: 'course-15', name: '数据分析组', memberIds: ['stu-1', 'stu-18', 'stu-21'] },
  { id: 'grp-15', courseId: 'course-16', name: '沟通训练组', memberIds: ['stu-1', 'stu-19'] },
  { id: 'grp-16', courseId: 'course-17', name: '英语学习组', memberIds: ['stu-2', 'stu-21'] },
  { id: 'grp-17', courseId: 'course-18', name: 'Docker实践组', memberIds: ['stu-17', 'stu-20'] },
  { id: 'grp-18', courseId: 'course-19', name: '架构设计组', memberIds: ['stu-1', 'stu-18'] },
  { id: 'grp-19', courseId: 'course-20', name: '产品组', memberIds: ['stu-20', 'stu-21'] },
];

export const evaluations: import('@/types').Evaluation[] = [
  // course-1（React）/ 第1次评价（1-2学时）/ 全评价模板
  { id: 'ev-1', courseId: 'course-1', studentId: 'stu-1', sessionNumber: 1, type: 'self', score: 85, evaluatorId: 'stu-1', evaluatorName: '张明', createdAt: '2026-07-10' },
  { id: 'ev-2', courseId: 'course-1', studentId: 'stu-1', sessionNumber: 1, type: 'intra_group', score: 80, evaluatorId: 'stu-2', evaluatorName: '李华', createdAt: '2026-07-10' },
  { id: 'ev-3', courseId: 'course-1', studentId: 'stu-1', sessionNumber: 1, type: 'inter_group', score: 78, evaluatorId: 'stu-5', evaluatorName: '王芳', createdAt: '2026-07-11' },
  { id: 'ev-4', courseId: 'course-1', studentId: 'stu-1', sessionNumber: 1, type: 'teacher', score: 82, evaluatorId: 't-1', evaluatorName: '王老师', comment: '基础知识掌握较好', createdAt: '2026-07-12' },
  { id: 'ev-5', courseId: 'course-1', studentId: 'stu-1', sessionNumber: 1, type: 'mentor', score: 80, evaluatorId: 'mentor-1', evaluatorName: '张总工', comment: '动手能力强', createdAt: '2026-07-13' },

  // course-1 / 第2次评价（3-4学时）
  { id: 'ev-6', courseId: 'course-1', studentId: 'stu-1', sessionNumber: 2, type: 'self', score: 90, evaluatorId: 'stu-1', evaluatorName: '张明', createdAt: '2026-07-14' },
  { id: 'ev-7', courseId: 'course-1', studentId: 'stu-1', sessionNumber: 2, type: 'teacher', score: 86, evaluatorId: 't-1', evaluatorName: '王老师', comment: '有进步', createdAt: '2026-07-15' },

  // course-2（Python）/ 标准评价（自评+教师+组间互评）
  { id: 'ev-8', courseId: 'course-2', studentId: 'stu-2', sessionNumber: 1, type: 'self', score: 70, evaluatorId: 'stu-2', evaluatorName: '李华', createdAt: '2026-07-12' },
  { id: 'ev-9', courseId: 'course-2', studentId: 'stu-2', sessionNumber: 1, type: 'teacher', score: 75, evaluatorId: 't-2', evaluatorName: '李老师', comment: '基础尚可，需加强练习', createdAt: '2026-07-13' },
  { id: 'ev-10', courseId: 'course-2', studentId: 'stu-2', sessionNumber: 1, type: 'inter_group', score: 68, evaluatorId: 'stu-5', evaluatorName: '王芳', createdAt: '2026-07-13' },

  // course-3（UI/UX）/ 简易评价（仅教师+自评）
  { id: 'ev-11', courseId: 'course-3', studentId: 'stu-3', sessionNumber: 1, type: 'self', score: 82, evaluatorId: 'stu-3', evaluatorName: '赵丽', createdAt: '2026-07-10' },
  { id: 'ev-12', courseId: 'course-3', studentId: 'stu-3', sessionNumber: 1, type: 'teacher', score: 75, evaluatorId: 't-3', evaluatorName: '陈老师', comment: '创意不错', createdAt: '2026-07-11' },

  // course-14（AI生成式）/ 项目制评价
  { id: 'ev-13', courseId: 'course-14', studentId: 'stu-1', sessionNumber: 1, type: 'self', score: 92, evaluatorId: 'stu-1', evaluatorName: '张明', createdAt: '2026-07-20' },
  { id: 'ev-14', courseId: 'course-14', studentId: 'stu-1', sessionNumber: 1, type: 'teacher', score: 86, evaluatorId: 't-8', evaluatorName: '周老师', comment: '理解深入', createdAt: '2026-07-21' },
  { id: 'ev-15', courseId: 'course-14', studentId: 'stu-1', sessionNumber: 1, type: 'mentor', score: 88, evaluatorId: 'mentor-2', evaluatorName: '李总监', comment: '项目实践优秀', createdAt: '2026-07-22' },

  // 自评与其他人差异过大的异常示例（course-1 / stu-5 第1次）
  { id: 'ev-16', courseId: 'course-1', studentId: 'stu-5', sessionNumber: 1, type: 'self', score: 98, evaluatorId: 'stu-5', evaluatorName: '王芳', createdAt: '2026-07-10' },
  { id: 'ev-17', courseId: 'course-1', studentId: 'stu-5', sessionNumber: 1, type: 'intra_group', score: 70, evaluatorId: 'stu-6', evaluatorName: '孙明', createdAt: '2026-07-10' },
  { id: 'ev-18', courseId: 'course-1', studentId: 'stu-5', sessionNumber: 1, type: 'inter_group', score: 65, evaluatorId: 'stu-1', evaluatorName: '张明', createdAt: '2026-07-11' },
  { id: 'ev-19', courseId: 'course-1', studentId: 'stu-5', sessionNumber: 1, type: 'teacher', score: 72, evaluatorId: 't-1', evaluatorName: '王老师', comment: '与自评差异较大', createdAt: '2026-07-12' },

  // 更多 course-1 学生评价（第2次）
  { id: 'ev-20', courseId: 'course-1', studentId: 'stu-2', sessionNumber: 2, type: 'self', score: 88, evaluatorId: 'stu-2', evaluatorName: '李华', createdAt: '2026-07-14' },
  { id: 'ev-21', courseId: 'course-1', studentId: 'stu-2', sessionNumber: 2, type: 'teacher', score: 90, evaluatorId: 't-1', evaluatorName: '王老师', comment: '保持良好表现', createdAt: '2026-07-15' },
  { id: 'ev-22', courseId: 'course-1', studentId: 'stu-3', sessionNumber: 2, type: 'self', score: 82, evaluatorId: 'stu-3', evaluatorName: '王芳', createdAt: '2026-07-14' },
  { id: 'ev-23', courseId: 'course-1', studentId: 'stu-3', sessionNumber: 2, type: 'intra_group', score: 80, evaluatorId: 'stu-4', evaluatorName: '赵磊', createdAt: '2026-07-14' },
  { id: 'ev-24', courseId: 'course-1', studentId: 'stu-3', sessionNumber: 2, type: 'teacher', score: 85, evaluatorId: 't-1', evaluatorName: '王老师', createdAt: '2026-07-15' },

  // course-15（数据可视化）评价
  { id: 'ev-25', courseId: 'course-15', studentId: 'stu-1', sessionNumber: 1, type: 'self', score: 90, evaluatorId: 'stu-1', evaluatorName: '张明', createdAt: '2026-07-20' },
  { id: 'ev-26', courseId: 'course-15', studentId: 'stu-1', sessionNumber: 1, type: 'teacher', score: 88, evaluatorId: 't-9', evaluatorName: '钱老师', comment: '可视化效果出色', createdAt: '2026-07-21' },
  { id: 'ev-27', courseId: 'course-15', studentId: 'stu-18', sessionNumber: 1, type: 'self', score: 85, evaluatorId: 'stu-18', evaluatorName: '慕容枫', createdAt: '2026-07-21' },
  { id: 'ev-28', courseId: 'course-15', studentId: 'stu-18', sessionNumber: 1, type: 'teacher', score: 82, evaluatorId: 't-9', evaluatorName: '钱老师', createdAt: '2026-07-22' },

  // course-16（高效沟通）评价
  { id: 'ev-29', courseId: 'course-16', studentId: 'stu-1', sessionNumber: 1, type: 'self', score: 80, evaluatorId: 'stu-1', evaluatorName: '张明', createdAt: '2026-07-22' },
  { id: 'ev-30', courseId: 'course-16', studentId: 'stu-1', sessionNumber: 1, type: 'teacher', score: 78, evaluatorId: 't-10', evaluatorName: '吴老师', comment: '表达还需加强', createdAt: '2026-07-23' },
  { id: 'ev-31', courseId: 'course-16', studentId: 'stu-19', sessionNumber: 1, type: 'self', score: 78, evaluatorId: 'stu-19', evaluatorName: '令狐冲', createdAt: '2026-07-22' },
  { id: 'ev-32', courseId: 'course-16', studentId: 'stu-19', sessionNumber: 1, type: 'teacher', score: 80, evaluatorId: 't-10', evaluatorName: '吴老师', createdAt: '2026-07-23' },

  // course-17（英语口语）评价
  { id: 'ev-33', courseId: 'course-17', studentId: 'stu-2', sessionNumber: 1, type: 'self', score: 82, evaluatorId: 'stu-2', evaluatorName: '李华', createdAt: '2026-07-21' },
  { id: 'ev-34', courseId: 'course-17', studentId: 'stu-2', sessionNumber: 1, type: 'teacher', score: 85, evaluatorId: 't-7', evaluatorName: '孙老师', comment: '口语进步明显', createdAt: '2026-07-22' },
  { id: 'ev-35', courseId: 'course-17', studentId: 'stu-21', sessionNumber: 1, type: 'self', score: 75, evaluatorId: 'stu-21', evaluatorName: '小龙女', createdAt: '2026-07-23' },
  { id: 'ev-36', courseId: 'course-17', studentId: 'stu-21', sessionNumber: 1, type: 'teacher', score: 78, evaluatorId: 't-7', evaluatorName: '孙老师', createdAt: '2026-07-24' },

  // course-5（机器学习）更多评价
  { id: 'ev-37', courseId: 'course-5', studentId: 'stu-7', sessionNumber: 1, type: 'self', score: 72, evaluatorId: 'stu-7', evaluatorName: '孙丽', createdAt: '2026-07-12' },
  { id: 'ev-38', courseId: 'course-5', studentId: 'stu-7', sessionNumber: 1, type: 'mentor', score: 75, evaluatorId: 'mentor-3', evaluatorName: '刘总工', comment: '基础扎实', createdAt: '2026-07-13' },
  { id: 'ev-39', courseId: 'course-5', studentId: 'stu-20', sessionNumber: 1, type: 'self', score: 70, evaluatorId: 'stu-20', evaluatorName: '杨过', createdAt: '2026-07-22' },
  { id: 'ev-40', courseId: 'course-5', studentId: 'stu-20', sessionNumber: 1, type: 'teacher', score: 72, evaluatorId: 't-4', evaluatorName: '张老师', createdAt: '2026-07-23' },
];

export const detailedGrades: import('@/types').DetailedGrade[] = [
  // 张明 (stu-1)
  { id: 'dg-1', studentId: 'stu-1', courseId: 'course-1', selfEvalScore: 88, peerReviewScore: 80, interGroupScore: 78, teacherScore: 84, mentorScore: 80, midtermExamScore: 85, midtermProjectScore: 82, finalExamScore: 90, finalProjectScore: 88, gradedAt: '2026-07-20' },
  { id: 'dg-2', studentId: 'stu-1', courseId: 'course-4', selfEvalScore: 78, peerReviewScore: 80, interGroupScore: 75, teacherScore: 82, mentorScore: null, gradedAt: '2026-07-18' },
  { id: 'dg-3', studentId: 'stu-1', courseId: 'course-14', selfEvalScore: 92, peerReviewScore: 88, interGroupScore: 85, teacherScore: 86, mentorScore: 88, finalExamScore: 80, finalProjectScore: 85, gradedAt: '2026-07-22' },
  { id: 'dg-4', studentId: 'stu-1', courseId: 'course-15', selfEvalScore: 90, peerReviewScore: 85, interGroupScore: 82, teacherScore: 88, mentorScore: null, finalExamScore: 92, finalProjectScore: 90, gradedAt: '2026-07-22' },
  { id: 'dg-5', studentId: 'stu-1', courseId: 'course-16', selfEvalScore: 75, peerReviewScore: 78, interGroupScore: null, teacherScore: 78, mentorScore: null, finalExamScore: 80, finalProjectScore: 76, gradedAt: '2026-07-23' },
  // 李华 (stu-2)
  { id: 'dg-6', studentId: 'stu-2', courseId: 'course-1', selfEvalScore: 85, peerReviewScore: 88, interGroupScore: 90, teacherScore: 92, mentorScore: 0, midtermExamScore: 88, midtermProjectScore: 90, finalExamScore: 94, finalProjectScore: 92, gradedAt: '2026-07-20' },
  { id: 'dg-7', studentId: 'stu-2', courseId: 'course-5', selfEvalScore: 75, peerReviewScore: 78, interGroupScore: 72, teacherScore: 80, mentorScore: null, gradedAt: '2026-07-17' },
  { id: 'dg-8', studentId: 'stu-2', courseId: 'course-17', selfEvalScore: 82, peerReviewScore: 80, interGroupScore: 78, teacherScore: 85, mentorScore: null, gradedAt: '2026-07-21' },
  // 王芳 (stu-3)
  { id: 'dg-9', studentId: 'stu-3', courseId: 'course-2', selfEvalScore: 70, peerReviewScore: 72, interGroupScore: 75, teacherScore: 75, mentorScore: null, finalExamScore: 78, finalProjectScore: 72, gradedAt: '2026-07-18' },
  // 赵磊 (stu-4)
  { id: 'dg-10', studentId: 'stu-4', courseId: 'course-2', selfEvalScore: 82, peerReviewScore: 78, interGroupScore: 80, teacherScore: 80, mentorScore: null, finalExamScore: 78, finalProjectScore: 82, gradedAt: '2026-07-18' },
  // 陈静 (stu-5)
  { id: 'dg-11', studentId: 'stu-5', courseId: 'course-3', selfEvalScore: 85, peerReviewScore: 85, interGroupScore: 88, teacherScore: 85, mentorScore: null, midtermExamScore: 88, midtermProjectScore: 82, finalExamScore: 86, finalProjectScore: 84, gradedAt: '2026-07-19' },
  // 刘洋 (stu-8)
  { id: 'dg-12', studentId: 'stu-8', courseId: 'course-5', selfEvalScore: 90, peerReviewScore: 92, interGroupScore: null, teacherScore: 95, mentorScore: null, finalExamScore: 96, finalProjectScore: 94, gradedAt: '2026-07-19' },
  // 胡敏 (stu-15)
  { id: 'dg-13', studentId: 'stu-15', courseId: 'course-1', selfEvalScore: 78, peerReviewScore: 85, interGroupScore: 88, teacherScore: 90, mentorScore: 0, midtermExamScore: 88, midtermProjectScore: 86, finalExamScore: 92, finalProjectScore: 90, gradedAt: '2026-07-18' },
  // 高飞 (stu-17)
  { id: 'dg-14', studentId: 'stu-17', courseId: 'course-14', selfEvalScore: 85, peerReviewScore: 82, interGroupScore: 80, teacherScore: 82, mentorScore: 85, finalExamScore: 82, finalProjectScore: 80, gradedAt: '2026-07-25' },
  { id: 'dg-15', studentId: 'stu-17', courseId: 'course-1', selfEvalScore: 80, peerReviewScore: 78, interGroupScore: 75, teacherScore: 82, mentorScore: 80, gradedAt: '2026-07-20' },
  // 周明 (stu-18)
  { id: 'dg-16', studentId: 'stu-18', courseId: 'course-15', selfEvalScore: 86, peerReviewScore: 82, interGroupScore: 80, teacherScore: 88, mentorScore: null, finalExamScore: 88, finalProjectScore: 90, gradedAt: '2026-07-25' },
  // 吴磊 (stu-19)
  { id: 'dg-17', studentId: 'stu-19', courseId: 'course-3', selfEvalScore: 78, peerReviewScore: 75, interGroupScore: 72, teacherScore: 76, mentorScore: null, finalExamScore: 78, finalProjectScore: 74, gradedAt: '2026-07-24' },
];

export const evalAnomalies: import('@/types').EvalAnomaly[] = [
  { id: 'anom-1', courseId: 'course-1', studentId: 'stu-5', studentName: '陈静', sessionNumber: 1, type: 'self', selfScore: 98, avgScore: 72, diff: 26, warning: '个人自评分数与平均分差异超过25分，请核实' },
  { id: 'anom-2', courseId: 'course-2', studentId: 'stu-3', studentName: '王芳', sessionNumber: 1, type: 'self', selfScore: 95, avgScore: 70, diff: 25, warning: '个人自评分数与平均分差异较大，请核实' },
  { id: 'anom-3', courseId: 'course-14', studentId: 'stu-17', studentName: '欧阳雪', sessionNumber: 1, type: 'self', selfScore: 88, avgScore: 85, diff: 3, warning: '个人自评与小组间评价存在小幅差异' },
  { id: 'anom-4', courseId: 'course-1', studentId: 'stu-1', studentName: '张明', sessionNumber: 1, type: 'inter_group', selfScore: 85, avgScore: 80, diff: 5, warning: '自评分数略高于组间评价' },
];

// ========== 评价待办提醒数据 ==========

export const evalReminders: import('@/types').EvalReminder[] = [
  { id: 'rem-1', courseId: 'course-1', courseTitle: 'React 前端开发实战', studentId: 'stu-1', sessionNumber: 3, deadline: '2026-07-28', status: 'pending' },
  { id: 'rem-2', courseId: 'course-1', courseTitle: 'React 前端开发实战', studentId: 'stu-2', sessionNumber: 3, deadline: '2026-07-28', status: 'pending' },
  { id: 'rem-3', courseId: 'course-2', courseTitle: 'Python 数据分析入门', studentId: 'stu-3', sessionNumber: 2, deadline: '2026-07-26', status: 'pending' },
  { id: 'rem-4', courseId: 'course-14', courseTitle: 'AI 生成式应用开发', studentId: 'stu-1', sessionNumber: 2, deadline: '2026-07-30', status: 'pending' },
  { id: 'rem-5', courseId: 'course-3', courseTitle: 'UI/UX 设计思维', studentId: 'stu-5', sessionNumber: 1, deadline: '2026-07-20', status: 'overdue' },
  { id: 'rem-6', courseId: 'course-15', courseTitle: '数据可视化与商业分析', studentId: 'stu-18', sessionNumber: 1, deadline: '2026-07-25', status: 'pending' },
  { id: 'rem-7', courseId: 'course-16', courseTitle: '高效沟通与表达训练', studentId: 'stu-19', sessionNumber: 1, deadline: '2026-07-24', status: 'completed' },
];

// ========== 云盘文件数据 ==========

export const cloudFiles: import('@/types').CloudFile[] = [
  { id: 'file-1', name: '课程大纲.pdf', size: 2048576, type: 'application/pdf', dataUrl: 'https://example.com/files/syllabus.pdf', uploadedAt: '2026-07-01', uploadedBy: '王老师', courseId: 'course-1' },
  { id: 'file-2', name: '实验报告模板.docx', size: 512000, type: 'application/docx', dataUrl: 'https://example.com/files/template.docx', uploadedAt: '2026-07-05', uploadedBy: '李老师', courseId: 'course-2' },
  { id: 'file-3', name: '项目需求说明.pdf', size: 1536000, type: 'application/pdf', dataUrl: 'https://example.com/files/requirements.pdf', uploadedAt: '2026-07-10', uploadedBy: '张明', courseId: 'course-14' },
  { id: 'file-4', name: '数据分析代码.zip', size: 3072000, type: 'application/zip', dataUrl: 'https://example.com/files/analysis.zip', uploadedAt: '2026-07-12', uploadedBy: '李华', courseId: 'course-2' },
  { id: 'file-5', name: 'UI设计稿.fig', size: 5120000, type: 'application/fig', dataUrl: 'https://example.com/files/design.fig', uploadedAt: '2026-07-15', uploadedBy: '陈静', courseId: 'course-3' },
  { id: 'file-6', name: '学习笔记.md', size: 25600, type: 'text/markdown', dataUrl: 'https://example.com/files/notes.md', uploadedAt: '2026-07-18', uploadedBy: '张明', courseId: 'course-1' },
  { id: 'file-7', name: '期末复习资料.pdf', size: 4096000, type: 'application/pdf', dataUrl: 'https://example.com/files/review.pdf', uploadedAt: '2026-07-20', uploadedBy: '王老师', courseId: 'course-1' },
  { id: 'file-8', name: 'React入门课件.pdf', size: 3072000, type: 'application/pdf', dataUrl: 'https://example.com/files/react-intro.pdf', uploadedAt: '2026-07-01', uploadedBy: '王老师', courseId: 'course-1' },
  { id: 'file-9', name: 'Python基础代码示例.zip', size: 512000, type: 'application/zip', dataUrl: 'https://example.com/files/python-examples.zip', uploadedAt: '2026-07-05', uploadedBy: '李老师', courseId: 'course-2' },
  { id: 'file-10', name: 'TypeScript进阶指南.pdf', size: 2048000, type: 'application/pdf', dataUrl: 'https://example.com/files/ts-guide.pdf', uploadedAt: '2026-07-15', uploadedBy: '王老师', courseId: 'course-4' },
  { id: 'file-11', name: '机器学习数据集.csv', size: 1024000, type: 'text/csv', dataUrl: 'https://example.com/files/ml-dataset.csv', uploadedAt: '2026-07-18', uploadedBy: '张老师', courseId: 'course-5' },
  { id: 'file-12', name: 'AI项目示例代码.zip', size: 4096000, type: 'application/zip', dataUrl: 'https://example.com/files/ai-project.zip', uploadedAt: '2026-07-20', uploadedBy: '周老师', courseId: 'course-14' },
];

// ========== 待办事项数据 ==========

export const todoItems: import('@/types').TodoItem[] = [
  { id: 'todo-1', title: '完成React课程第三单元作业', completed: false, createdAt: '2026-07-20', dueDate: '2026-07-25', createdBy: '张明' },
  { id: 'todo-2', title: '提交Python数据分析报告', completed: true, createdAt: '2026-07-18', dueDate: '2026-07-22', createdBy: '李华' },
  { id: 'todo-3', title: '准备小组演讲PPT', completed: false, createdAt: '2026-07-21', dueDate: '2026-07-28', createdBy: '王芳' },
  { id: 'todo-4', title: '复习TypeScript高级类型', completed: false, createdAt: '2026-07-22', createdBy: '张明' },
  { id: 'todo-5', title: '完成AI项目第一阶段代码', completed: false, createdAt: '2026-07-23', dueDate: '2026-07-30', createdBy: '欧阳雪' },
  { id: 'todo-6', title: '整理学习笔记并分享', completed: true, createdAt: '2026-07-19', createdBy: '李华' },
  { id: 'todo-7', title: '预约导师面谈时间', completed: false, createdAt: '2026-07-24', dueDate: '2026-07-26', createdBy: '张明' },
];

// ========== 在线文档数据 ==========

export const onlineDocs: import('@/types').OnlineDoc[] = [
  { id: 'doc-1', title: 'React学习小组协作文档', content: '# React 学习计划\n\n## 第一周\n- 学习Hooks基础\n- 完成计数器案例\n\n## 第二周\n- 学习useContext\n- 完成主题切换功能', createdBy: '张明', createdAt: '2026-07-01', lastEditedAt: '2026-07-20', lastEditedBy: '李华' },
  { id: 'doc-2', title: 'Python数据分析项目文档', content: '# 项目概述\n\n## 目标\n分析销售数据并生成可视化报告\n\n## 数据集\n- 销售记录.xlsx\n- 产品信息.csv', createdBy: '李老师', createdAt: '2026-07-05', lastEditedAt: '2026-07-18', lastEditedBy: '王芳' },
  { id: 'doc-3', title: 'UI/UX设计规范', content: '# 设计规范\n\n## 颜色方案\n- 主色：#3b82f6\n- 辅色：#10b981\n\n## 字体\n- 标题：Inter\n- 正文：Roboto', createdBy: '陈老师', createdAt: '2026-07-10', lastEditedAt: '2026-07-15', lastEditedBy: '陈老师' },
  { id: 'doc-4', title: 'AI项目技术方案', content: '# 技术方案\n\n## 模型选择\n使用GPT-4进行文本生成\n\n## 架构设计\n- 前端：Vue3 + TypeScript\n- 后端：Node.js + Express', createdBy: '周老师', createdAt: '2026-07-18', lastEditedAt: '2026-07-23', lastEditedBy: '欧阳雪' },
];

// ========== 笔记数据 ==========

export const notes: import('@/types').Note[] = [
  { id: 'note-1', title: 'React Hooks学习笔记', content: 'useState用于管理组件内部状态\nuseEffect用于副作用处理\nuseContext用于跨组件数据传递', createdAt: '2026-07-10', updatedAt: '2026-07-15', createdBy: '张明' },
  { id: 'note-2', title: 'Python Pandas常用操作', content: 'df.read_csv() - 读取CSV文件\ndf.groupby() - 分组聚合\ndf.merge() - 数据合并', createdAt: '2026-07-12', updatedAt: '2026-07-18', createdBy: '李华' },
  { id: 'note-3', title: '设计思维方法论', content: '用户研究 → 定义问题 → 创意发散 → 原型设计 → 测试验证', createdAt: '2026-07-14', updatedAt: '2026-07-14', createdBy: '王芳' },
  { id: 'note-4', title: 'TypeScript泛型笔记', content: '泛型函数：function identity<T>(arg: T): T\n泛型接口：interface Container<T>\n泛型类：class GenericNumber<T>', createdAt: '2026-07-16', updatedAt: '2026-07-20', createdBy: '张明' },
  { id: 'note-5', title: '机器学习算法总结', content: '线性回归：预测连续值\n决策树：分类问题\nSVM：高维数据分类\n神经网络：复杂模式识别', createdAt: '2026-07-18', updatedAt: '2026-07-22', createdBy: '欧阳雪' },
];

// ========== 仪表盘统计数据 ==========

export const homework: import('@/types').Homework[] = [
  { id: 'hw-1', courseId: 'course-1', title: '第1章课后作业', description: '完成React基础概念的练习题，包括组件、props、state等基础知识点', dueDate: '2026-07-25', createdAt: '2026-07-10', createdBy: '王老师' },
  { id: 'hw-2', courseId: 'course-1', title: '第2章课后作业', description: '使用Hooks实现一个计数器应用，包含useState、useEffect', dueDate: '2026-07-30', createdAt: '2026-07-15', createdBy: '王老师' },
  { id: 'hw-3', courseId: 'course-1', title: '第3章课后作业', description: '实现Context跨组件数据传递案例', dueDate: '2026-08-05', createdAt: '2026-07-20', createdBy: '王老师' },
  { id: 'hw-4', courseId: 'course-2', title: 'Python数据分析作业一', description: '使用Pandas读取CSV文件并进行数据清洗', dueDate: '2026-07-26', createdAt: '2026-07-12', createdBy: '李老师' },
  { id: 'hw-5', courseId: 'course-2', title: 'Python数据分析作业二', description: '使用Matplotlib进行数据可视化', dueDate: '2026-08-02', createdAt: '2026-07-18', createdBy: '李老师' },
  { id: 'hw-6', courseId: 'course-3', title: 'UI设计作业', description: '设计一个移动端App的首页界面', dueDate: '2026-07-28', createdAt: '2026-07-14', createdBy: '陈老师' },
  { id: 'hw-7', courseId: 'course-4', title: 'TypeScript泛型作业', description: '实现泛型函数和泛型接口', dueDate: '2026-07-27', createdAt: '2026-07-16', createdBy: '王老师' },
  { id: 'hw-8', courseId: 'course-5', title: '机器学习作业', description: '使用线性回归预测房价', dueDate: '2026-08-03', createdAt: '2026-07-18', createdBy: '张老师' },
  { id: 'hw-9', courseId: 'course-14', title: 'AI项目阶段性作业', description: '完成AI应用的第一阶段开发', dueDate: '2026-07-31', createdAt: '2026-07-20', createdBy: '周老师' },
  { id: 'hw-10', courseId: 'course-15', title: '数据可视化作业', description: '创建交互式数据仪表盘', dueDate: '2026-08-01', createdAt: '2026-07-22', createdBy: '钱老师' },
];

export const homeworkSubmissions: import('@/types').HomeworkSubmission[] = [
  { id: 'sub-1', homeworkId: 'hw-1', courseId: 'course-1', studentId: 'stu-1', submittedAt: '2026-07-24', fileName: 'React第1章作业.docx', fileDataUrl: 'https://example.com/submissions/react-hw1.docx', fileSize: 512000, fileType: 'application/docx' },
  { id: 'sub-2', homeworkId: 'hw-1', courseId: 'course-1', studentId: 'stu-2', submittedAt: '2026-07-23', fileName: '第1章作业.pdf', fileDataUrl: 'https://example.com/submissions/hw1-stu2.pdf', fileSize: 1024000, fileType: 'application/pdf' },
  { id: 'sub-3', homeworkId: 'hw-4', courseId: 'course-2', studentId: 'stu-3', submittedAt: '2026-07-25', fileName: '数据分析作业一.ipynb', fileDataUrl: 'https://example.com/submissions/python-hw1.ipynb', fileSize: 256000, fileType: 'application/ipynb' },
  { id: 'sub-4', homeworkId: 'hw-6', courseId: 'course-3', studentId: 'stu-5', submittedAt: '2026-07-27', fileName: 'UI设计稿.fig', fileDataUrl: 'https://example.com/submissions/ui-design.fig', fileSize: 5120000, fileType: 'application/fig' },
  { id: 'sub-5', homeworkId: 'hw-7', courseId: 'course-4', studentId: 'stu-1', submittedAt: '2026-07-26', fileName: 'TypeScript泛型作业.ts', fileDataUrl: 'https://example.com/submissions/ts-generics.ts', fileSize: 10240, fileType: 'text/typescript' },
];

export const dashboardStats: import('@/types').DashboardStats = {
  totalCourses: 20,
  totalStudents: 21,
  activeCourses: 16,
  recentEnrollments: 15,
};

// ========== 考试/项目成绩 Mock 数据（补充分项成绩详情） ==========

export const examScores: import('@/types').ExamScore[] = [
  // ====== course-1（React）/ 期中 + 项目 ======
  { id: 'es-1', courseId: 'course-1', studentId: 'stu-1', examName: '期中考试', score: 85, fullScore: 100, weight: 30, type: 'midterm_exam', status: 'submitted', createdAt: '2026-07-12', gradedAt: '2026-07-14' },
  { id: 'es-2', courseId: 'course-1', studentId: 'stu-1', examName: '项目答辩', score: 88, fullScore: 100, weight: 20, type: 'final_project', status: 'submitted', createdAt: '2026-07-19', gradedAt: '2026-07-21' },
  { id: 'es-3', courseId: 'course-1', studentId: 'stu-2', examName: '期中考试', score: 90, fullScore: 100, weight: 30, type: 'midterm_exam', status: 'submitted', createdAt: '2026-07-12', gradedAt: '2026-07-14' },
  { id: 'es-4', courseId: 'course-1', studentId: 'stu-2', examName: '项目答辩', score: 94, fullScore: 100, weight: 20, type: 'final_project', status: 'submitted', createdAt: '2026-07-19', gradedAt: '2026-07-21' },
  { id: 'es-5', courseId: 'course-1', studentId: 'stu-15', examName: '期中考试', score: 86, fullScore: 100, weight: 30, type: 'midterm_exam', status: 'submitted', createdAt: '2026-07-12', gradedAt: '2026-07-14' },
  { id: 'es-6', courseId: 'course-1', studentId: 'stu-15', examName: '项目答辩', score: 90, fullScore: 100, weight: 20, type: 'final_project', status: 'submitted', createdAt: '2026-07-19', gradedAt: '2026-07-21' },
  { id: 'es-7', courseId: 'course-1', studentId: 'stu-17', examName: '期中考试', score: 78, fullScore: 100, weight: 30, type: 'midterm_exam', status: 'submitted', createdAt: '2026-07-12', gradedAt: '2026-07-14' },
  { id: 'es-8', courseId: 'course-1', studentId: 'stu-17', examName: '项目答辩', score: 82, fullScore: 100, weight: 20, type: 'final_project', status: 'submitted', createdAt: '2026-07-19', gradedAt: '2026-07-21' },
  { id: 'es-9', courseId: 'course-1', studentId: 'stu-22', examName: '期中考试', score: 92, fullScore: 100, weight: 30, type: 'midterm_exam', status: 'submitted', createdAt: '2026-07-12', gradedAt: '2026-07-14' },
  { id: 'es-10', courseId: 'course-1', studentId: 'stu-22', examName: '项目答辩', score: 90, fullScore: 100, weight: 20, type: 'final_project', status: 'submitted', createdAt: '2026-07-19', gradedAt: '2026-07-21' },
  { id: 'es-11', courseId: 'course-1', studentId: 'stu-24', examName: '期中考试', score: 82, fullScore: 100, weight: 30, type: 'midterm_exam', status: 'submitted', createdAt: '2026-07-12', gradedAt: '2026-07-14' },
  { id: 'es-12', courseId: 'course-1', studentId: 'stu-24', examName: '项目答辩', score: 80, fullScore: 100, weight: 20, type: 'final_project', status: 'submitted', createdAt: '2026-07-19', gradedAt: '2026-07-21' },

  // ====== course-2（Python）/ 期末考试 + 项目 ======
  { id: 'es-13', courseId: 'course-2', studentId: 'stu-3', examName: '期末考试', score: 78, fullScore: 100, weight: 40, type: 'final_exam', status: 'submitted', createdAt: '2026-07-16', gradedAt: '2026-07-18' },
  { id: 'es-14', courseId: 'course-2', studentId: 'stu-3', examName: '数据分析项目', score: 72, fullScore: 100, weight: 30, type: 'final_project', status: 'submitted', createdAt: '2026-07-18', gradedAt: '2026-07-20' },
  { id: 'es-15', courseId: 'course-2', studentId: 'stu-4', examName: '期末考试', score: 82, fullScore: 100, weight: 40, type: 'final_exam', status: 'submitted', createdAt: '2026-07-16', gradedAt: '2026-07-18' },
  { id: 'es-16', courseId: 'course-2', studentId: 'stu-4', examName: '数据分析项目', score: 80, fullScore: 100, weight: 30, type: 'final_project', status: 'submitted', createdAt: '2026-07-18', gradedAt: '2026-07-20' },
  { id: 'es-17', courseId: 'course-2', studentId: 'stu-16', examName: '期末考试', score: 68, fullScore: 100, weight: 40, type: 'final_exam', status: 'submitted', createdAt: '2026-07-16', gradedAt: '2026-07-18' },
  { id: 'es-18', courseId: 'course-2', studentId: 'stu-16', examName: '数据分析项目', score: 72, fullScore: 100, weight: 30, type: 'final_project', status: 'submitted', createdAt: '2026-07-18', gradedAt: '2026-07-20' },
  { id: 'es-19', courseId: 'course-2', studentId: 'stu-23', examName: '期末考试', score: 60, fullScore: 100, weight: 40, type: 'final_exam', status: 'submitted', createdAt: '2026-07-16', gradedAt: '2026-07-18' },
  { id: 'es-20', courseId: 'course-2', studentId: 'stu-23', examName: '数据分析项目', score: 65, fullScore: 100, weight: 30, type: 'final_project', status: 'submitted', createdAt: '2026-07-18', gradedAt: '2026-07-20' },

  // ====== course-3（UI/UX）/ 期中 + 期末 ======
  { id: 'es-21', courseId: 'course-3', studentId: 'stu-5', examName: '期中考试', score: 88, fullScore: 100, weight: 40, type: 'midterm_exam', status: 'submitted', createdAt: '2026-07-17', gradedAt: '2026-07-18' },
  { id: 'es-22', courseId: 'course-3', studentId: 'stu-5', examName: '期末设计作品', score: 86, fullScore: 100, weight: 60, type: 'final_project', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },
  { id: 'es-23', courseId: 'course-3', studentId: 'stu-14', examName: '期中考试', score: 70, fullScore: 100, weight: 40, type: 'midterm_exam', status: 'submitted', createdAt: '2026-07-17', gradedAt: '2026-07-18' },
  { id: 'es-24', courseId: 'course-3', studentId: 'stu-14', examName: '期末设计作品', score: 72, fullScore: 100, weight: 60, type: 'final_project', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },
  { id: 'es-25', courseId: 'course-3', studentId: 'stu-19', examName: '期中考试', score: 78, fullScore: 100, weight: 40, type: 'midterm_exam', status: 'submitted', createdAt: '2026-07-17', gradedAt: '2026-07-18' },
  { id: 'es-26', courseId: 'course-3', studentId: 'stu-19', examName: '期末设计作品', score: 74, fullScore: 100, weight: 60, type: 'final_project', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },

  // ====== course-4（TypeScript）/ 期末测试 ======
  { id: 'es-27', courseId: 'course-4', studentId: 'stu-1', examName: '期末测试', score: 82, fullScore: 100, weight: 50, type: 'final_exam', status: 'submitted', createdAt: '2026-07-20', gradedAt: '2026-07-21' },
  { id: 'es-28', courseId: 'course-4', studentId: 'stu-6', examName: '期末测试', score: 72, fullScore: 100, weight: 50, type: 'final_exam', status: 'submitted', createdAt: '2026-07-20', gradedAt: '2026-07-21' },
  { id: 'es-29', courseId: 'course-4', studentId: 'stu-22', examName: '期末测试', score: 90, fullScore: 100, weight: 50, type: 'final_exam', status: 'submitted', createdAt: '2026-07-20', gradedAt: '2026-07-21' },

  // ====== course-5（机器学习）/ 项目 ======
  { id: 'es-30', courseId: 'course-5', studentId: 'stu-7', examName: '机器学习项目', score: 75, fullScore: 100, weight: 60, type: 'final_project', status: 'submitted', createdAt: '2026-07-18', gradedAt: '2026-07-19' },
  { id: 'es-31', courseId: 'course-5', studentId: 'stu-8', examName: '机器学习项目', score: 96, fullScore: 100, weight: 60, type: 'final_project', status: 'submitted', createdAt: '2026-07-18', gradedAt: '2026-07-19' },
  { id: 'es-32', courseId: 'course-5', studentId: 'stu-20', examName: '机器学习项目', score: 70, fullScore: 100, weight: 60, type: 'final_project', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },
  { id: 'es-33', courseId: 'course-5', studentId: 'stu-24', examName: '机器学习项目', score: 78, fullScore: 100, weight: 60, type: 'final_project', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },

  // ====== course-14（AI生成式）/ 阶段性项目 ======
  { id: 'es-34', courseId: 'course-14', studentId: 'stu-1', examName: '项目一：智能问答系统', score: 88, fullScore: 100, weight: 25, type: 'assignment', status: 'submitted', createdAt: '2026-07-20', gradedAt: '2026-07-21' },
  { id: 'es-35', courseId: 'course-14', studentId: 'stu-1', examName: '项目二：内容生成工具', score: 85, fullScore: 100, weight: 25, type: 'assignment', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },
  { id: 'es-36', courseId: 'course-14', studentId: 'stu-17', examName: '项目一：智能问答系统', score: 82, fullScore: 100, weight: 25, type: 'assignment', status: 'submitted', createdAt: '2026-07-20', gradedAt: '2026-07-21' },
  { id: 'es-37', courseId: 'course-14', studentId: 'stu-17', examName: '项目二：内容生成工具', score: 80, fullScore: 100, weight: 25, type: 'assignment', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },

  // ====== course-15（数据可视化）/ 期末 ======
  { id: 'es-38', courseId: 'course-15', studentId: 'stu-1', examName: '期末仪表盘项目', score: 92, fullScore: 100, weight: 50, type: 'final_project', status: 'submitted', createdAt: '2026-07-23', gradedAt: '2026-07-24' },
  { id: 'es-39', courseId: 'course-15', studentId: 'stu-18', examName: '期末仪表盘项目', score: 85, fullScore: 100, weight: 50, type: 'final_project', status: 'submitted', createdAt: '2026-07-23', gradedAt: '2026-07-24' },
  { id: 'es-40', courseId: 'course-15', studentId: 'stu-22', examName: '期末仪表盘项目', score: 90, fullScore: 100, weight: 50, type: 'final_project', status: 'submitted', createdAt: '2026-07-23', gradedAt: '2026-07-24' },

  // ====== course-16（有效沟通）/ 阶段性 ======
  { id: 'es-41', courseId: 'course-16', studentId: 'stu-1', examName: '演讲展示', score: 78, fullScore: 100, weight: 40, type: 'assignment', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },
  { id: 'es-42', courseId: 'course-16', studentId: 'stu-19', examName: '演讲展示', score: 80, fullScore: 100, weight: 40, type: 'assignment', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },
  { id: 'es-43', courseId: 'course-16', studentId: 'stu-23', examName: '演讲展示', score: 70, fullScore: 100, weight: 40, type: 'assignment', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },

  // ====== course-17（英语口语）/ 阶段性 ======
  { id: 'es-44', courseId: 'course-17', studentId: 'stu-2', examName: '口语测试', score: 85, fullScore: 100, weight: 50, type: 'quiz', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },
  { id: 'es-45', courseId: 'course-17', studentId: 'stu-21', examName: '口语测试', score: 76, fullScore: 100, weight: 50, type: 'quiz', status: 'submitted', createdAt: '2026-07-22', gradedAt: '2026-07-23' },
];

// ========== 补充学分绩点数据 ==========

export const supplementaryGrades: import('@/types').Grade[] = [
  // course-4（TypeScript）成绩
  { id: 'g-15', studentId: 'stu-1', courseId: 'course-4', score: 83, semester: '2026年', comment: '掌握良好', gradedAt: '2026-07-20' },
  { id: 'g-16', studentId: 'stu-6', courseId: 'course-4', score: 75, semester: '2026年', comment: '基础需要加强', gradedAt: '2026-07-20' },
  { id: 'g-17', studentId: 'stu-22', courseId: 'course-4', score: 91, semester: '2026年', comment: '非常优秀', gradedAt: '2026-07-20' },
  // course-2 补充成绩
  { id: 'g-18', studentId: 'stu-23', courseId: 'course-2', score: 68, semester: '2026年', comment: '需多加练习', gradedAt: '2026-07-19' },
  { id: 'g-19', studentId: 'stu-16', courseId: 'course-2', score: 72, semester: '2026年', comment: '数据感知能力提升空间大', gradedAt: '2026-07-19' },
  // course-5 补充成绩
  { id: 'g-20', studentId: 'stu-24', courseId: 'course-5', score: 78, semester: '2026年', comment: '理解不错', gradedAt: '2026-07-23' },
  // course-11（Vue3）
  { id: 'g-21', studentId: 'stu-12', courseId: 'course-11', score: 80, semester: '2026年', comment: '合格', gradedAt: '2026-07-20' },
  { id: 'g-22', studentId: 'stu-24', courseId: 'course-11', score: 72, semester: '2026年', comment: '需要跟上进度', gradedAt: '2026-07-20' },
  // course-12（日语）
  { id: 'g-23', studentId: 'stu-13', courseId: 'course-12', score: 85, semester: '2026年', comment: '学习态度认真', gradedAt: '2026-07-20' },
  { id: 'g-24', studentId: 'stu-21', courseId: 'course-12', score: 78, semester: '2026年', comment: '继续努力', gradedAt: '2026-07-20' },
  // course-9（Photoshop）
  { id: 'g-25', studentId: 'stu-11', courseId: 'course-9', score: 82, semester: '2026年', comment: '设计技巧有进步', gradedAt: '2026-07-18' },
  // course-10（商务英语）
  { id: 'g-26', studentId: 'stu-7', courseId: 'course-10', score: 76, semester: '2026年', comment: '语言表达一般', gradedAt: '2026-07-18' },
  { id: 'g-27', studentId: 'stu-23', courseId: 'course-10', score: 70, semester: '2026年', comment: '需要更多练习', gradedAt: '2026-07-20' },
];

// ========== 补充排课数据（每个活跃课程至少4-6次课，sch-30起） ==========

export const supplementarySchedules: Schedule[] = [
  // course-1（React，王老师）已有 sch-1，补充3次
  { id: 'sch-30', courseId: 'course-1', title: 'React 前端开发实战', startDate: '2026-07-13', endDate: '2026-07-13', timeSlot: '09:00-11:00', room: 'A101', teacher: '王老师' },
  { id: 'sch-31', courseId: 'course-1', title: 'React 前端开发实战', startDate: '2026-07-21', endDate: '2026-07-21', timeSlot: '09:00-11:00', room: 'A101', teacher: '王老师' },
  { id: 'sch-32', courseId: 'course-1', title: 'React 前端开发实战', startDate: '2026-07-28', endDate: '2026-07-28', timeSlot: '09:00-11:00', room: 'A101', teacher: '王老师' },

  // course-2（Python，李老师）已有 sch-2, sch-13，补充4次
  { id: 'sch-33', courseId: 'course-2', title: 'Python 数据分析入门', startDate: '2026-07-11', endDate: '2026-07-11', timeSlot: '09:00-11:00', room: 'A102', teacher: '李老师' },
  { id: 'sch-34', courseId: 'course-2', title: 'Python 数据分析入门', startDate: '2026-07-18', endDate: '2026-07-18', timeSlot: '09:00-11:00', room: 'A102', teacher: '李老师' },
  { id: 'sch-35', courseId: 'course-2', title: 'Python 数据分析入门', startDate: '2026-07-25', endDate: '2026-07-25', timeSlot: '14:00-16:00', room: 'A102', teacher: '李老师' },
  { id: 'sch-36', courseId: 'course-2', title: 'Python 数据分析入门', startDate: '2026-08-01', endDate: '2026-08-01', timeSlot: '09:00-11:00', room: 'A102', teacher: '李老师' },

  // course-3（UI/UX，陈老师）已有 sch-3, sch-14，补充4次
  { id: 'sch-37', courseId: 'course-3', title: 'UI/UX 设计思维', startDate: '2026-07-12', endDate: '2026-07-12', timeSlot: '09:00-12:00', room: 'B201', teacher: '陈老师' },
  { id: 'sch-38', courseId: 'course-3', title: 'UI/UX 设计思维', startDate: '2026-07-19', endDate: '2026-07-19', timeSlot: '14:00-17:00', room: 'B201', teacher: '陈老师' },
  { id: 'sch-39', courseId: 'course-3', title: 'UI/UX 设计思维', startDate: '2026-07-26', endDate: '2026-07-26', timeSlot: '09:00-12:00', room: 'B201', teacher: '陈老师' },
  { id: 'sch-40', courseId: 'course-3', title: 'UI/UX 设计思维', startDate: '2026-08-02', endDate: '2026-08-02', timeSlot: '14:00-17:00', room: 'B201', teacher: '陈老师' },

  // course-4（TypeScript，王老师）已有 sch-4（周三），补充3次（与主课表同周三）
  { id: 'sch-41', courseId: 'course-4', title: 'TypeScript 高级编程', startDate: '2026-07-15', endDate: '2026-07-15', timeSlot: '14:00-17:00', room: 'A101', teacher: '王老师' },
  { id: 'sch-42', courseId: 'course-4', title: 'TypeScript 高级编程', startDate: '2026-07-22', endDate: '2026-07-22', timeSlot: '09:00-12:00', room: 'A101', teacher: '王老师' },
  { id: 'sch-44', courseId: 'course-4', title: 'TypeScript 高级编程', startDate: '2026-08-05', endDate: '2026-08-05', timeSlot: '09:00-12:00', room: 'A101', teacher: '王老师' },

  // course-5（机器学习，张老师）已有 sch-5, sch-12, sch-22，补充3次
  { id: 'sch-45', courseId: 'course-5', title: '机器学习基础', startDate: '2026-07-19', endDate: '2026-07-19', timeSlot: '09:00-12:00', room: 'C301', teacher: '张老师' },
  { id: 'sch-46', courseId: 'course-5', title: '机器学习基础', startDate: '2026-07-26', endDate: '2026-07-26', timeSlot: '14:00-17:00', room: 'C301', teacher: '张老师' },
  { id: 'sch-47', courseId: 'course-5', title: '机器学习基础', startDate: '2026-08-02', endDate: '2026-08-02', timeSlot: '09:00-12:00', room: 'C301', teacher: '张老师' },

  // course-6（项目管理，刘老师）已有 sch-7, sch-16，补充4次
  { id: 'sch-48', courseId: 'course-6', title: '项目管理实战', startDate: '2026-07-13', endDate: '2026-07-13', timeSlot: '09:00-11:00', room: 'B202', teacher: '刘老师' },
  { id: 'sch-49', courseId: 'course-6', title: '项目管理实战', startDate: '2026-07-20', endDate: '2026-07-20', timeSlot: '14:00-16:00', room: 'B202', teacher: '刘老师' },
  { id: 'sch-50', courseId: 'course-6', title: '项目管理实战', startDate: '2026-07-27', endDate: '2026-07-27', timeSlot: '09:00-11:00', room: 'B202', teacher: '刘老师' },
  { id: 'sch-51', courseId: 'course-6', title: '项目管理实战', startDate: '2026-08-03', endDate: '2026-08-03', timeSlot: '14:00-16:00', room: 'B202', teacher: '刘老师' },

  // course-9（Photoshop，陈老师）已有 sch-8, sch-18，补充4次
  { id: 'sch-52', courseId: 'course-9', title: 'Photoshop 图像处理', startDate: '2026-07-15', endDate: '2026-07-15', timeSlot: '09:00-12:00', room: 'B201', teacher: '陈老师' },
  { id: 'sch-53', courseId: 'course-9', title: 'Photoshop 图像处理', startDate: '2026-07-22', endDate: '2026-07-22', timeSlot: '14:00-17:00', room: 'B201', teacher: '陈老师' },
  { id: 'sch-54', courseId: 'course-9', title: 'Photoshop 图像处理', startDate: '2026-07-29', endDate: '2026-07-29', timeSlot: '09:00-12:00', room: 'B201', teacher: '陈老师' },
  { id: 'sch-55', courseId: 'course-9', title: 'Photoshop 图像处理', startDate: '2026-08-05', endDate: '2026-08-05', timeSlot: '14:00-17:00', room: 'B201', teacher: '陈老师' },

  // course-10（商务英语，赵老师）已有 sch-9（周一），补充4次
  { id: 'sch-56', courseId: 'course-10', title: '商务英语沟通', startDate: '2026-07-13', endDate: '2026-07-13', timeSlot: '09:00-11:00', room: 'A102', teacher: '赵老师' },
  { id: 'sch-57', courseId: 'course-10', title: '商务英语沟通', startDate: '2026-07-20', endDate: '2026-07-20', timeSlot: '14:00-16:00', room: 'A102', teacher: '赵老师' },
  { id: 'sch-58', courseId: 'course-10', title: '商务英语沟通', startDate: '2026-08-03', endDate: '2026-08-03', timeSlot: '09:00-11:00', room: 'A102', teacher: '赵老师' },
  { id: 'sch-59', courseId: 'course-10', title: '商务英语沟通', startDate: '2026-08-10', endDate: '2026-08-10', timeSlot: '14:00-16:00', room: 'A102', teacher: '赵老师' },

  // course-11（Vue3，王老师）已有 sch-10，补充4次
  { id: 'sch-60', courseId: 'course-11', title: 'Vue 3 组合式 API', startDate: '2026-07-17', endDate: '2026-07-17', timeSlot: '14:00-16:00', room: 'A101', teacher: '王老师' },
  { id: 'sch-61', courseId: 'course-11', title: 'Vue 3 组合式 API', startDate: '2026-07-24', endDate: '2026-07-24', timeSlot: '09:00-11:00', room: 'A101', teacher: '王老师' },
  { id: 'sch-62', courseId: 'course-11', title: 'Vue 3 组合式 API', startDate: '2026-07-31', endDate: '2026-07-31', timeSlot: '14:00-16:00', room: 'A101', teacher: '王老师' },
  { id: 'sch-63', courseId: 'course-11', title: 'Vue 3 组合式 API', startDate: '2026-08-07', endDate: '2026-08-07', timeSlot: '09:00-11:00', room: 'A101', teacher: '王老师' },

  // course-12（日语，孙老师）已有 sch-11, sch-21，补充4次
  { id: 'sch-64', courseId: 'course-12', title: '日语初级入门', startDate: '2026-07-18', endDate: '2026-07-18', timeSlot: '09:00-11:00', room: 'A102', teacher: '孙老师' },
  { id: 'sch-65', courseId: 'course-12', title: '日语初级入门', startDate: '2026-07-25', endDate: '2026-07-25', timeSlot: '14:00-16:00', room: 'A102', teacher: '孙老师' },
  { id: 'sch-66', courseId: 'course-12', title: '日语初级入门', startDate: '2026-08-01', endDate: '2026-08-01', timeSlot: '09:00-11:00', room: 'A102', teacher: '孙老师' },
  { id: 'sch-67', courseId: 'course-12', title: '日语初级入门', startDate: '2026-08-08', endDate: '2026-08-08', timeSlot: '14:00-16:00', room: 'A102', teacher: '孙老师' },

  // course-14（AI生成式，周老师）已有 sch-23（周四），补充4次（同周四）
  { id: 'sch-68', courseId: 'course-14', title: 'AI 生成式应用开发', startDate: '2026-07-16', endDate: '2026-07-16', timeSlot: '09:00-11:00', room: 'D401', teacher: '周老师' },
  { id: 'sch-69', courseId: 'course-14', title: 'AI 生成式应用开发', startDate: '2026-07-23', endDate: '2026-07-23', timeSlot: '14:00-16:00', room: 'D401', teacher: '周老师' },
  { id: 'sch-70', courseId: 'course-14', title: 'AI 生成式应用开发', startDate: '2026-08-06', endDate: '2026-08-06', timeSlot: '09:00-11:00', room: 'D401', teacher: '周老师' },
  { id: 'sch-71', courseId: 'course-14', title: 'AI 生成式应用开发', startDate: '2026-08-13', endDate: '2026-08-13', timeSlot: '14:00-16:00', room: 'D401', teacher: '周老师' },

  // course-15（数据可视化，钱老师）已有 sch-24（周五），补充4次
  { id: 'sch-72', courseId: 'course-15', title: '数据可视化与商业分析', startDate: '2026-07-21', endDate: '2026-07-21', timeSlot: '14:00-16:00', room: 'C302', teacher: '钱老师' },
  { id: 'sch-73', courseId: 'course-15', title: '数据可视化与商业分析', startDate: '2026-07-28', endDate: '2026-07-28', timeSlot: '09:00-11:00', room: 'C302', teacher: '钱老师' },
  { id: 'sch-74', courseId: 'course-15', title: '数据可视化与商业分析', startDate: '2026-08-04', endDate: '2026-08-04', timeSlot: '14:00-16:00', room: 'C302', teacher: '钱老师' },
  { id: 'sch-75', courseId: 'course-15', title: '数据可视化与商业分析', startDate: '2026-08-11', endDate: '2026-08-11', timeSlot: '09:00-11:00', room: 'C302', teacher: '钱老师' },

  // course-16（高效沟通，吴老师）已有 sch-25（周四），补充4次（同周四）
  { id: 'sch-76', courseId: 'course-16', title: '高效沟通与表达训练', startDate: '2026-07-16', endDate: '2026-07-16', timeSlot: '09:00-10:30', room: 'B203', teacher: '吴老师' },
  { id: 'sch-77', courseId: 'course-16', title: '高效沟通与表达训练', startDate: '2026-07-23', endDate: '2026-07-23', timeSlot: '14:00-15:30', room: 'B203', teacher: '吴老师' },
  { id: 'sch-78', courseId: 'course-16', title: '高效沟通与表达训练', startDate: '2026-08-06', endDate: '2026-08-06', timeSlot: '09:00-10:30', room: 'B203', teacher: '吴老师' },
  { id: 'sch-79', courseId: 'course-16', title: '高效沟通与表达训练', startDate: '2026-08-13', endDate: '2026-08-13', timeSlot: '14:00-15:30', room: 'B203', teacher: '吴老师' },

  // course-17（英语口语，孙老师）已有 sch-26，补充4次
  { id: 'sch-80', courseId: 'course-17', title: '英语口语进阶训练', startDate: '2026-07-23', endDate: '2026-07-23', timeSlot: '13:30-15:00', room: 'A103', teacher: '孙老师' },
  { id: 'sch-81', courseId: 'course-17', title: '英语口语进阶训练', startDate: '2026-07-30', endDate: '2026-07-30', timeSlot: '09:00-10:30', room: 'A103', teacher: '孙老师' },
  { id: 'sch-82', courseId: 'course-17', title: '英语口语进阶训练', startDate: '2026-08-06', endDate: '2026-08-06', timeSlot: '13:30-15:00', room: 'A103', teacher: '孙老师' },
  { id: 'sch-83', courseId: 'course-17', title: '英语口语进阶训练', startDate: '2026-08-13', endDate: '2026-08-13', timeSlot: '09:00-10:30', room: 'A103', teacher: '孙老师' },

  // course-18（Docker，周老师）已有 sch-27，补充4次
  { id: 'sch-84', courseId: 'course-18', title: 'Docker 容器化部署', startDate: '2026-07-24', endDate: '2026-07-24', timeSlot: '09:00-11:00', room: 'D401', teacher: '周老师' },
  { id: 'sch-85', courseId: 'course-18', title: 'Docker 容器化部署', startDate: '2026-07-31', endDate: '2026-07-31', timeSlot: '14:00-16:00', room: 'D401', teacher: '周老师' },
  { id: 'sch-86', courseId: 'course-18', title: 'Docker 容器化部署', startDate: '2026-08-07', endDate: '2026-08-07', timeSlot: '09:00-11:00', room: 'D401', teacher: '周老师' },
  { id: 'sch-87', courseId: 'course-18', title: 'Docker 容器化部署', startDate: '2026-08-14', endDate: '2026-08-14', timeSlot: '14:00-16:00', room: 'D401', teacher: '周老师' },

  // course-19（微服务，钱老师）已有 sch-28，补充4次
  { id: 'sch-88', courseId: 'course-19', title: '微服务架构设计', startDate: '2026-07-25', endDate: '2026-07-25', timeSlot: '14:00-17:00', room: 'D402', teacher: '钱老师' },
  { id: 'sch-89', courseId: 'course-19', title: '微服务架构设计', startDate: '2026-08-01', endDate: '2026-08-01', timeSlot: '09:00-12:00', room: 'D402', teacher: '钱老师' },
  { id: 'sch-90', courseId: 'course-19', title: '微服务架构设计', startDate: '2026-08-08', endDate: '2026-08-08', timeSlot: '14:00-17:00', room: 'D402', teacher: '钱老师' },
  { id: 'sch-91', courseId: 'course-19', title: '微服务架构设计', startDate: '2026-08-15', endDate: '2026-08-15', timeSlot: '09:00-12:00', room: 'D402', teacher: '钱老师' },

  // course-20（产品经理，吴老师）已有 sch-29，补充4次
  { id: 'sch-92', courseId: 'course-20', title: '产品经理实战', startDate: '2026-07-26', endDate: '2026-07-26', timeSlot: '09:00-11:00', room: 'B203', teacher: '吴老师' },
  { id: 'sch-93', courseId: 'course-20', title: '产品经理实战', startDate: '2026-08-02', endDate: '2026-08-02', timeSlot: '14:00-16:00', room: 'B203', teacher: '吴老师' },
  { id: 'sch-94', courseId: 'course-20', title: '产品经理实战', startDate: '2026-08-09', endDate: '2026-08-09', timeSlot: '09:00-11:00', room: 'B203', teacher: '吴老师' },
  { id: 'sch-95', courseId: 'course-20', title: '产品经理实战', startDate: '2026-08-16', endDate: '2026-08-16', timeSlot: '14:00-16:00', room: 'B203', teacher: '吴老师' },
];

// ====== 管理员端演示排课（按分类名匹配 title） ======
export const adminDemoSchedules: Schedule[] = [
  // 高等数学（cat-6，数理学院）
  { id: 'dmo-1', courseId: 'cat-6', title: '高等数学', startDate: '2026-07-28', endDate: '2026-07-28', timeSlot: '08:00-10:00', room: '教1-101', teacher: '李老师' },
  { id: 'dmo-2', courseId: 'cat-6', title: '高等数学', startDate: '2026-07-28', endDate: '2026-07-28', timeSlot: '10:15-12:15', room: '教1-101', teacher: '李老师' },
  { id: 'dmo-3', courseId: 'cat-6', title: '高等数学', startDate: '2026-07-30', endDate: '2026-07-30', timeSlot: '08:00-10:00', room: '教1-102', teacher: '张老师' },
  { id: 'dmo-4', courseId: 'cat-6', title: '高等数学', startDate: '2026-08-01', endDate: '2026-08-01', timeSlot: '09:00-11:00', room: '教1-101', teacher: '李老师' },
  { id: 'dmo-5', courseId: 'cat-6', title: '高等数学', startDate: '2026-08-04', endDate: '2026-08-04', timeSlot: '14:00-16:00', room: '教1-201', teacher: '张老师' },

  // 大学物理（cat-7，数理学院）
  { id: 'dmo-6', courseId: 'cat-7', title: '大学物理', startDate: '2026-07-29', endDate: '2026-07-29', timeSlot: '08:00-10:00', room: '物-301', teacher: '赵老师' },
  { id: 'dmo-7', courseId: 'cat-7', title: '大学物理', startDate: '2026-07-31', endDate: '2026-07-31', timeSlot: '14:00-16:00', room: '物-302', teacher: '赵老师' },
  { id: 'dmo-8', courseId: 'cat-7', title: '大学物理', startDate: '2026-08-05', endDate: '2026-08-05', timeSlot: '08:00-10:00', room: '物-301', teacher: '钱老师' },

  // 前端设计（cat-8，计算机学院）
  { id: 'dmo-9', courseId: 'cat-8', title: '前端设计', startDate: '2026-07-28', endDate: '2026-07-28', timeSlot: '09:00-12:00', room: '实-201', teacher: '陈老师' },
  { id: 'dmo-10', courseId: 'cat-8', title: '前端设计', startDate: '2026-07-30', endDate: '2026-07-30', timeSlot: '14:00-17:00', room: '实-202', teacher: '陈老师' },
  { id: 'dmo-11', courseId: 'cat-8', title: '前端设计', startDate: '2026-08-03', endDate: '2026-08-03', timeSlot: '09:00-12:00', room: '实-201', teacher: '周老师' },
  { id: 'dmo-12', courseId: 'cat-8', title: '前端设计', startDate: '2026-08-06', endDate: '2026-08-06', timeSlot: '09:00-12:00', room: '实-201', teacher: '陈老师' },

  // 后端架构（cat-9，计算机学院）
  { id: 'dmo-13', courseId: 'cat-9', title: '后端架构', startDate: '2026-07-29', endDate: '2026-07-29', timeSlot: '09:00-12:00', room: '实-301', teacher: '王老师' },
  { id: 'dmo-14', courseId: 'cat-9', title: '后端架构', startDate: '2026-07-31', endDate: '2026-07-31', timeSlot: '14:00-17:00', room: '实-302', teacher: '王老师' },
  { id: 'dmo-15', courseId: 'cat-9', title: '后端架构', startDate: '2026-08-03', endDate: '2026-08-03', timeSlot: '09:00-12:00', room: '实-301', teacher: '刘老师' },
  { id: 'dmo-16', courseId: 'cat-9', title: '后端架构', startDate: '2026-08-05', endDate: '2026-08-05', timeSlot: '14:00-17:00', room: '实-301', teacher: '王老师' },
  { id: 'dmo-17', courseId: 'cat-9', title: '后端架构', startDate: '2026-08-07', endDate: '2026-08-07', timeSlot: '09:00-12:00', room: '实-302', teacher: '刘老师' },

  // 商务翻译（cat-10，外国语学院）
  { id: 'dmo-18', courseId: 'cat-10', title: '商务翻译', startDate: '2026-07-29', endDate: '2026-07-29', timeSlot: '14:00-16:00', room: '外-201', teacher: '孙老师' },
  { id: 'dmo-19', courseId: 'cat-10', title: '商务翻译', startDate: '2026-08-01', endDate: '2026-08-01', timeSlot: '09:00-11:00', room: '外-202', teacher: '赵老师' },
  { id: 'dmo-20', courseId: 'cat-10', title: '商务翻译', startDate: '2026-08-05', endDate: '2026-08-05', timeSlot: '14:00-16:00', room: '外-201', teacher: '孙老师' },
];

// ========== 补充选课数据（enr-48起） ==========

export const supplementaryEnrollments: Enrollment[] = [
  // course-14（AI生成式应用开发）
  { id: 'enr-48', studentId: 'stu-2', courseId: 'course-14', scheduleId: 'sch-23', enrollDate: '2026-07-20', progress: 30, status: 'in_progress' },
  { id: 'enr-49', studentId: 'stu-3', courseId: 'course-14', scheduleId: 'sch-23', enrollDate: '2026-07-20', progress: 25, status: 'in_progress' },
  { id: 'enr-50', studentId: 'stu-5', courseId: 'course-14', scheduleId: 'sch-23', enrollDate: '2026-07-20', progress: 40, status: 'in_progress' },
  { id: 'enr-51', studentId: 'stu-15', courseId: 'course-14', scheduleId: 'sch-23', enrollDate: '2026-07-20', progress: 35, status: 'in_progress' },
  { id: 'enr-52', studentId: 'stu-22', courseId: 'course-14', scheduleId: 'sch-23', enrollDate: '2026-07-20', progress: 75, status: 'in_progress' },
  { id: 'enr-53', studentId: 'stu-23', courseId: 'course-14', scheduleId: 'sch-23', enrollDate: '2026-07-20', progress: 10, status: 'in_progress' },

  // course-15（数据可视化与商业分析）
  { id: 'enr-54', studentId: 'stu-2', courseId: 'course-15', scheduleId: 'sch-24', enrollDate: '2026-07-21', progress: 50, status: 'in_progress' },
  { id: 'enr-55', studentId: 'stu-3', courseId: 'course-15', scheduleId: 'sch-24', enrollDate: '2026-07-21', progress: 45, status: 'in_progress' },
  { id: 'enr-56', studentId: 'stu-22', courseId: 'course-15', scheduleId: 'sch-24', enrollDate: '2026-07-21', progress: 80, status: 'in_progress' },

  // course-16（高效沟通与表达训练）
  { id: 'enr-57', studentId: 'stu-2', courseId: 'course-16', scheduleId: 'sch-25', enrollDate: '2026-07-22', progress: 20, status: 'enrolled' },
  { id: 'enr-58', studentId: 'stu-5', courseId: 'course-16', scheduleId: 'sch-25', enrollDate: '2026-07-22', progress: 25, status: 'enrolled' },
  { id: 'enr-59', studentId: 'stu-23', courseId: 'course-16', scheduleId: 'sch-25', enrollDate: '2026-07-22', progress: 5, status: 'enrolled' },

  // course-17（英语口语进阶训练）
  { id: 'enr-60', studentId: 'stu-1', courseId: 'course-17', scheduleId: 'sch-26', enrollDate: '2026-07-23', progress: 35, status: 'in_progress' },
  { id: 'enr-61', studentId: 'stu-5', courseId: 'course-17', scheduleId: 'sch-26', enrollDate: '2026-07-23', progress: 40, status: 'in_progress' },
  { id: 'enr-62', studentId: 'stu-23', courseId: 'course-17', scheduleId: 'sch-26', enrollDate: '2026-07-23', progress: 10, status: 'in_progress' },

  // course-18（Docker 容器化部署）
  { id: 'enr-63', studentId: 'stu-1', courseId: 'course-18', scheduleId: 'sch-27', enrollDate: '2026-07-24', progress: 20, status: 'in_progress' },
  { id: 'enr-64', studentId: 'stu-20', courseId: 'course-18', scheduleId: 'sch-27', enrollDate: '2026-07-24', progress: 15, status: 'in_progress' },
  { id: 'enr-65', studentId: 'stu-22', courseId: 'course-18', scheduleId: 'sch-27', enrollDate: '2026-07-24', progress: 50, status: 'in_progress' },
  { id: 'enr-66', studentId: 'stu-24', courseId: 'course-18', scheduleId: 'sch-27', enrollDate: '2026-07-24', progress: 15, status: 'in_progress' },

  // course-19（微服务架构设计）
  { id: 'enr-67', studentId: 'stu-1', courseId: 'course-19', scheduleId: 'sch-28', enrollDate: '2026-07-25', progress: 15, status: 'in_progress' },
  { id: 'enr-68', studentId: 'stu-20', courseId: 'course-19', scheduleId: 'sch-28', enrollDate: '2026-07-25', progress: 10, status: 'in_progress' },
  { id: 'enr-69', studentId: 'stu-22', courseId: 'course-19', scheduleId: 'sch-28', enrollDate: '2026-07-25', progress: 60, status: 'in_progress' },

  // course-20（产品经理实战）
  { id: 'enr-70', studentId: 'stu-1', courseId: 'course-20', scheduleId: 'sch-29', enrollDate: '2026-07-26', progress: 30, status: 'in_progress' },
  { id: 'enr-71', studentId: 'stu-5', courseId: 'course-20', scheduleId: 'sch-29', enrollDate: '2026-07-26', progress: 25, status: 'in_progress' },
  { id: 'enr-72', studentId: 'stu-19', courseId: 'course-20', scheduleId: 'sch-29', enrollDate: '2026-07-26', progress: 20, status: 'in_progress' },
];

// ========== 补充评价数据（ev-41起） ==========

export const supplementaryEvaluations: import('@/types').Evaluation[] = [
  // course-1 第3轮：stu-15, stu-17, stu-22, stu-24
  { id: 'ev-41', courseId: 'course-1', studentId: 'stu-15', sessionNumber: 3, type: 'self', score: 88, evaluatorId: 'stu-15', evaluatorName: '胡敏', createdAt: '2026-07-21' },
  { id: 'ev-42', courseId: 'course-1', studentId: 'stu-15', sessionNumber: 3, type: 'teacher', score: 85, evaluatorId: 't-1', evaluatorName: '王老师', comment: '持续进步中', createdAt: '2026-07-22' },
  { id: 'ev-43', courseId: 'course-1', studentId: 'stu-17', sessionNumber: 3, type: 'self', score: 82, evaluatorId: 'stu-17', evaluatorName: '欧阳雪', createdAt: '2026-07-21' },
  { id: 'ev-44', courseId: 'course-1', studentId: 'stu-17', sessionNumber: 3, type: 'intra_group', score: 80, evaluatorId: 'stu-18', evaluatorName: '慕容枫', createdAt: '2026-07-21' },
  { id: 'ev-45', courseId: 'course-1', studentId: 'stu-17', sessionNumber: 3, type: 'teacher', score: 82, evaluatorId: 't-1', evaluatorName: '王老师', createdAt: '2026-07-22' },
  { id: 'ev-46', courseId: 'course-1', studentId: 'stu-22', sessionNumber: 3, type: 'self', score: 95, evaluatorId: 'stu-22', evaluatorName: '独孤求败', createdAt: '2026-07-21' },
  { id: 'ev-47', courseId: 'course-1', studentId: 'stu-22', sessionNumber: 3, type: 'intra_group', score: 92, evaluatorId: 'stu-24', evaluatorName: '乔峰', createdAt: '2026-07-21' },
  { id: 'ev-48', courseId: 'course-1', studentId: 'stu-22', sessionNumber: 3, type: 'teacher', score: 94, evaluatorId: 't-1', evaluatorName: '王老师', comment: '表现卓越', createdAt: '2026-07-22' },
  { id: 'ev-49', courseId: 'course-1', studentId: 'stu-24', sessionNumber: 3, type: 'self', score: 80, evaluatorId: 'stu-24', evaluatorName: '乔峰', createdAt: '2026-07-21' },
  { id: 'ev-50', courseId: 'course-1', studentId: 'stu-24', sessionNumber: 3, type: 'teacher', score: 78, evaluatorId: 't-1', evaluatorName: '王老师', createdAt: '2026-07-22' },

  // course-2 第1轮完整评价：stu-3, stu-4, stu-16, stu-23（自评+教师）
  { id: 'ev-51', courseId: 'course-2', studentId: 'stu-3', sessionNumber: 1, type: 'self', score: 85, evaluatorId: 'stu-3', evaluatorName: '王芳', createdAt: '2026-07-12' },
  { id: 'ev-52', courseId: 'course-2', studentId: 'stu-3', sessionNumber: 1, type: 'teacher', score: 78, evaluatorId: 't-2', evaluatorName: '李老师', comment: '基础不错，继续加油', createdAt: '2026-07-13' },
  { id: 'ev-53', courseId: 'course-2', studentId: 'stu-4', sessionNumber: 1, type: 'self', score: 82, evaluatorId: 'stu-4', evaluatorName: '赵磊', createdAt: '2026-07-12' },
  { id: 'ev-54', courseId: 'course-2', studentId: 'stu-4', sessionNumber: 1, type: 'teacher', score: 80, evaluatorId: 't-2', evaluatorName: '李老师', createdAt: '2026-07-13' },
  { id: 'ev-55', courseId: 'course-2', studentId: 'stu-16', sessionNumber: 1, type: 'self', score: 72, evaluatorId: 'stu-16', evaluatorName: '高飞', createdAt: '2026-07-12' },
  { id: 'ev-56', courseId: 'course-2', studentId: 'stu-16', sessionNumber: 1, type: 'teacher', score: 68, evaluatorId: 't-2', evaluatorName: '李老师', comment: '需要多加练习', createdAt: '2026-07-13' },
  { id: 'ev-57', courseId: 'course-2', studentId: 'stu-23', sessionNumber: 1, type: 'self', score: 65, evaluatorId: 'stu-23', evaluatorName: '韦小宝', createdAt: '2026-07-12' },
  { id: 'ev-58', courseId: 'course-2', studentId: 'stu-23', sessionNumber: 1, type: 'teacher', score: 60, evaluatorId: 't-2', evaluatorName: '李老师', comment: '基础薄弱，需投入更多时间', createdAt: '2026-07-13' },

  // course-4 第1轮：stu-1, stu-6, stu-22
  { id: 'ev-59', courseId: 'course-4', studentId: 'stu-1', sessionNumber: 1, type: 'self', score: 82, evaluatorId: 'stu-1', evaluatorName: '张明', createdAt: '2026-07-14' },
  { id: 'ev-60', courseId: 'course-4', studentId: 'stu-1', sessionNumber: 1, type: 'teacher', score: 80, evaluatorId: 't-1', evaluatorName: '王老师', createdAt: '2026-07-15' },
  { id: 'ev-61', courseId: 'course-4', studentId: 'stu-6', sessionNumber: 1, type: 'self', score: 70, evaluatorId: 'stu-6', evaluatorName: '刘洋', createdAt: '2026-07-14' },
  { id: 'ev-62', courseId: 'course-4', studentId: 'stu-6', sessionNumber: 1, type: 'teacher', score: 72, evaluatorId: 't-1', evaluatorName: '王老师', comment: '类型概念需加强', createdAt: '2026-07-15' },
  { id: 'ev-63', courseId: 'course-4', studentId: 'stu-22', sessionNumber: 1, type: 'self', score: 92, evaluatorId: 'stu-22', evaluatorName: '独孤求败', createdAt: '2026-07-14' },
  { id: 'ev-64', courseId: 'course-4', studentId: 'stu-22', sessionNumber: 1, type: 'teacher', score: 90, evaluatorId: 't-1', evaluatorName: '王老师', comment: '类型系统掌握很好', createdAt: '2026-07-15' },

  // course-11 第1轮：stu-12, stu-24
  { id: 'ev-65', courseId: 'course-11', studentId: 'stu-12', sessionNumber: 1, type: 'self', score: 78, evaluatorId: 'stu-12', evaluatorName: '林伟', createdAt: '2026-07-16' },
  { id: 'ev-66', courseId: 'course-11', studentId: 'stu-12', sessionNumber: 1, type: 'teacher', score: 75, evaluatorId: 't-1', evaluatorName: '王老师', createdAt: '2026-07-17' },
  { id: 'ev-67', courseId: 'course-11', studentId: 'stu-24', sessionNumber: 1, type: 'self', score: 72, evaluatorId: 'stu-24', evaluatorName: '乔峰', createdAt: '2026-07-16' },
  { id: 'ev-68', courseId: 'course-11', studentId: 'stu-24', sessionNumber: 1, type: 'teacher', score: 70, evaluatorId: 't-1', evaluatorName: '王老师', comment: '需多熟悉组合式API', createdAt: '2026-07-17' },

  // course-14 第2轮：stu-1, stu-17
  { id: 'ev-69', courseId: 'course-14', studentId: 'stu-1', sessionNumber: 2, type: 'self', score: 90, evaluatorId: 'stu-1', evaluatorName: '张明', createdAt: '2026-07-24' },
  { id: 'ev-70', courseId: 'course-14', studentId: 'stu-1', sessionNumber: 2, type: 'teacher', score: 88, evaluatorId: 't-8', evaluatorName: '周老师', createdAt: '2026-07-25' },
  { id: 'ev-71', courseId: 'course-14', studentId: 'stu-17', sessionNumber: 2, type: 'self', score: 84, evaluatorId: 'stu-17', evaluatorName: '欧阳雪', createdAt: '2026-07-24' },
  { id: 'ev-72', courseId: 'course-14', studentId: 'stu-17', sessionNumber: 2, type: 'teacher', score: 82, evaluatorId: 't-8', evaluatorName: '周老师', createdAt: '2026-07-25' },

  // course-18 第1轮：stu-17, stu-20, stu-1
  { id: 'ev-73', courseId: 'course-18', studentId: 'stu-17', sessionNumber: 1, type: 'self', score: 80, evaluatorId: 'stu-17', evaluatorName: '欧阳雪', createdAt: '2026-07-24' },
  { id: 'ev-74', courseId: 'course-18', studentId: 'stu-17', sessionNumber: 1, type: 'teacher', score: 78, evaluatorId: 't-8', evaluatorName: '周老师', createdAt: '2026-07-25' },
  { id: 'ev-75', courseId: 'course-18', studentId: 'stu-20', sessionNumber: 1, type: 'self', score: 72, evaluatorId: 'stu-20', evaluatorName: '杨过', createdAt: '2026-07-24' },
  { id: 'ev-76', courseId: 'course-18', studentId: 'stu-20', sessionNumber: 1, type: 'teacher', score: 70, evaluatorId: 't-8', evaluatorName: '周老师', comment: '需要熟悉基本Docker命令', createdAt: '2026-07-25' },
  { id: 'ev-77', courseId: 'course-18', studentId: 'stu-1', sessionNumber: 1, type: 'self', score: 82, evaluatorId: 'stu-1', evaluatorName: '张明', createdAt: '2026-07-24' },
  { id: 'ev-78', courseId: 'course-18', studentId: 'stu-1', sessionNumber: 1, type: 'teacher', score: 80, evaluatorId: 't-8', evaluatorName: '周老师', createdAt: '2026-07-25' },

  // course-19 第1轮：stu-1, stu-18, stu-20
  { id: 'ev-79', courseId: 'course-19', studentId: 'stu-1', sessionNumber: 1, type: 'self', score: 85, evaluatorId: 'stu-1', evaluatorName: '张明', createdAt: '2026-07-26' },
  { id: 'ev-80', courseId: 'course-19', studentId: 'stu-1', sessionNumber: 1, type: 'teacher', score: 82, evaluatorId: 't-9', evaluatorName: '钱老师', createdAt: '2026-07-27' },
  { id: 'ev-81', courseId: 'course-19', studentId: 'stu-18', sessionNumber: 1, type: 'self', score: 80, evaluatorId: 'stu-18', evaluatorName: '慕容枫', createdAt: '2026-07-26' },
  { id: 'ev-82', courseId: 'course-19', studentId: 'stu-18', sessionNumber: 1, type: 'teacher', score: 82, evaluatorId: 't-9', evaluatorName: '钱老师', createdAt: '2026-07-27' },
  { id: 'ev-83', courseId: 'course-19', studentId: 'stu-20', sessionNumber: 1, type: 'self', score: 72, evaluatorId: 'stu-20', evaluatorName: '杨过', createdAt: '2026-07-26' },
  { id: 'ev-84', courseId: 'course-19', studentId: 'stu-20', sessionNumber: 1, type: 'teacher', score: 70, evaluatorId: 't-9', evaluatorName: '钱老师', comment: '微服务概念需加强理解', createdAt: '2026-07-27' },

  // course-20 第1轮：stu-20, stu-21
  { id: 'ev-85', courseId: 'course-20', studentId: 'stu-20', sessionNumber: 1, type: 'self', score: 76, evaluatorId: 'stu-20', evaluatorName: '杨过', createdAt: '2026-07-27' },
  { id: 'ev-86', courseId: 'course-20', studentId: 'stu-20', sessionNumber: 1, type: 'teacher', score: 74, evaluatorId: 't-10', evaluatorName: '吴老师', createdAt: '2026-07-28' },
  { id: 'ev-87', courseId: 'course-20', studentId: 'stu-21', sessionNumber: 1, type: 'self', score: 80, evaluatorId: 'stu-21', evaluatorName: '小龙女', createdAt: '2026-07-27' },
  { id: 'ev-88', courseId: 'course-20', studentId: 'stu-21', sessionNumber: 1, type: 'teacher', score: 78, evaluatorId: 't-10', evaluatorName: '吴老师', comment: '需求分析能力较好', createdAt: '2026-07-28' },
];

// ========== 补充作业提交记录（sub-6起，至少15条） ==========

export const supplementaryHomeworkSubmissions: import('@/types').HomeworkSubmission[] = [
  // course-1, hw-2
  { id: 'sub-6', homeworkId: 'hw-2', courseId: 'course-1', studentId: 'stu-1', submittedAt: '2026-07-29', fileName: 'Hooks计数器实现.tsx', fileDataUrl: 'https://example.com/submissions/hooks-counter.tsx', fileSize: 15360, fileType: 'text/typescript' },
  { id: 'sub-7', homeworkId: 'hw-2', courseId: 'course-1', studentId: 'stu-2', submittedAt: '2026-07-28', fileName: 'counter-app.zip', fileDataUrl: 'https://example.com/submissions/counter-app.zip', fileSize: 204800, fileType: 'application/zip' },
  { id: 'sub-8', homeworkId: 'hw-2', courseId: 'course-1', studentId: 'stu-15', submittedAt: '2026-07-29', fileName: 'react-counter.jsx', fileDataUrl: 'https://example.com/submissions/react-counter.jsx', fileSize: 8192, fileType: 'text/javascript' },
  // course-1, hw-3
  { id: 'sub-9', homeworkId: 'hw-3', courseId: 'course-1', studentId: 'stu-1', submittedAt: '2026-08-04', fileName: 'Context主题切换.tsx', fileDataUrl: 'https://example.com/submissions/context-theme.tsx', fileSize: 12288, fileType: 'text/typescript' },
  { id: 'sub-10', homeworkId: 'hw-3', courseId: 'course-1', studentId: 'stu-22', submittedAt: '2026-08-03', fileName: 'advanced-context.tsx', fileDataUrl: 'https://example.com/submissions/advanced-context.tsx', fileSize: 20480, fileType: 'text/typescript' },
  { id: 'sub-11', homeworkId: 'hw-3', courseId: 'course-1', studentId: 'stu-24', submittedAt: '2026-08-04', fileName: 'context-app.tsx', fileDataUrl: 'https://example.com/submissions/context-app.tsx', fileSize: 10240, fileType: 'text/typescript' },
  // course-2, hw-5
  { id: 'sub-12', homeworkId: 'hw-5', courseId: 'course-2', studentId: 'stu-3', submittedAt: '2026-08-01', fileName: '数据可视化报告.ipynb', fileDataUrl: 'https://example.com/submissions/vis-report.ipynb', fileSize: 512000, fileType: 'application/ipynb' },
  { id: 'sub-13', homeworkId: 'hw-5', courseId: 'course-2', studentId: 'stu-4', submittedAt: '2026-07-31', fileName: 'matplotlib-charts.ipynb', fileDataUrl: 'https://example.com/submissions/matplotlib-charts.ipynb', fileSize: 384000, fileType: 'application/ipynb' },
  { id: 'sub-14', homeworkId: 'hw-5', courseId: 'course-2', studentId: 'stu-23', submittedAt: '2026-08-01', fileName: 'charts-basic.ipynb', fileDataUrl: 'https://example.com/submissions/charts-basic.ipynb', fileSize: 128000, fileType: 'application/ipynb' },
  // course-3, hw-6
  { id: 'sub-15', homeworkId: 'hw-6', courseId: 'course-3', studentId: 'stu-5', submittedAt: '2026-07-27', fileName: '移动端首页设计.fig', fileDataUrl: 'https://example.com/submissions/mobile-home.fig', fileSize: 4096000, fileType: 'application/fig' },
  { id: 'sub-16', homeworkId: 'hw-6', courseId: 'course-3', studentId: 'stu-19', submittedAt: '2026-07-27', fileName: 'app-design.fig', fileDataUrl: 'https://example.com/submissions/app-design.fig', fileSize: 3072000, fileType: 'application/fig' },
  // course-4, hw-7
  { id: 'sub-17', homeworkId: 'hw-7', courseId: 'course-4', studentId: 'stu-1', submittedAt: '2026-07-26', fileName: '泛型练习.ts', fileDataUrl: 'https://example.com/submissions/generics-practice.ts', fileSize: 8192, fileType: 'text/typescript' },
  { id: 'sub-18', homeworkId: 'hw-7', courseId: 'course-4', studentId: 'stu-22', submittedAt: '2026-07-25', fileName: 'advanced-generics.ts', fileDataUrl: 'https://example.com/submissions/advanced-generics.ts', fileSize: 12288, fileType: 'text/typescript' },
  // course-14, hw-9
  { id: 'sub-19', homeworkId: 'hw-9', courseId: 'course-14', studentId: 'stu-1', submittedAt: '2026-07-30', fileName: 'AI问答系统源码.zip', fileDataUrl: 'https://example.com/submissions/ai-qa-source.zip', fileSize: 3072000, fileType: 'application/zip' },
  { id: 'sub-20', homeworkId: 'hw-9', courseId: 'course-14', studentId: 'stu-17', submittedAt: '2026-07-29', fileName: 'ai-app-stage1.zip', fileDataUrl: 'https://example.com/submissions/ai-app-stage1.zip', fileSize: 2048000, fileType: 'application/zip' },
  // course-15, hw-10
  { id: 'sub-21', homeworkId: 'hw-10', courseId: 'course-15', studentId: 'stu-1', submittedAt: '2026-07-31', fileName: 'dashboard仪表盘源码.zip', fileDataUrl: 'https://example.com/submissions/dashboard-source.zip', fileSize: 4096000, fileType: 'application/zip' },
  { id: 'sub-22', homeworkId: 'hw-10', courseId: 'course-15', studentId: 'stu-22', submittedAt: '2026-07-31', fileName: 'data-dashboard.zip', fileDataUrl: 'https://example.com/submissions/data-dashboard.zip', fileSize: 5120000, fileType: 'application/zip' },
];

// ========== 补充分项成绩（dg-18起） ==========

export const supplementaryDetailedGrades: import('@/types').DetailedGrade[] = [
  // 独孤求败(stu-22)
  { id: 'dg-18', studentId: 'stu-22', courseId: 'course-1', selfEvalScore: 95, peerReviewScore: 92, interGroupScore: 90, teacherScore: 94, mentorScore: 88, midtermExamScore: 92, midtermProjectScore: 90, finalExamScore: 90, finalProjectScore: 88, gradedAt: '2026-07-22' },
  { id: 'dg-19', studentId: 'stu-22', courseId: 'course-4', selfEvalScore: 92, peerReviewScore: 90, interGroupScore: 88, teacherScore: 91, mentorScore: null, finalExamScore: 90, finalProjectScore: null, gradedAt: '2026-07-21' },
  { id: 'dg-20', studentId: 'stu-22', courseId: 'course-14', selfEvalScore: 88, peerReviewScore: 85, interGroupScore: 86, teacherScore: 86, mentorScore: 85, finalExamScore: 82, finalProjectScore: 85, gradedAt: '2026-07-25' },
  { id: 'dg-21', studentId: 'stu-22', courseId: 'course-15', selfEvalScore: 90, peerReviewScore: 88, interGroupScore: 85, teacherScore: 90, mentorScore: null, finalExamScore: 90, finalProjectScore: 88, gradedAt: '2026-07-24' },

  // 乔峰(stu-24)
  { id: 'dg-22', studentId: 'stu-24', courseId: 'course-1', selfEvalScore: 80, peerReviewScore: 78, interGroupScore: 76, teacherScore: 78, mentorScore: 75, midtermExamScore: 82, midtermProjectScore: 78, finalExamScore: 80, finalProjectScore: 78, gradedAt: '2026-07-22' },
  { id: 'dg-23', studentId: 'stu-24', courseId: 'course-5', selfEvalScore: 75, peerReviewScore: 72, interGroupScore: 70, teacherScore: 78, mentorScore: null, finalExamScore: null, finalProjectScore: 78, gradedAt: '2026-07-23' },
  { id: 'dg-24', studentId: 'stu-24', courseId: 'course-11', selfEvalScore: 72, peerReviewScore: 70, interGroupScore: 68, teacherScore: 70, mentorScore: null, finalExamScore: 72, finalProjectScore: null, gradedAt: '2026-07-21' },
  { id: 'dg-25', studentId: 'stu-24', courseId: 'course-18', selfEvalScore: 70, peerReviewScore: 68, interGroupScore: null, teacherScore: 72, mentorScore: null, finalExamScore: null, finalProjectScore: 70, gradedAt: '2026-07-25' },

  // 韦小宝(stu-23)
  { id: 'dg-26', studentId: 'stu-23', courseId: 'course-2', selfEvalScore: 65, peerReviewScore: 60, interGroupScore: 62, teacherScore: 68, mentorScore: null, finalExamScore: 60, finalProjectScore: 65, gradedAt: '2026-07-20' },
  { id: 'dg-27', studentId: 'stu-23', courseId: 'course-10', selfEvalScore: 70, peerReviewScore: 68, interGroupScore: null, teacherScore: 70, mentorScore: null, finalExamScore: 72, finalProjectScore: null, gradedAt: '2026-07-21' },
  { id: 'dg-28', studentId: 'stu-23', courseId: 'course-16', selfEvalScore: 68, peerReviewScore: 65, interGroupScore: null, teacherScore: 70, mentorScore: null, finalExamScore: 70, finalProjectScore: 68, gradedAt: '2026-07-23' },

  // 杨过(stu-20)
  { id: 'dg-29', studentId: 'stu-20', courseId: 'course-5', selfEvalScore: 70, peerReviewScore: 68, interGroupScore: 72, teacherScore: 72, mentorScore: null, finalExamScore: null, finalProjectScore: 70, gradedAt: '2026-07-23' },
  { id: 'dg-30', studentId: 'stu-20', courseId: 'course-20', selfEvalScore: 76, peerReviewScore: 72, interGroupScore: 70, teacherScore: 74, mentorScore: null, finalExamScore: 76, finalProjectScore: 72, gradedAt: '2026-07-28' },

  // 欧阳雪(stu-17)
  { id: 'dg-31', studentId: 'stu-17', courseId: 'course-18', selfEvalScore: 80, peerReviewScore: 78, interGroupScore: 76, teacherScore: 78, mentorScore: null, finalExamScore: null, finalProjectScore: 80, gradedAt: '2026-07-25' },

  // 令狐冲(stu-19)
  { id: 'dg-32', studentId: 'stu-19', courseId: 'course-10', selfEvalScore: 80, peerReviewScore: 78, interGroupScore: null, teacherScore: 80, mentorScore: null, finalExamScore: 82, finalProjectScore: null, gradedAt: '2026-07-22' },
  { id: 'dg-33', studentId: 'stu-19', courseId: 'course-16', selfEvalScore: 78, peerReviewScore: 75, interGroupScore: null, teacherScore: 80, mentorScore: null, finalExamScore: 80, finalProjectScore: 78, gradedAt: '2026-07-24' },
];

// ========== 补充学生分组（grp-20起） ==========

export const supplementaryStudentGroups: import('@/types').StudentGroup[] = [
  { id: 'grp-20', courseId: 'course-18', name: 'DevOps组', memberIds: ['stu-1', 'stu-22', 'stu-24'] },
  { id: 'grp-21', courseId: 'course-19', name: '微服务组', memberIds: ['stu-20', 'stu-22', 'stu-17'] },
  { id: 'grp-22', courseId: 'course-20', name: '需求分析组', memberIds: ['stu-1', 'stu-5', 'stu-19'] },
  { id: 'grp-23', courseId: 'course-15', name: '可视化组', memberIds: ['stu-2', 'stu-3', 'stu-22'] },
];

// ========== 补充作业数据（hw-11起） ==========

export const supplementaryHomework: import('@/types').Homework[] = [
  // course-1（React）
  { id: 'hw-11', courseId: 'course-1', title: '第4章课后作业', description: '使用useReducer和useContext实现一个购物车功能', dueDate: '2026-08-12', createdAt: '2026-07-25', createdBy: '王老师' },
  { id: 'hw-12', courseId: 'course-1', title: '第5章课后作业', description: '实现自定义Hook：useLocalStorage和useDebounce', dueDate: '2026-08-20', createdAt: '2026-07-28', createdBy: '王老师' },
  { id: 'hw-13', courseId: 'course-1', title: '综合实战项目', description: '使用React全家桶完成一个任务管理应用', dueDate: '2026-08-30', createdAt: '2026-08-01', createdBy: '王老师' },
  // course-2（Python）
  { id: 'hw-14', courseId: 'course-2', title: 'Python数据分析作业三', description: '使用Pandas进行数据聚合和分组分析', dueDate: '2026-08-09', createdAt: '2026-07-25', createdBy: '李老师' },
  { id: 'hw-15', courseId: 'course-2', title: 'Python期末项目', description: '选择一个数据集完成完整的数据分析报告', dueDate: '2026-08-20', createdAt: '2026-07-30', createdBy: '李老师' },
  // course-3（UI/UX）
  { id: 'hw-16', courseId: 'course-3', title: '用户研究作业', description: '完成一份用户访谈和用户画像报告', dueDate: '2026-08-05', createdAt: '2026-07-20', createdBy: '陈老师' },
  { id: 'hw-17', courseId: 'course-3', title: '原型设计作业', description: '使用Figma制作高保真交互原型', dueDate: '2026-08-15', createdAt: '2026-07-25', createdBy: '陈老师' },
  { id: 'hw-18', courseId: 'course-3', title: 'UX评估报告', description: '对现有App进行可用性测试并撰写评估报告', dueDate: '2026-08-25', createdAt: '2026-08-01', createdBy: '陈老师' },
  // course-4（TypeScript）
  { id: 'hw-19', courseId: 'course-4', title: '类型体操练习', description: '实现工具类型：Partial、Required、Pick、Record等', dueDate: '2026-08-08', createdAt: '2026-07-22', createdBy: '王老师' },
  { id: 'hw-20', courseId: 'course-4', title: '装饰器模式实践', description: '使用TypeScript装饰器实现日志和权限控制', dueDate: '2026-08-18', createdAt: '2026-07-28', createdBy: '王老师' },
  // course-5（机器学习）
  { id: 'hw-21', courseId: 'course-5', title: '决策树实践', description: '使用决策树模型对iris数据集进行分类', dueDate: '2026-08-06', createdAt: '2026-07-22', createdBy: '张老师' },
  { id: 'hw-22', courseId: 'course-5', title: 'SVM分类器作业', description: '使用SVM对手写数字数据集进行分类', dueDate: '2026-08-16', createdAt: '2026-07-28', createdBy: '张老师' },
  { id: 'hw-23', courseId: 'course-5', title: '神经网络入门作业', description: '使用PyTorch实现一个简单的前馈神经网络', dueDate: '2026-08-26', createdAt: '2026-08-02', createdBy: '张老师' },
  // course-6（项目管理）
  { id: 'hw-24', courseId: 'course-6', title: '项目章程编写', description: '为一个虚拟项目编写项目章程和范围说明书', dueDate: '2026-08-05', createdAt: '2026-07-20', createdBy: '刘老师' },
  { id: 'hw-25', courseId: 'course-6', title: '甘特图与风险管理', description: '使用工具绘制项目甘特图并制定风险应对计划', dueDate: '2026-08-15', createdAt: '2026-07-25', createdBy: '刘老师' },
  // course-9（Photoshop）
  { id: 'hw-26', courseId: 'course-9', title: '图像合成作业', description: '使用图层蒙版和混合模式合成创意海报', dueDate: '2026-08-07', createdAt: '2026-07-22', createdBy: '陈老师' },
  { id: 'hw-27', courseId: 'course-9', title: '商业修图作业', description: '对人像照片进行专业级精修处理', dueDate: '2026-08-17', createdAt: '2026-07-28', createdBy: '陈老师' },
  // course-10（商务英语）
  { id: 'hw-28', courseId: 'course-10', title: '商务邮件写作', description: '撰写商务邮件：询盘、报价、投诉各一封', dueDate: '2026-08-06', createdAt: '2026-07-22', createdBy: '赵老师' },
  { id: 'hw-29', courseId: 'course-10', title: '会议演讲准备', description: '准备5分钟的英文产品演示演讲稿', dueDate: '2026-08-16', createdAt: '2026-07-28', createdBy: '赵老师' },
  { id: 'hw-30', courseId: 'course-10', title: '商务谈判角色扮演', description: '模拟商务谈判场景，撰写谈判策略文档', dueDate: '2026-08-26', createdAt: '2026-08-02', createdBy: '赵老师' },
  // course-11（Vue3）
  { id: 'hw-31', courseId: 'course-11', title: '组合式API练习', description: '使用setup语法糖实现待办列表组件', dueDate: '2026-08-06', createdAt: '2026-07-22', createdBy: '王老师' },
  { id: 'hw-32', courseId: 'course-11', title: 'Pinia状态管理', description: '使用Pinia实现购物车状态管理', dueDate: '2026-08-16', createdAt: '2026-07-28', createdBy: '王老师' },
  // course-12（日语）
  { id: 'hw-33', courseId: 'course-12', title: '日语语法练习', description: '完成教材第3-4单元语法练习题', dueDate: '2026-08-07', createdAt: '2026-07-22', createdBy: '孙老师' },
  { id: 'hw-34', courseId: 'course-12', title: '日语短文写作', description: '用日语写一篇200字左右的自我介绍和兴趣爱好', dueDate: '2026-08-17', createdAt: '2026-07-28', createdBy: '孙老师' },
  // course-14（AI生成式）
  { id: 'hw-35', courseId: 'course-14', title: 'AI项目阶段性作业二', description: '完成AI应用的第二阶段开发：接入大模型API', dueDate: '2026-08-08', createdAt: '2026-07-25', createdBy: '周老师' },
  { id: 'hw-36', courseId: 'course-14', title: 'AI项目阶段性作业三', description: '完善AI应用的提示词工程和输出格式化', dueDate: '2026-08-18', createdAt: '2026-07-30', createdBy: '周老师' },
  // course-15（数据可视化）
  { id: 'hw-37', courseId: 'course-15', title: 'D3.js基础作业', description: '使用D3.js创建柱状图和折线图', dueDate: '2026-08-08', createdAt: '2026-07-25', createdBy: '钱老师' },
  { id: 'hw-38', courseId: 'course-15', title: 'ECharts高级图表', description: '使用ECharts制作地理热力图和桑基图', dueDate: '2026-08-18', createdAt: '2026-07-30', createdBy: '钱老师' },
  // course-16（高效沟通）
  { id: 'hw-39', courseId: 'course-16', title: '即兴演讲练习', description: '自选主题进行3分钟即兴演讲并录制视频', dueDate: '2026-08-05', createdAt: '2026-07-22', createdBy: '吴老师' },
  { id: 'hw-40', courseId: 'course-16', title: '跨部门沟通案例', description: '分析一个跨部门沟通失败的案例并提出改进方案', dueDate: '2026-08-15', createdAt: '2026-07-28', createdBy: '吴老师' },
  // course-17（英语口语）
  { id: 'hw-41', courseId: 'course-17', title: '英语配音作业', description: '为一段英文影视片段进行配音并录制', dueDate: '2026-08-07', createdAt: '2026-07-22', createdBy: '孙老师' },
  { id: 'hw-42', courseId: 'course-17', title: '小组英语辩论', description: '分组进行英语辩论赛，准备辩论稿和论点', dueDate: '2026-08-17', createdAt: '2026-07-28', createdBy: '孙老师' },
  { id: 'hw-43', courseId: 'course-17', title: '英文简历与面试', description: '撰写英文简历并模拟英文面试问答', dueDate: '2026-08-27', createdAt: '2026-08-02', createdBy: '孙老师' },
  // course-18（Docker）
  { id: 'hw-44', courseId: 'course-18', title: 'Dockerfile编写', description: '为一个Node.js应用编写多阶段构建Dockerfile', dueDate: '2026-08-08', createdAt: '2026-07-25', createdBy: '周老师' },
  { id: 'hw-45', courseId: 'course-18', title: 'Docker Compose实践', description: '使用Docker Compose编排前端+后端+数据库应用', dueDate: '2026-08-18', createdAt: '2026-07-30', createdBy: '周老师' },
  // course-19（微服务）
  { id: 'hw-46', courseId: 'course-19', title: '服务拆分设计', description: '对一个单体应用进行微服务拆分设计', dueDate: '2026-08-09', createdAt: '2026-07-25', createdBy: '钱老师' },
  { id: 'hw-47', courseId: 'course-19', title: 'API网关配置', description: '配置Spring Cloud Gateway实现路由和过滤器', dueDate: '2026-08-19', createdAt: '2026-07-30', createdBy: '钱老师' },
  // course-20（产品经理）
  { id: 'hw-48', courseId: 'course-20', title: '竞品分析报告', description: '选择一款产品进行竞品分析，输出SWOT分析报告', dueDate: '2026-08-06', createdAt: '2026-07-22', createdBy: '吴老师' },
  { id: 'hw-49', courseId: 'course-20', title: 'PRD文档编写', description: '为一个新功能编写完整的产品需求文档', dueDate: '2026-08-16', createdAt: '2026-07-28', createdBy: '吴老师' },
  { id: 'hw-50', courseId: 'course-20', title: '产品数据分析', description: '分析产品数据指标，提出产品优化建议', dueDate: '2026-08-26', createdAt: '2026-08-02', createdBy: '吴老师' },
];

// ========== 补充云盘文件数据（file-13起） ==========

export const supplementaryCloudFiles: import('@/types').CloudFile[] = [
  // course-1（React）
  { id: 'file-13', name: 'React Hooks 实战手册.pdf', size: 2560000, type: 'application/pdf', dataUrl: 'https://example.com/files/react-hooks-handbook.pdf', uploadedAt: '2026-07-08', uploadedBy: '王老师', courseId: 'course-1' },
  { id: 'file-14', name: 'Redux 状态管理教程.zip', size: 1536000, type: 'application/zip', dataUrl: 'https://example.com/files/redux-tutorial.zip', uploadedAt: '2026-07-12', uploadedBy: '王老师', courseId: 'course-1' },
  { id: 'file-15', name: 'React 项目脚手架.zip', size: 819200, type: 'application/zip', dataUrl: 'https://example.com/files/react-starter.zip', uploadedAt: '2026-07-15', uploadedBy: '张明', courseId: 'course-1' },
  // course-2（Python）
  { id: 'file-16', name: 'Pandas 速查表.pdf', size: 512000, type: 'application/pdf', dataUrl: 'https://example.com/files/pandas-cheatsheet.pdf', uploadedAt: '2026-07-10', uploadedBy: '李老师', courseId: 'course-2' },
  { id: 'file-17', name: '数据分析案例数据集.zip', size: 5120000, type: 'application/zip', dataUrl: 'https://example.com/files/analysis-datasets.zip', uploadedAt: '2026-07-16', uploadedBy: '李老师', courseId: 'course-2' },
  // course-3（UI/UX）
  { id: 'file-18', name: 'UI 组件库设计源文件.fig', size: 8192000, type: 'application/fig', dataUrl: 'https://example.com/files/ui-components.fig', uploadedAt: '2026-07-10', uploadedBy: '陈老师', courseId: 'course-3' },
  { id: 'file-19', name: '用户体验研究方法论.pdf', size: 1024000, type: 'application/pdf', dataUrl: 'https://example.com/files/ux-research.pdf', uploadedAt: '2026-07-18', uploadedBy: '陈静', courseId: 'course-3' },
  // course-4（TypeScript）
  { id: 'file-20', name: 'TypeScript 类型体操题集.pdf', size: 768000, type: 'application/pdf', dataUrl: 'https://example.com/files/ts-type-challenges.pdf', uploadedAt: '2026-07-12', uploadedBy: '王老师', courseId: 'course-4' },
  { id: 'file-21', name: 'TS 配置最佳实践.md', size: 12800, type: 'text/markdown', dataUrl: 'https://example.com/files/ts-config-best-practices.md', uploadedAt: '2026-07-20', uploadedBy: '独孤求败', courseId: 'course-4' },
  // course-5（机器学习）
  { id: 'file-22', name: 'Scikit-learn 算法速查表.pdf', size: 1024000, type: 'application/pdf', dataUrl: 'https://example.com/files/sklearn-cheatsheet.pdf', uploadedAt: '2026-07-15', uploadedBy: '张老师', courseId: 'course-5' },
  { id: 'file-23', name: '房价预测数据集.csv', size: 2048000, type: 'text/csv', dataUrl: 'https://example.com/files/housing-data.csv', uploadedAt: '2026-07-20', uploadedBy: '张老师', courseId: 'course-5' },
  // course-6（项目管理）
  { id: 'file-24', name: '项目管理工具模板.mpp', size: 1024000, type: 'application/octet-stream', dataUrl: 'https://example.com/files/project-template.mpp', uploadedAt: '2026-07-12', uploadedBy: '刘老师', courseId: 'course-6' },
  { id: 'file-25', name: '敏捷开发流程指南.pdf', size: 1536000, type: 'application/pdf', dataUrl: 'https://example.com/files/agile-guide.pdf', uploadedAt: '2026-07-18', uploadedBy: '刘老师', courseId: 'course-6' },
  // course-9（Photoshop）
  { id: 'file-26', name: 'PS 笔刷资源包.abr', size: 10240000, type: 'application/octet-stream', dataUrl: 'https://example.com/files/photoshop-brushes.abr', uploadedAt: '2026-07-15', uploadedBy: '陈老师', courseId: 'course-9' },
  { id: 'file-27', name: '商业设计案例素材.zip', size: 15360000, type: 'application/zip', dataUrl: 'https://example.com/files/commercial-design.zip', uploadedAt: '2026-07-20', uploadedBy: '陈老师', courseId: 'course-9' },
  // course-10（商务英语）
  { id: 'file-28', name: '商务英语常用词汇表.pdf', size: 384000, type: 'application/pdf', dataUrl: 'https://example.com/files/business-english-vocab.pdf', uploadedAt: '2026-07-12', uploadedBy: '赵老师', courseId: 'course-10' },
  { id: 'file-29', name: '英文邮件模板合集.docx', size: 256000, type: 'application/docx', dataUrl: 'https://example.com/files/email-templates.docx', uploadedAt: '2026-07-18', uploadedBy: '赵老师', courseId: 'course-10' },
  // course-11（Vue3）
  { id: 'file-30', name: 'Vue 3 官方文档精华摘录.pdf', size: 2048000, type: 'application/pdf', dataUrl: 'https://example.com/files/vue3-essentials.pdf', uploadedAt: '2026-07-15', uploadedBy: '王老师', courseId: 'course-11' },
  { id: 'file-31', name: 'Vite 插件开发示例.zip', size: 512000, type: 'application/zip', dataUrl: 'https://example.com/files/vite-plugin-examples.zip', uploadedAt: '2026-07-22', uploadedBy: '王老师', courseId: 'course-11' },
  // course-12（日语）
  { id: 'file-32', name: '五十音图练习表.pdf', size: 256000, type: 'application/pdf', dataUrl: 'https://example.com/files/hiragana-practice.pdf', uploadedAt: '2026-07-12', uploadedBy: '孙老师', courseId: 'course-12' },
  { id: 'file-33', name: '日语N5语法总结.pdf', size: 768000, type: 'application/pdf', dataUrl: 'https://example.com/files/jlpt-n5-grammar.pdf', uploadedAt: '2026-07-20', uploadedBy: '孙老师', courseId: 'course-12' },
  // course-14（AI生成式）
  { id: 'file-34', name: 'GPT API 接入文档.pdf', size: 1280000, type: 'application/pdf', dataUrl: 'https://example.com/files/gpt-api-guide.pdf', uploadedAt: '2026-07-18', uploadedBy: '周老师', courseId: 'course-14' },
  { id: 'file-35', name: '提示词工程指南.md', size: 25600, type: 'text/markdown', dataUrl: 'https://example.com/files/prompt-engineering.md', uploadedAt: '2026-07-22', uploadedBy: '周老师', courseId: 'course-14' },
  { id: 'file-36', name: 'AI 项目第二阶段参考代码.zip', size: 3072000, type: 'application/zip', dataUrl: 'https://example.com/files/ai-project-stage2.zip', uploadedAt: '2026-07-25', uploadedBy: '欧阳雪', courseId: 'course-14' },
  // course-15（数据可视化）
  { id: 'file-37', name: 'ECharts 配置速查表.pdf', size: 1024000, type: 'application/pdf', dataUrl: 'https://example.com/files/echarts-quickref.pdf', uploadedAt: '2026-07-18', uploadedBy: '钱老师', courseId: 'course-15' },
  { id: 'file-38', name: 'D3.js 入门教程代码.zip', size: 1536000, type: 'application/zip', dataUrl: 'https://example.com/files/d3-intro-code.zip', uploadedAt: '2026-07-22', uploadedBy: '钱老师', courseId: 'course-15' },
  // course-16（高效沟通）
  { id: 'file-39', name: '高效沟通技巧PPT.pptx', size: 4096000, type: 'application/pptx', dataUrl: 'https://example.com/files/communication-skills.pptx', uploadedAt: '2026-07-15', uploadedBy: '吴老师', courseId: 'course-16' },
  { id: 'file-40', name: '演讲结构模板.docx', size: 128000, type: 'application/docx', dataUrl: 'https://example.com/files/speech-template.docx', uploadedAt: '2026-07-20', uploadedBy: '吴老师', courseId: 'course-16' },
  // course-17（英语口语）
  { id: 'file-41', name: '英语口语常用句型.pdf', size: 512000, type: 'application/pdf', dataUrl: 'https://example.com/files/english-speaking-patterns.pdf', uploadedAt: '2026-07-18', uploadedBy: '孙老师', courseId: 'course-17' },
  { id: 'file-42', name: 'TED演讲分析笔记.md', size: 18432, type: 'text/markdown', dataUrl: 'https://example.com/files/ted-analysis.md', uploadedAt: '2026-07-24', uploadedBy: '李华', courseId: 'course-17' },
  // course-18（Docker）
  { id: 'file-43', name: 'Docker 常用命令速查表.pdf', size: 384000, type: 'application/pdf', dataUrl: 'https://example.com/files/docker-commands.pdf', uploadedAt: '2026-07-18', uploadedBy: '周老师', courseId: 'course-18' },
  { id: 'file-44', name: 'docker-compose 示例文件.yml', size: 4096, type: 'text/yaml', dataUrl: 'https://example.com/files/docker-compose-sample.yml', uploadedAt: '2026-07-22', uploadedBy: '周老师', courseId: 'course-18' },
  // course-19（微服务）
  { id: 'file-45', name: '微服务架构模式总结.pdf', size: 3072000, type: 'application/pdf', dataUrl: 'https://example.com/files/microservices-patterns.pdf', uploadedAt: '2026-07-20', uploadedBy: '钱老师', courseId: 'course-19' },
  { id: 'file-46', name: 'Spring Cloud 配置示例.zip', size: 2048000, type: 'application/zip', dataUrl: 'https://example.com/files/spring-cloud-config.zip', uploadedAt: '2026-07-25', uploadedBy: '钱老师', courseId: 'course-19' },
  // course-20（产品经理）
  { id: 'file-47', name: '产品需求文档模板.docx', size: 256000, type: 'application/docx', dataUrl: 'https://example.com/files/prd-template.docx', uploadedAt: '2026-07-18', uploadedBy: '吴老师', courseId: 'course-20' },
  { id: 'file-48', name: '产品数据分析框架.pdf', size: 768000, type: 'application/pdf', dataUrl: 'https://example.com/files/product-analytics.pdf', uploadedAt: '2026-07-24', uploadedBy: '吴老师', courseId: 'course-20' },
  // 通用资料
  { id: 'file-49', name: '学习规划模板.xlsx', size: 128000, type: 'application/xlsx', dataUrl: 'https://example.com/files/study-plan-template.xlsx', uploadedAt: '2026-07-10', uploadedBy: '张明', courseId: 'course-1' },
  { id: 'file-50', name: '期末复习思维导图.png', size: 2048000, type: 'image/png', dataUrl: 'https://example.com/files/review-mindmap.png', uploadedAt: '2026-07-28', uploadedBy: '王老师', courseId: 'course-1' },
];

// ========== 补充笔记数据（note-6起） ==========

export const supplementaryNotes: import('@/types').Note[] = [
  { id: 'note-6', title: 'Redux 状态管理学习笔记', content: 'Redux核心概念：Store、Action、Reducer\n中间件：redux-thunk、redux-saga\nRTK：configureStore、createSlice、createAsyncThunk', createdAt: '2026-07-18', updatedAt: '2026-07-22', createdBy: '张明' },
  { id: 'note-7', title: '英语商务会议常用表达', content: 'Opening: "Let\'s get started"\nAgenda: "The main purpose of this meeting is..."\nAgreeing: "I couldn\'t agree more"\nDisagreeing politely: "I see your point, but..."\nClosing: "Let\'s wrap up here"', createdAt: '2026-07-19', updatedAt: '2026-07-24', createdBy: '李华' },
  { id: 'note-8', title: 'Figma 设计技巧汇总', content: 'Auto Layout：自适应布局\nComponents：组件的复用与覆盖\nVariants：组件变体管理\nPrototype：交互原型连接\nPlugins：常用插件推荐', createdAt: '2026-07-20', updatedAt: '2026-07-25', createdBy: '王芳' },
  { id: 'note-9', title: 'AI 提示词工程笔记', content: 'Chain-of-Thought：让模型逐步推理\nFew-shot：提供示例引导\nRole Prompting：给模型设定角色\nFormat Control：指定输出格式\nTemperature：控制创造性与确定性', createdAt: '2026-07-21', updatedAt: '2026-07-26', createdBy: '欧阳雪' },
  { id: 'note-10', title: '机器学习数学基础', content: '线性代数：矩阵运算、特征值分解\n概率论：贝叶斯定理、条件概率\n微积分：梯度、偏导数\n优化方法：梯度下降、Adam优化器', createdAt: '2026-07-22', updatedAt: '2026-07-28', createdBy: '欧阳雪' },
  { id: 'note-11', title: 'Docker 容器化部署笔记', content: 'Dockerfile指令详解：FROM、RUN、COPY、CMD\n多阶段构建：减小镜像体积\nDocker Compose：多容器编排\nVolume：数据持久化\nNetwork：容器网络通信', createdAt: '2026-07-23', updatedAt: '2026-07-27', createdBy: '独孤求败' },
  { id: 'note-12', title: 'TypeScript 高级类型笔记', content: '条件类型：T extends U ? X : Y\n映射类型：{[K in keyof T]: T[K]}\ninfer关键字：类型推断\n模板字面量类型：`${T}-${U}`\n协变与逆变', createdAt: '2026-07-24', updatedAt: '2026-07-29', createdBy: '独孤求败' },
  { id: 'note-13', title: '日语学习难点整理', content: '自动词与他动词的区别\nて形、た形、ない形的变形规则\n敬语体系：尊敬语、謙譲語、丁寧語\n助詞：「は」「が」「を」「に」「で」的用法', createdAt: '2026-07-20', updatedAt: '2026-07-25', createdBy: '王芳' },
  { id: 'note-14', title: '微服务设计原则', content: '单一职责：每个服务只负责一个业务领域\n数据自治：每个服务拥有自己的数据库\n接口隔离：服务间通过轻量级API通信\n去中心化：分散治理、分散数据管理\n基础设施自动化：CI/CD、容器化', createdAt: '2026-07-25', updatedAt: '2026-07-30', createdBy: '张明' },
  { id: 'note-15', title: '产品需求分析框架', content: 'Kano模型：基本需求、期望需求、兴奋需求\n用户故事地图：从用户旅程梳理需求\nRICE优先级：Reach、Impact、Confidence、Effort\nMVP定义：最小可行产品的范围界定', createdAt: '2026-07-22', updatedAt: '2026-07-28', createdBy: '令狐冲' },
  { id: 'note-16', title: 'UI 设计配色方案笔记', content: '主色：#3b82f6（蓝色）\n辅色：#10b981（绿色）\n强调色：#f59e0b（橙色）\n背景色：#f8fafc\n文字色：#1e293b\n配色原则：60-30-10法则', createdAt: '2026-07-25', updatedAt: '2026-07-29', createdBy: '慕容枫' },
  { id: 'note-17', title: 'Git 工作流总结', content: 'Git Flow：master、develop、feature、release、hotfix分支\nFeature Branch：从develop拉取feature分支\nPR/MR：代码审查流程\nSemantic Commit：feat/fix/docs/refactor/test等前缀\nRebase vs Merge：线性历史与合并提交', createdAt: '2026-07-26', updatedAt: '2026-07-31', createdBy: '张明' },
];

// ========== 补充在线文档数据（doc-5起） ==========

export const supplementaryOnlineDocs: import('@/types').OnlineDoc[] = [
  { id: 'doc-5', title: 'React学习小组第2周计划', content: '# 第2周学习计划\n\n## 目标\n掌握useEffect和自定义Hook\n\n## 任务分配\n- 张明：useEffect深度研究\n- 李华：自定义Hook实现\n- 王芳：文档整理\n\n## 截止日期\n2026-08-01', createdBy: '张明', createdAt: '2026-07-22', lastEditedAt: '2026-07-25', lastEditedBy: '张明' },
  { id: 'doc-6', title: 'Python数据分析项目方案V2', content: '# 项目方案V2\n\n## 数据源更新\n新增电商销售数据集\n\n## 分析维度\n- 销售趋势分析\n- 用户购买行为\n- 商品关联推荐\n\n## 可视化方案\n- 使用Plotly构建交互式图表', createdBy: '李老师', createdAt: '2026-07-20', lastEditedAt: '2026-07-27', lastEditedBy: '王芳' },
  { id: 'doc-7', title: 'AI项目架构设计文档', content: '# AI项目架构设计\n\n## 整体架构\n```\n前端(Vue3) → API网关 → 业务服务 → AI服务\n                          ↓\n                      数据库 ← 向量数据库\n```\n\n## 技术选型\n- 前端：Vue3 + TypeScript\n- 后端：Python FastAPI\n- AI模型：GPT-4 + Embedding\n- 数据库：PostgreSQL + PGVector', createdBy: '周老师', createdAt: '2026-07-22', lastEditedAt: '2026-07-28', lastEditedBy: '欧阳雪' },
  { id: 'doc-8', title: '产品需求评审记录', content: '# 需求评审会议记录\n\n## 会议时间\n2026-07-24 14:00-15:30\n\n## 参会人\n吴老师、令狐冲、小龙女\n\n## 评审内容\n1. 用户登录功能 PRD 评审\n2. 数据看板需求确认\n3. 优先级排序\n\n## 待办\n- 更新PRD中的用户权限描述\n- 补充数据看板的交互原型', createdBy: '吴老师', createdAt: '2026-07-24', lastEditedAt: '2026-07-25', lastEditedBy: '令狐冲' },
  { id: 'doc-9', title: 'Docker实践项目协作文档', content: '# Docker实践项目\n\n## 项目目标\n构建一个完整的容器化Web应用\n\n## 服务列表\n- frontend: Nginx + Vue3\n- backend: Node.js + Express\n- database: PostgreSQL\n- cache: Redis\n\n## 部署方案\n- 使用Docker Compose本地部署\n- CI/CD集成GitHub Actions\n- 生产环境使用Kubernetes', createdBy: '周老师', createdAt: '2026-07-25', lastEditedAt: '2026-07-29', lastEditedBy: '独孤求败' },
  { id: 'doc-10', title: '微服务架构设计评审', content: '# 微服务架构评审\n\n## 服务划分\n1. 用户服务（User Service）\n2. 订单服务（Order Service）\n3. 支付服务（Payment Service）\n4. 通知服务（Notification Service）\n\n## 通信方式\n- 同步：REST API / gRPC\n- 异步：Kafka / RabbitMQ\n\n## 数据一致性\n- 使用Saga模式处理分布式事务\n- 最终一致性保证', createdBy: '钱老师', createdAt: '2026-07-26', lastEditedAt: '2026-07-30', lastEditedBy: '慕容枫' },
];

// ========== 补充待办事项数据（todo-8起） ==========

export const supplementaryTodos: import('@/types').TodoItem[] = [
  { id: 'todo-8', title: '完成AI项目第二阶段代码提交', completed: false, createdAt: '2026-07-25', dueDate: '2026-08-05', createdBy: '欧阳雪' },
  { id: 'todo-9', title: '准备英语口语考试', completed: false, createdAt: '2026-07-25', dueDate: '2026-08-10', createdBy: '李华' },
  { id: 'todo-10', title: '修改UI设计稿第3版', completed: true, createdAt: '2026-07-22', dueDate: '2026-07-28', createdBy: '王芳' },
  { id: 'todo-11', title: '整理TypeScript类型系统笔记', completed: false, createdAt: '2026-07-26', createdBy: '独孤求败' },
  { id: 'todo-12', title: '完成Docker Compose编排练习', completed: false, createdAt: '2026-07-26', dueDate: '2026-08-02', createdBy: '张明' },
  { id: 'todo-13', title: '组内代码Review', completed: false, createdAt: '2026-07-27', dueDate: '2026-07-29', createdBy: '张明' },
  { id: 'todo-14', title: '日语五十音图默写', completed: true, createdAt: '2026-07-20', dueDate: '2026-07-22', createdBy: '王芳' },
  { id: 'todo-15', title: '准备产品需求评审会议', completed: false, createdAt: '2026-07-27', dueDate: '2026-07-31', createdBy: '令狐冲' },
  { id: 'todo-16', title: '提交项目管理作业', completed: false, createdAt: '2026-07-28', dueDate: '2026-08-05', createdBy: '韦小宝' },
  { id: 'todo-17', title: '学习微服务架构设计模式', completed: false, createdAt: '2026-07-28', createdBy: '慕容枫' },
  { id: 'todo-18', title: '完成Photoshop期末作品', completed: false, createdAt: '2026-07-29', dueDate: '2026-08-15', createdBy: '陈静' },
  { id: 'todo-19', title: '预约导师进行项目指导', completed: false, createdAt: '2026-07-29', dueDate: '2026-08-01', createdBy: '欧阳雪' },
  { id: 'todo-20', title: '整理数据分析项目代码', completed: true, createdAt: '2026-07-22', dueDate: '2026-07-26', createdBy: '高飞' },
  { id: 'todo-21', title: '参加英语口语小组练习', completed: false, createdAt: '2026-07-30', dueDate: '2026-08-03', createdBy: '小龙女' },
  { id: 'todo-22', title: '完成产品数据分析报告', completed: false, createdAt: '2026-07-30', dueDate: '2026-08-12', createdBy: '杨过' },
];

// ========== 补充评价待办提醒（rem-8起） ==========

export const supplementaryEvalReminders: import('@/types').EvalReminder[] = [
  { id: 'rem-8', courseId: 'course-4', courseTitle: 'TypeScript 高级编程', studentId: 'stu-1', sessionNumber: 2, deadline: '2026-07-30', status: 'pending' },
  { id: 'rem-9', courseId: 'course-5', courseTitle: '机器学习基础', studentId: 'stu-7', sessionNumber: 2, deadline: '2026-08-01', status: 'pending' },
  { id: 'rem-10', courseId: 'course-9', courseTitle: 'Photoshop 图像处理', studentId: 'stu-11', sessionNumber: 2, deadline: '2026-07-29', status: 'overdue' },
  { id: 'rem-11', courseId: 'course-11', courseTitle: 'Vue 3 组合式 API', studentId: 'stu-12', sessionNumber: 2, deadline: '2026-08-02', status: 'pending' },
  { id: 'rem-12', courseId: 'course-12', courseTitle: '日语初级入门', studentId: 'stu-13', sessionNumber: 2, deadline: '2026-08-03', status: 'pending' },
  { id: 'rem-13', courseId: 'course-14', courseTitle: 'AI 生成式应用开发', studentId: 'stu-17', sessionNumber: 3, deadline: '2026-08-05', status: 'pending' },
  { id: 'rem-14', courseId: 'course-18', courseTitle: 'Docker 容器化部署', studentId: 'stu-20', sessionNumber: 2, deadline: '2026-08-04', status: 'pending' },
  { id: 'rem-15', courseId: 'course-19', courseTitle: '微服务架构设计', studentId: 'stu-18', sessionNumber: 2, deadline: '2026-08-06', status: 'pending' },
  { id: 'rem-16', courseId: 'course-20', courseTitle: '产品经理实战', studentId: 'stu-20', sessionNumber: 2, deadline: '2026-08-07', status: 'pending' },
  { id: 'rem-17', courseId: 'course-16', courseTitle: '高效沟通与表达训练', studentId: 'stu-1', sessionNumber: 2, deadline: '2026-07-30', status: 'completed' },
  { id: 'rem-18', courseId: 'course-17', courseTitle: '英语口语进阶训练', studentId: 'stu-2', sessionNumber: 2, deadline: '2026-08-02', status: 'overdue' },
];

// ========== 补充评价异常记录（anom-5起） ==========

export const supplementaryEvalAnomalies: import('@/types').EvalAnomaly[] = [
  { id: 'anom-5', courseId: 'course-1', studentId: 'stu-24', studentName: '乔峰', sessionNumber: 3, type: 'self', selfScore: 80, avgScore: 70, diff: 10, warning: '自评分数高于教师评分和组内评分，建议关注' },
  { id: 'anom-6', courseId: 'course-2', studentId: 'stu-23', studentName: '韦小宝', sessionNumber: 1, type: 'self', selfScore: 65, avgScore: 82, diff: -17, warning: '自评分数明显低于教师评分，可能存在自信不足或自我认知偏差' },
  { id: 'anom-7', courseId: 'course-14', studentId: 'stu-23', studentName: '韦小宝', sessionNumber: 1, type: 'self', selfScore: 55, avgScore: 78, diff: -23, warning: '自评分数与平均分差异超过20分，建议进行面谈辅导' },
  { id: 'anom-8', courseId: 'course-19', studentId: 'stu-20', studentName: '杨过', sessionNumber: 1, type: 'self', selfScore: 72, avgScore: 78, diff: -6, warning: '自评分数略低于教师评分' },
  { id: 'anom-9', courseId: 'course-18', studentId: 'stu-20', studentName: '杨过', sessionNumber: 1, type: 'self', selfScore: 72, avgScore: 76, diff: -4, warning: '自评分数与教师评分基本一致，但建议鼓励' },
];

// 将所有补充数据汇总为一个对象
export const supplementaryAll = {
  supplementarySchedules,
  supplementaryEnrollments,
  supplementaryEvaluations,
  supplementaryHomeworkSubmissions,
  supplementaryDetailedGrades,
  supplementaryStudentGroups,
  supplementaryHomework,
  supplementaryCloudFiles,
  supplementaryNotes,
  supplementaryOnlineDocs,
  supplementaryTodos,
  supplementaryEvalReminders,
  supplementaryEvalAnomalies,
  adminDemoSchedules,
} as const;
