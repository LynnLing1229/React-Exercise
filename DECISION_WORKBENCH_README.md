# Decision Workbench v0 Implementation

## 概述

本实现为PT回顾系统的第二屏——**Decision Workbench（决策工作台）**，采用混合UI方向：
- **方向A**的渐进展开骨架
- **方向B**的核心双栏对比区域  
- **方向C**的问题前置设计

## 访问地址

- **第一屏（PT Review）**: http://127.0.0.1:3334/
- **第二屏（Decision Workbench）**: http://127.0.0.1:3334/decision-workbench

两个页面之间有导航链接可以快速切换。

## 实现的功能

### 1. 页面结构

#### 顶部区域
- **Focus选择器**：显示当前关注焦点（左膝疼痛）和Care Episode
- **Episode状态**：显示Open/Concluded状态
- **原型状态切换器**：真实状态 vs 合成状态
- **返回第一屏链接**：左上角导航

#### 待决策问题区（问题前置 - 来自方向C）
- Why Now：当前为什么需要讨论
- 核心问题：Owner和PT视角的问题陈述
- 推理新鲜度状态：PT已复核至何时，后续有多少天新证据
- 补充PT判断按钮：快速入口
- 系统边界说明

#### 当前决策综合（双栏对比 - 来自方向B）
**左栏：最近记录的PT推理**
- PT Assessment（附日期、来源、溯源标签）
- Plan（目的、适用条件）
- Decision Condition（自然语言判断条件）
- 缺失内容用占位卡片明确标注，有"点击补充"按钮

**右栏：当前状态与重要变化**
- 当前Presentation（症状、触发、最新状态）
- Goal（状态/进度）
- 后续证据概要（X天新证据待PT复核）

#### 之后发生了什么（渐进展开 - 来自方向A）
- Plan vs 实际执行对比
- 后续证据时间线
  - 按日期组织
  - Episode成员关系标签（本Episode/仅上下文/相关关注）
  - 来源标签和溯源信息
  - 缺失信息标注
  - 推理未重述警告
- 最近Visit详情
  - 本Focus的治疗步骤
  - 同Visit其他步骤（可展开）
  - 推理重述状态
- 附近证据（Episode外）

#### 完整历史与来源（按需展开 - 来自方向A）
- Care Episode信息
- Care Concern
- 缺失内容清单
- 较新Visit但推理未重述
- 来源冲突待澄清
- 多Focus Visit示例

### 2. 两种状态

#### realReasoningGap（真实主状态 - 默认）
- PT推理大量缺失：Assessment、Plan、Decision Condition、Goal全部未捕获
- 证据丰富：5条review evidence
- 展示缺失内容的占位卡片和可操作入口
- 推理新鲜度状态："PT看过哪些证据不明确"

#### syntheticReasoningCaptured（合成状态）
- 完整的PT推理示例（带警告标签说明是设计Mock）
- PT Assessment with溯源："PT已确认" + 音频时间戳
- 完整Plan和Decision Condition
- 推理新鲜度："PT已复核至2026-07-10，之后4天新证据待复核"
- Plan vs 实际执行对比
- 来源冲突示例

### 3. 溯源处理

每个推理陈述保持三个独立轴：
- **来源**：PT直接音频 / PT文档 / Owner转述 / Owner观察
- **表述**：原始措辞 / 转录 / AI摘要 / AI问题
- **复核**：PT已确认 / Owner来源核对 / 未复核

溯源标签示例：
- "PT 已确认"（绿色，最强）
- "Owner 转述 PT；不是 PT 已确认判断"（橙色）
- "Owner 记录，已核对来源"（灰色）

### 4. 响应式设计

#### 桌面（1920px）
- 双栏对比并列显示
- 完整导航和操作按钮
- 所有内容一览无余

#### 平板（1024px）
- 双栏对比保持
- 稍微紧凑的间距
- 完整功能保留

#### 移动（390px）
- 双栏垂直堆叠
- 待决策问题和核心综合优先
- 历史和详细证据通过展开查看
- FAB（浮动操作按钮）用于Focus切换

### 5. 交互

- **展开/折叠**："之后发生了什么"和"完整历史"默认可折叠
- **Focus切换器**：点击header的Focus区域或移动端FAB打开
- **状态切换**：真实/合成状态一键切换
- **证据展开**：超过3条证据时显示"显示其余X条"按钮
- **Visit步骤查看**：同Visit其他步骤通过`<details>`展开
- **溯源详情**：hover显示完整溯源信息（title属性）

## 技术实现

### 组件结构

```
/app/
  app/
    decision-workbench/
      page.tsx                          # 路由入口
  components/
    decision-workbench/
      decision-workbench-page.tsx       # 主容器
      decision-question.tsx             # 待决策问题
      current-synthesis.tsx             # 双栏对比
      later-evidence.tsx                # 后续证据时间线
      full-history.tsx                  # 完整历史
      focus-selector.tsx                # Focus切换器
```

### 样式复用

- 完全复用`/app/app/globals.css`的设计token
- 使用现有的事件颜色系统（event-pain, event-pt-visit等）
- 保持与第一屏一致的组件风格（Panel, Badge, Timeline）
- Shadcn UI组件库

### 数据源

使用`/app/decision-workbench-v0-sample-data.ts`提供的两种状态数据。

## 设计决策

### 已实施的Owner选项

- **B选1**：缺失内容用占位卡片 + "未捕获"标签 + "点击补充"按钮 ✓
- **C选1**：推理新鲜度在"待决策问题"区域顶部显示概要，PT View旁显示详细状态 ✓
- **D选推荐**：默认仅显示本Focus步骤，点击"查看同Visit其他步骤"展开 ✓
- **E移动端FAB**：移动端用浮动操作按钮触发Focus选择器 ✓
- **F选推荐**：页面顶部显示"[Prototype] 真实状态 | 合成状态"切换器 ✓

### 不建议的混合特性（未实施）

- ❌ 全页双栏布局（会在长内容时过长）
- ❌ 全页卡片网格（会碎片化）
- ❌ 底部收尾section重复总结待补充内容

## 与第一屏的关系

- **第一屏**：宽区间、多关注点的PT回顾简报
- **第二屏**：单一Review Focus的决策工作台

导航：
- 第一屏右上角："查看 Decision Workbench →"
- 第二屏左上角："← 返回第一屏"

## 语义边界遵守

- ✓ Review Focus选择Care Concern或Goal
- ✓ Care Episode是有界的评估管理过程，不是终身问题
- ✓ 左膝疼痛是持续关注，不同日期的Presentation分开
- ✓ PT Assessment是归属解读，不是观察症状
- ✓ Plan（计划）、Action（执行）、Response（反应）分开显示
- ✓ 较新但来源弱的陈述不覆盖较老但来源强的陈述
- ✓ 缺失内容明确标注，不生成临床内容填充
- ✓ Episode成员关系明确，不自动根据时间或身体区域推断

## 已知限制（v0原型）

1. Focus切换器显示mock数据（只有2个Focus）
2. "补充本次PT判断"按钮无实际功能（仅UI）
3. "点击补充"按钮无实际功能（仅UI）
4. 来源详情查看通过title属性，未实现浮层/抽屉
5. 未实现完整的Reasoning更新历史展示
6. 未连接真实API，使用本地sample data

## 下一步（超出v0范围）

- 定义Decision Workbench的API contract
- 实现补充PT推理的录音/文本输入流程
- 实现来源详情的交互查看
- 集成到真实repository的运行时路由
- 定义后端持久化模型
- 完整的Focus管理和切换
- 多Episode历史浏览
