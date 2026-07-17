# PT Review Decision Workbench v0

## Original Problem Statement
用户提供了`decision-workbench-v0-discussion-first-self-contained.zip`，要求：
1. 阅读zip中的md文件
2. 阅读所有代码，渲染已有页面
3. 根据sample data和prompt要求，完成指令

要求遵循两阶段协议：
- **Phase 1**: 讨论UI方向（不写代码）
- **Phase 2**: 实现（仅在用户批准后）

## Architecture
- **Framework**: Next.js 16.2.6 with React 19
- **Styling**: Tailwind CSS v4 + Shadcn UI + tw-animate-css
- **Fonts**: Geist Sans & Geist Mono
- **Language**: Chinese-first (zh-CN)
- **Two Screens**:
  - Screen 1 (`/`): PT Review broad briefing (existing, untouched)
  - Screen 2 (`/decision-workbench`): NEW Decision Workbench

## Key Decisions Made

### Phase 1 - UI Direction
提出了3个实质不同的方向：
- **A**: 决策循环驱动的渐进展开
- **B**: 对称双栏比对(Then vs Now)
- **C**: 问题驱动的上下文卡片

用户选择：**混合方案** = A骨架 + 局部B双栏对比 + C问题前置

### Owner Approved Choices
- B选1：占位卡片 + "未捕获"标签 + 补充入口
- C选1：推理新鲜度在PT View旁 + 顶部概要
- D选推荐：默认仅显示本Focus步骤
- E移动端做3：FAB浮动按钮
- F选推荐：顶部Prototype状态切换

## What's Implemented (2026-01-17)

### New Files Created
- `/app/app/decision-workbench/page.tsx` - Route entry
- `/app/components/decision-workbench/decision-workbench-page.tsx` - Main container
- `/app/components/decision-workbench/decision-question.tsx` - Question前置区
- `/app/components/decision-workbench/current-synthesis.tsx` - 双栏对比核心区
- `/app/components/decision-workbench/later-evidence.tsx` - 时间线证据
- `/app/components/decision-workbench/full-history.tsx` - 完整历史
- `/app/components/decision-workbench/focus-selector.tsx` - Focus切换器
- `/app/DECISION_WORKBENCH_README.md` - 实现文档

### Files Modified
- `/app/app/page.tsx` - Added navigation link to Decision Workbench

### Features
1. **待决策问题区** - 问题前置，含推理新鲜度和补充入口
2. **当前决策综合** - 双栏对比（左：PT推理 / 右：当前状态）
3. **之后发生了什么** - 可折叠时间线，含Plan vs 执行对比、Visit详情
4. **完整历史与来源** - 可折叠底部，含Episode、Care Concern、缺失清单、来源冲突
5. **两种状态切换** - realReasoningGap（真实）vs syntheticReasoningCaptured（合成）
6. **溯源三轴** - 来源/表述/复核 独立标签，"PT已确认"绿色最强
7. **响应式** - Desktop 1920/1440，Tablet 1024，Mobile 390
8. **FAB** - 移动端浮动Focus切换按钮

### Semantic Boundaries Respected
- Review Focus (Care Concern or Goal) 分开
- Care Episode是有界过程，不是终身问题
- Care Concern持续，Presentation按日期
- Assessment/Plan/Action/Response 分开显示
- 缺失内容明确标注，不生成临床内容
- 来源强度不静默覆盖
- Episode成员关系不自动推断

## Backlog / Not Done
- Real API integration (v0 uses local sample data only)
- Actual "补充PT判断" recording/text input flow
- Source detail modal/drawer (currently tooltip only)
- Reasoning update history full drill-down
- Multi-Episode history browser
- 补充按钮的实际功能

## Testing Status
- Manual browser testing via screenshots: PASSED
- Desktop, Tablet, Mobile viewports: PASSED
- Real ↔ Synthetic state switch: PASSED
- Focus selector (Desktop + Mobile FAB): PASSED
- Expand/collapse sections: PASSED

## Access URLs
- Screen 1 (First Screen): http://127.0.0.1:3334/
- Screen 2 (Decision Workbench): http://127.0.0.1:3334/decision-workbench
