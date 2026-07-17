import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const baseUrl = argValue("--base-url") ?? "http://127.0.0.1:3334"
const cdpUrl = argValue("--cdp-url") ?? "http://127.0.0.1:9222"
const outputDir = path.resolve(process.cwd(), argValue("--output-dir") ?? "../output/pt-review-api")

async function validateApi(url) {
  const mode = "api"
  const target = await fetch(`${cdpUrl}/json/new?${encodeURIComponent(url)}`, { method: "PUT" }).then((response) => response.json())
  const cdp = await CDP.connect(target.webSocketDebuggerUrl)
  try {
    await cdp.send("Page.enable")
    await cdp.send("Runtime.enable")
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await cdp.send("Page.navigate", { url })
    await waitFor(cdp, `document.readyState === "complete" && document.body.innerText.includes("相关记录")`)

    const issueCount = await count(cdp, "[data-issue-card]")
    assert(issueCount > 0 && issueCount <= 3, `${mode} rendered ${issueCount} first-screen issue cards.`)
    const defaultProblemMarkers = await attributeValues(cdp, '[data-marker-role="problem"]', "data-body-map-marker")
    assert(defaultProblemMarkers.length > 0, `${mode} rendered no default problem markers.`)
    assert(await count(cdp, '[data-marker-role="training_review"]') === 0, `${mode} showed training review by default.`)
    assert(await count(cdp, '[data-marker-role="pt_treatment_context"]') > 0, `${mode} omitted selected left-knee PT treatment context.`)
    const treatmentCalloutText = await evaluate(cdp, `[...document.querySelectorAll('[data-marker-role="pt_treatment_context"]')].map((marker) => {
      const id = marker.dataset.bodyMapMarker;
      return document.querySelector('[data-body-map-callout="' + id + '"]')?.textContent ?? '';
    }).join(' ')`)
    assert(treatmentCalloutText.includes("上次治疗："), `${mode} Body Map omitted compact 上次治疗 context copy.`)
    assert(!treatmentCalloutText.includes("PT 处理") && !treatmentCalloutText.includes("已干预"), `${mode} Body Map retained third-person treatment copy.`)
    const expandedLayout = await firstScreenLayout(cdp)
    assertEqualPanelHeights(expandedLayout, mode, "expanded")
    assertCalloutsInsideFigure(expandedLayout, mode, "expanded")
    assertShortestCalloutLeaders(await calloutLeaderMetrics(cdp), mode, "expanded")
    const defaultProblemViewCounts = await bodyMapViewCounts(cdp)
    await screenshot(cdp, `${mode}-desktop-expanded-front.png`)
    await assertDesktopIssueWorkspaceAlignment(cdp, mode)

    await clickIssue(cdp, "左膝")
    await waitFor(cdp, `document.querySelector('[data-issue-card="issue_left_knee"]').getAttribute("aria-expanded") === "false"`)
    const collapsedLayout = await firstScreenLayout(cdp)
    assertEqualPanelHeights(collapsedLayout, mode, "collapsed")
    assertStableRect(expandedLayout.figure, collapsedLayout.figure, mode, "card collapse")
    assertStableRect(expandedLayout.anatomy, collapsedLayout.anatomy, mode, "card collapse anatomy")
    await screenshot(cdp, `${mode}-desktop-collapsed-front.png`)
    await clickIssue(cdp, "左膝")
    await waitFor(cdp, `document.querySelector('[data-issue-card="issue_left_knee"]').getAttribute("aria-expanded") === "true"`)
    await waitFor(cdp, `document.querySelectorAll("[data-related-group-date]").length > 0`)
    const cardGroupIds = await values(cdp, "[data-related-group-id]", "relatedGroupId")
    const cardDates = await values(cdp, "[data-related-group-date]", "relatedGroupDate")
    const cardPanelText = await relatedPanelText(cdp)
    if (mode === "api") {
      assert(
        cardDates.join(",") === "2026-07-01,2026-07-06,2026-07-07,2026-07-09",
        `API left-knee card rendered dates ${cardDates.join(",")}`,
      )
    }
    assertRelatedTimeline(await relatedTimelineState(cdp), mode, "desktop")
    if (mode === "api") {
      const expectedScenes = [
        "上次治疗|PT 康复训练｜箭步蹲加哑铃上举",
        "二次记录|跑步",
        "再次记录|力量训练｜分腿蹲",
        "最近记录|跑步",
      ]
      assert(
        JSON.stringify((await relatedTimelineState(cdp)).items.map((item) => `${item.role}|${item.scene}`)) === JSON.stringify(expectedScenes),
        "API Related Records did not render the backend scene/action sequence.",
      )
      assert(
        !["上次干预", "上次 PT 处理过", "官方记录", "相关处理"].some((copy) => cardPanelText.includes(copy)),
        `API Related Records retained internal copy: ${cardPanelText}`,
      )
      assert(
        ["4.04 km", "平均配速 7'50\"/km", "平均心率 145 bpm", "5.50 km"].every((copy) => cardPanelText.includes(copy)),
        `API Related Records did not render structured COROS context: ${cardPanelText}`,
      )
      assert(
        !["31:39", "43:11"].some((copy) => cardPanelText.includes(copy)),
        `API Related Records rendered total run duration in occurrence context: ${cardPanelText}`,
      )
      assert(
        [
          "康复训练中，箭步蹲加哑铃上举的起身阶段",
          "左膝疼痛，共2次",
          "跑步约4公里时出现疼痛",
          "症状见于第1组和第3组，次数未精确记录",
          "症状首次出现于第1–2公里，约第5公里再次出现",
          "疼痛短暂缓解，后段再次出现；跑后状态待确认。",
        ].every((copy) => cardPanelText.includes(copy)),
        `API Related Records did not render the accepted PT narrative: ${cardPanelText}`,
      )
      assert(
        !["有点疼", "痛了几下", "那一下", "被喊停", "没啥了", "只代表"].some((copy) => cardPanelText.includes(copy)),
        `API Related Records retained colloquial source copy: ${cardPanelText}`,
      )
    }
    await screenshot(cdp, `${mode}-left-knee-card.png`)

    const scrollBefore = await evaluate(cdp, `(() => {
      const panel = document.querySelector("[data-related-records-scroll]");
      panel.scrollTop = panel.scrollHeight;
      return panel.scrollTop;
    })()`)
    await clickIssue(cdp, "左踝")
    await waitFor(cdp, `document.body.innerText.includes("左踝") && document.querySelectorAll("[data-related-group-date]").length > 0`)
    const ankleDates = await values(cdp, "[data-related-group-date]", "relatedGroupDate")
    const anklePanelText = await relatedPanelText(cdp)
    const activeAnkleText = await activeIssueText(cdp)
    const scrollAfter = await evaluate(cdp, `document.querySelector("[data-related-records-scroll]").scrollTop`)
    const ankleLayout = await firstScreenLayout(cdp)
    assertEqualPanelHeights(ankleLayout, mode, "left-ankle")
    assertStableRect(expandedLayout.figure, ankleLayout.figure, mode, "issue switch")
    assertStableRect(expandedLayout.anatomy, ankleLayout.anatomy, mode, "issue switch anatomy")
    assertCalloutsInsideFigure(ankleLayout, mode, "left-ankle")
    if (scrollBefore > 0) {
      assert(scrollAfter === 0, `${mode} issue switch left stale Related Records scroll position ${scrollAfter}.`)
    }
    assert(ankleDates.length > 0, `${mode} left-ankle focus rendered no Related Records groups.`)
    assert(activeAnkleText.includes("左踝"), `${mode} left-ankle click left stale issue-card focus.`)
    if (mode === "api") {
      assert(!anklePanelText.includes("左膝"), "API left-ankle panel rendered the same-run left-knee reaction.")
    }
    await screenshot(cdp, `${mode}-left-ankle-card.png`)

    if (mode === "api") {
      await clickSelector(cdp, '[data-issue-card="issue_unknown_shoulder"]')
      await waitFor(cdp, `document.querySelector('[data-issue-card="issue_unknown_shoulder"]').getAttribute("aria-pressed") === "true"`)
      const shoulderTimeline = await relatedTimelineState(cdp)
      const shoulderText = await relatedPanelText(cdp)
      assert(
        shoulderTimeline.items.length === 1 && shoulderTimeline.items[0].role === "上次治疗",
        `API shoulder Related Records did not identify the linked PT treatment: ${JSON.stringify(shoulderTimeline.items)}.`,
      )
      assert(
        shoulderText.includes("肩部间歇性紧张并伴疼痛") &&
          shoulderText.includes("PT 治疗｜对斜方肌进行手法松解、冲击波处理") &&
          shoulderText.includes("处理后肩部状态未记录，待跟进。"),
        `API shoulder Related Records omitted reaction, treatment, or follow-up: ${shoulderText}`,
      )
      assert(
        !shoulderText.includes("是当天 PT 处理斜方肌的背景") &&
          !shoulderText.includes("停止箭步蹲") &&
          !shoulderText.includes("股四头") &&
          !shoulderText.includes("筋膜刀"),
        `API shoulder Related Records leaked unrelated PT-visit steps: ${shoulderText}`,
      )
      await screenshot(cdp, `${mode}-shoulder-card.png`)
    }

    await assertEveryTopIssueCard(cdp, mode)
    await clickView(cdp, "front")

    await clickMarker(cdp, "左膝")
    await waitFor(cdp, `document.querySelectorAll("[data-related-group-id]").length === ${cardGroupIds.length}`)
    const markerGroupIds = await values(cdp, "[data-related-group-id]", "relatedGroupId")
    const markerDates = await values(cdp, "[data-related-group-date]", "relatedGroupDate")
    const markerPanelText = await relatedPanelText(cdp)
    const activeKneeText = await activeIssueText(cdp)
    assert(
      JSON.stringify(markerGroupIds) === JSON.stringify(cardGroupIds) &&
        JSON.stringify(markerDates) === JSON.stringify(cardDates),
      `${mode} left-knee card and marker rendered different Related Records groups.`,
    )
    assert(
      markerPanelText === cardPanelText,
      `${mode} left-knee card and marker rendered different Related Records text.`,
    )
    assert(activeKneeText.includes("左膝"), `${mode} left-knee marker did not synchronize issue-card focus.`)
    await screenshot(cdp, `${mode}-left-knee-marker.png`)

    const markerOutline = await evaluate(cdp, `getComputedStyle(document.querySelector('[data-marker-issue="issue_left_knee"][data-marker-role="problem"]')).outlineStyle`)
    assert(markerOutline === "none", `${mode} mouse marker retained browser-native outline ${markerOutline}.`)
    const keyboardMarkerChanged = await evaluate(cdp, `(() => {
      const marker = document.querySelector('[data-marker-issue="issue_left_ankle"][data-marker-role="problem"]');
      const before = marker.innerHTML;
      marker.focus();
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(before !== marker.innerHTML))));
    })()`)
    assert(keyboardMarkerChanged, `${mode} keyboard focus did not produce a visible semantic marker state.`)
    await screenshot(cdp, `${mode}-desktop-keyboard-focus.png`)

    await clickIssue(cdp, "左踝")
    await waitFor(cdp, `document.querySelectorAll('[data-marker-role="pt_treatment_context"]').length === 0`)
    assert(
      JSON.stringify(await attributeValues(cdp, '[data-marker-role="problem"]', "data-body-map-marker")) ===
        JSON.stringify(defaultProblemMarkers),
      `${mode} issue selection hid or replaced problem markers.`,
    )
    await clickIssue(cdp, "左膝")
    await waitFor(cdp, `document.querySelectorAll('[data-marker-role="pt_treatment_context"]').length > 0`)

    await clickView(cdp, "back")
    await screenshot(cdp, `${mode}-desktop-selected-back.png`)
    await clickView(cdp, "front")
    const trainingBaselineGroupIds = await values(cdp, "[data-related-group-id]", "relatedGroupId")
    const trainingBaselineIssue = await activeIssueId(cdp)
    const trainingBaselineExpanded = await issueExpanded(cdp, trainingBaselineIssue)
    await clickSelector(cdp, "[data-training-review-toggle]")
    await waitFor(cdp, `document.querySelector('[data-training-review-toggle]').getAttribute("aria-checked") === "true"`)
    assert(
      (await evaluate(cdp, `document.querySelector('[data-training-review-toggle]').innerText`)).includes("训练负荷"),
      `${mode} training control did not use 训练负荷 copy.`,
    )
    assert(
      JSON.stringify(await bodyMapViewCounts(cdp)) === JSON.stringify(defaultProblemViewCounts),
      `${mode} Training Load changed problem-only front/back counters.`,
    )
    const problemsWithTraining = await attributeValues(cdp, '[data-marker-role="problem"]', "data-body-map-marker")
    assert(
      JSON.stringify(problemsWithTraining) === JSON.stringify(defaultProblemMarkers),
      `${mode} training review hid or replaced problem markers.`,
    )
    const overlappingTreatmentId = await overlappingMarkerId(cdp, "pt_treatment_context", "training_review")
    if (overlappingTreatmentId) {
      await clickSvgMarker(cdp, `[data-body-map-marker="${overlappingTreatmentId}"]`)
      await waitFor(cdp, `document.querySelector('[data-training-load-detail]') !== null`)
      assert(await activeIssueId(cdp) === trainingBaselineIssue, `${mode} merged treatment/training selection changed selected issue.`)
      assert(
        JSON.stringify(await values(cdp, "[data-related-group-id]", "relatedGroupId")) === JSON.stringify(trainingBaselineGroupIds),
        `${mode} merged treatment/training selection changed Related Records.`,
      )
      assert(
        (await count(cdp, '[data-body-map-callout]')) >= 2,
        `${mode} overlapping treatment/training target did not render merged Body Map context.`,
      )
      if (mode === "api") {
        assert(
          (await count(cdp, '[data-body-map-callout="marker_left_knee"]')) === 1,
          "API quadriceps selection displaced the selected left-knee problem callout.",
        )
      }
    }
    const trainingMarkersBeforeClear = await attributeValues(
      cdp,
      '[data-marker-role="training_review"]',
      "data-body-map-marker",
    )
    await clickBodyMapBlank(cdp)
    await waitFor(cdp, `
      document.querySelector('[data-training-load-detail]') === null &&
      document.querySelectorAll('[data-marker-role="pt_treatment_context"]').length === 0 &&
      document.querySelectorAll('[data-body-map-marker][aria-pressed="true"]').length === 0
    `)
    assert(
      (await evaluate(cdp, `document.querySelector('[data-training-review-toggle]').getAttribute("aria-checked")`)) === "true" &&
        JSON.stringify(await attributeValues(cdp, '[data-marker-role="training_review"]', "data-body-map-marker")) ===
          JSON.stringify(trainingMarkersBeforeClear),
      `${mode} blank Body Map click closed or changed Training Load.`,
    )
    assert(
      JSON.stringify(await attributeValues(cdp, '[data-marker-role="problem"]', "data-body-map-marker")) ===
        JSON.stringify(defaultProblemMarkers) &&
        JSON.stringify(await bodyMapViewCounts(cdp)) === JSON.stringify(defaultProblemViewCounts),
      `${mode} blank Body Map click hid problems or changed problem counters.`,
    )
    assert(await activeIssueId(cdp) === trainingBaselineIssue, `${mode} blank Body Map click changed selected issue.`)
    assert(
      await issueExpanded(cdp, trainingBaselineIssue) === trainingBaselineExpanded,
      `${mode} blank Body Map click changed card disclosure.`,
    )
    assert(
      JSON.stringify(await values(cdp, "[data-related-group-id]", "relatedGroupId")) === JSON.stringify(trainingBaselineGroupIds),
      `${mode} blank Body Map click changed Related Records.`,
    )
    await clickSvgMarker(cdp, '[data-marker-role="problem"][data-marker-issue="issue_left_knee"]')
    await waitFor(cdp, `document.querySelectorAll('[data-marker-role="pt_treatment_context"]').length > 0`)
    assert(
      (await count(cdp, '[data-body-map-callout]')) > 0,
      `${mode} marker selection did not restore Body Map context after a blank click.`,
    )
    await screenshot(cdp, `${mode}-desktop-training-front.png`)
    await clickView(cdp, "back")
    await waitFor(cdp, `document.querySelectorAll('[data-marker-role="training_review"]').length > 0`)
    const lowHeat = await trainingHeatState(cdp, "marker_training_calves_back")
    const highHeat = await trainingHeatState(cdp, "marker_training_hamstrings_back")
    assert(lowHeat.level === "1", `${mode} 3-set calf marker did not expose heat level 1: ${JSON.stringify(lowHeat)}.`)
    assert(highHeat.level === "4", `${mode} 18-set hamstring marker did not expose heat level 4: ${JSON.stringify(highHeat)}.`)
    assert(
      highHeat.fillOpacity - lowHeat.fillOpacity >= 0.3,
      `${mode} low/high Training Load fills are not visibly separated: ${JSON.stringify({ lowHeat, highHeat })}.`,
    )
    await clickSvgMarker(cdp, '[data-body-map-marker="marker_training_calves_back"]')
    await waitFor(cdp, `document.querySelector('[data-training-load-detail]')?.dataset.trainingLoadDetail === "calves"`)
    const selectedLowHeat = await trainingHeatState(cdp, "marker_training_calves_back")
    assert(
      (await trainingDetailState(cdp)).header.includes("3组"),
      `${mode} low Training Load detail omitted its factual 3 sets.`,
    )
    await clickSvgMarker(cdp, '[data-body-map-marker="marker_training_hamstrings_back"]')
    await waitFor(cdp, `document.querySelector('[data-training-load-detail]')?.dataset.trainingLoadDetail === "hamstrings"`)
    const selectedHighHeat = await trainingHeatState(cdp, "marker_training_hamstrings_back")
    assert(
      (await trainingDetailState(cdp)).header.includes("18组"),
      `${mode} high Training Load detail omitted its factual 18 sets.`,
    )
    assert(
      selectedHighHeat.fillOpacity - selectedLowHeat.fillOpacity >= 0.3,
      `${mode} selection flattened low/high Training Load fills: ${JSON.stringify({ selectedLowHeat, selectedHighHeat })}.`,
    )
    await screenshot(cdp, `${mode}-desktop-training-heat.png`)
    const backLayoutBeforeTrainingDetail = await firstScreenLayout(cdp)
    assert(
      (await evaluate(cdp, `document.querySelector('[data-training-load-detail]').innerText`)).includes("组"),
      `${mode} selected training muscle omitted known or explicitly missing sets.`,
    )
    assert(
      (await count(cdp, "[data-training-load-exercise]")) > 0,
      `${mode} selected training muscle omitted contributing exercises.`,
    )
    if (mode === "api") {
      const trainingMarkerIds = await attributeValues(cdp, '[data-marker-role="training_review"]', "data-body-map-marker")
      assert(trainingMarkerIds.length > 1, "API Training Load did not expose distinct back-view muscles.")
      const firstMuscleId = await evaluate(cdp, `document.querySelector('[data-training-load-detail]').dataset.trainingLoadDetail`)
      const nextMarkerId = [
        "marker_training_lats_back",
        "marker_training_triceps_back",
        "marker_training_trapezius_back",
      ].find((markerId) => trainingMarkerIds.includes(markerId) && !markerId.includes(firstMuscleId))
      assert(nextMarkerId, "API Training Load has no unobscured second back-view muscle target.")
      await clickSvgMarker(cdp, `[data-body-map-marker="${nextMarkerId}"]`)
      await waitFor(cdp, `Boolean(document.querySelector('[data-training-load-detail]')?.dataset.trainingLoadDetail) && document.querySelector('[data-training-load-detail]').dataset.trainingLoadDetail !== ${JSON.stringify(firstMuscleId)}`)

      await clickSvgMarker(cdp, '[data-body-map-marker="marker_training_glutes_back"]')
      await waitFor(cdp, `document.querySelector('[data-training-load-detail]')?.dataset.trainingLoadDetail === "glutes"`)
      const gluteDetail = await trainingDetailState(cdp)
      assert(gluteDetail.header.includes("臀大肌/臀中肌") && !gluteDetail.header.includes("不详"), "API mixed known/unknown glute work polluted the detail header.")
      assert(new Set(gluteDetail.rows.map((row) => row.exercise)).size === gluteDetail.rows.length, "API glute detail rendered duplicate exercise rows.")
      assertRoleOrder(gluteDetail.rows.map((row) => row.role), "API glute detail")
      assert(gluteDetail.overviewSummary.startsWith("其它") && gluteDetail.overviewSummary.includes("共"), "API long glute detail omitted its compact overview summary.")
      assertTrainingDetailGeometry(gluteDetail.geometry, mode, "desktop", 136)
      assertStableRect(backLayoutBeforeTrainingDetail.anatomy, (await firstScreenLayout(cdp)).anatomy, mode, "training detail")
      const gluteCalloutLines = await evaluate(cdp, `[...document.querySelector('[data-body-map-callout="marker_training_glutes_back"] [data-callout-text]').querySelectorAll('tspan')].map((line) => line.textContent)`)
      assert(gluteCalloutLines.includes("臀大肌/臀中肌"), `API glute callout split the muscle label: ${gluteCalloutLines.join(" / ")}.`)
      await clickSvgMarker(cdp, '[data-body-map-marker="marker_training_glutes_back"]')
      await waitFor(cdp, `document.querySelector('[data-training-load-detail]') === null`)
      await clickSvgMarker(cdp, '[data-body-map-marker="marker_training_calves_back"]')
      await waitFor(cdp, `document.querySelector('[data-training-load-detail]')?.dataset.trainingLoadDetail === "calves"`)
      assert(
        (await evaluate(cdp, `document.querySelector('[data-body-map-callout="marker_training_calves_back"]').dataset.calloutSide`)) === "right",
        "API lower-leg Training Load callout did not route to the right of the detail overview.",
      )
      await clickSvgMarker(cdp, '[data-body-map-marker="marker_unknown_shoulder"]')
      await waitFor(cdp, `document.querySelector('[data-training-load-detail]')?.dataset.trainingLoadDetail === "trapezius"`)
      assert(
        (await count(cdp, '[data-body-map-callout="marker_unknown_shoulder"]')) === 1,
        "API trapezius selection did not merge its overlapping problem callout.",
      )
      await clickIssue(cdp, "左膝")
      await waitFor(cdp, `document.querySelector('[data-issue-card="issue_left_knee"]').getAttribute("aria-pressed") === "true"`)
      await clickView(cdp, "back")
      await clickSvgMarker(cdp, '[data-body-map-marker="marker_training_calves_back"]')
      await waitFor(cdp, `document.querySelector('[data-training-load-detail]')?.dataset.trainingLoadDetail === "calves"`)
    }
    assert(await activeIssueId(cdp) === trainingBaselineIssue, `${mode} training muscle changed selected issue.`)
    assert(
      JSON.stringify(await values(cdp, "[data-related-group-id]", "relatedGroupId")) === JSON.stringify(trainingBaselineGroupIds),
      `${mode} training muscle changed Related Records.`,
    )
    assert(await issueExpanded(cdp, trainingBaselineIssue) === trainingBaselineExpanded, `${mode} training muscle changed card disclosure.`)
    assertShortestCalloutLeaders(await calloutLeaderMetrics(cdp), mode, "training muscle")
    await clickIssue(cdp, "左膝")
    assert(await count(cdp, "[data-training-load-detail]") === 1, `${mode} card collapse cleared local training detail.`)
    await clickIssue(cdp, "左膝")
    assert(await count(cdp, "[data-training-load-detail]") === 1, `${mode} card expansion cleared local training detail.`)
    await clickIssue(cdp, "左踝")
    await waitFor(cdp, `document.querySelector('[data-training-load-detail]') === null`)
    assert(
      (await evaluate(cdp, `document.querySelector('[data-training-review-toggle]').getAttribute("aria-checked")`)) === "true",
      `${mode} issue switch closed Training Load.`,
    )
    await clickIssue(cdp, "左膝")
    await clickSvgMarker(cdp, '[data-marker-role="training_review"]')
    await waitFor(cdp, `document.querySelector('[data-training-load-detail]') !== null`)
    await clickView(cdp, "front")
    assert(await count(cdp, "[data-training-load-detail]") === 0, `${mode} view switch retained an incompatible muscle detail.`)
    if (mode === "api") {
      await clickSvgMarker(cdp, '[data-body-map-marker="marker_training_obliques_front"]')
      await waitFor(cdp, `document.querySelector('[data-training-load-detail]')?.dataset.trainingLoadDetail === "obliques"`)
      const obliqueGeometry = await renderedMarkerGeometry(cdp, "marker_training_obliques_front")
      await screenshot(cdp, "api-desktop-training-obliques.png")
      assert(
        JSON.stringify(obliqueGeometry.pathIds) === JSON.stringify(["abs-upper-left", "abs-upper-right"]),
        `API external oblique did not use the existing outer diagonal abdominal paths: ${JSON.stringify(obliqueGeometry)}.`,
      )
      const obliqueDetail = await trainingDetailState(cdp)
      assert(
        obliqueDetail.header.includes("21组")
          && ["侧身平板支撑", "高位平板支撑触肩", "死虫式"].every((exercise) => obliqueDetail.rows.some((row) => row.exercise === exercise))
          && obliqueDetail.overviewSummary.includes("其它 2 个动作")
          && obliqueDetail.overviewSummary.includes("共 9组"),
        `API external oblique detail did not preserve the primary rows and compact secondary summary: ${JSON.stringify(obliqueDetail)}.`,
      )
      await clickSvgMarker(cdp, '[data-body-map-marker="marker_training_rectus_abdominis_front"]')
      await waitFor(cdp, `document.querySelector('[data-training-load-detail]')?.dataset.trainingLoadDetail === "rectus_abdominis"`)
      const rectusGeometry = await renderedMarkerGeometry(cdp, "marker_training_rectus_abdominis_front")
      await screenshot(cdp, "api-desktop-training-rectus.png")
      assert(
        JSON.stringify(rectusGeometry.pathIds) === JSON.stringify([
          "abs-lower-left",
          "abs-lower-right",
          "rectus-abdominis-middle-left",
          "rectus-abdominis-middle-right",
          "rectus-abdominis-upper-left",
          "rectus-abdominis-upper-right",
        ]),
        `API rectus abdominis did not cover the paired central upper, middle, and lower paths: ${JSON.stringify(rectusGeometry)}.`,
      )
      assert(
        rectusGeometry.topRatio < 0.29 && rectusGeometry.heightRatio > 0.2,
        `API rectus abdominis did not span the supported upper-to-lower abdominal extent: ${JSON.stringify(rectusGeometry)}.`,
      )
      const rectusDetail = await trainingDetailState(cdp)
      assert(
        rectusDetail.header.includes("21组")
          && ["平板支撑", "死虫式单臂哑铃飞鸟", "死虫式"].every((exercise) => rectusDetail.rows.some((row) => row.exercise === exercise))
          && rectusDetail.overviewSummary.includes("其它 2 个动作")
          && rectusDetail.overviewSummary.includes("共 6组"),
        `API rectus abdominis detail did not preserve the primary rows and compact secondary summary: ${JSON.stringify(rectusDetail)}.`,
      )
      await clickSvgMarker(cdp, '[data-body-map-marker="marker_training_deltoids_front"]')
      await waitFor(cdp, `document.querySelector('[data-training-load-detail]')?.dataset.trainingLoadDetail === "deltoids"`)
      const deltoidDetail = await trainingDetailState(cdp)
      assert(!deltoidDetail.header.includes("不详"), "API mixed deltoid work polluted the detail header.")
      assert(deltoidDetail.rows.some((row) => row.text.includes("组数不详")), "API deltoid detail omitted unknown work from the affected exercise row.")
    }
    await clickSelector(cdp, "[data-training-review-toggle]")
    await waitFor(cdp, `document.querySelector('[data-training-review-toggle]').getAttribute("aria-checked") === "false"`)
    assert(await count(cdp, '[data-marker-role="training_review"]') === 0, `${mode} closing Training Load left muscle markers visible.`)
    assert(await activeIssueId(cdp) === trainingBaselineIssue, `${mode} closing Training Load changed selected issue.`)
    assert(
      JSON.stringify(await values(cdp, "[data-related-group-id]", "relatedGroupId")) === JSON.stringify(trainingBaselineGroupIds),
      `${mode} closing Training Load changed Related Records.`,
    )
    await screenshot(cdp, `${mode}-desktop-training-back.png`)

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    })
    await cdp.send("Page.navigate", { url })
    await waitFor(cdp, `document.readyState === "complete" && document.body.innerText.includes("相关记录")`)
    await assertMobileIssueWorkspaceDoesNotAlign(cdp, mode)
    await assertEveryTopIssueCard(cdp, `${mode} mobile`)
    await clickIssue(cdp, "左膝")
    const mobileDates = await values(cdp, "[data-related-group-date]", "relatedGroupDate")
    assert(
      JSON.stringify(mobileDates) === JSON.stringify(cardDates),
      `${mode} mobile left-knee card rendered different Related Records groups.`,
    )
    assertCalloutsInsideFigure(await firstScreenLayout(cdp), mode, "mobile left-knee")
    assertRelatedTimeline(await relatedTimelineState(cdp), mode, "mobile")
    await screenshot(cdp, `${mode}-mobile-left-knee-card.png`)
    await clickSelector(cdp, "[data-training-review-toggle]")
    await waitFor(cdp, `document.querySelector('[data-training-review-toggle]').getAttribute("aria-checked") === "true"`)
    assert(await count(cdp, "[data-issue-card]") <= 3, `${mode} mobile rendered more than three issue cards.`)
    await clickView(cdp, "back")
    await waitFor(cdp, `document.querySelectorAll('[data-marker-role="training_review"]').length > 0`)
    await clickSvgMarker(cdp, '[data-body-map-marker="marker_training_hamstrings_back"]')
    await waitFor(cdp, `document.querySelector('[data-training-load-detail]') !== null`)
    assert(
      (await trainingHeatState(cdp, "marker_training_hamstrings_back")).level === "4",
      `${mode} mobile high Training Load marker lost its display-ready heat level.`,
    )
    assertShortestCalloutLeaders(await calloutLeaderMetrics(cdp), mode, "mobile training muscle")
    assertTrainingDetailGeometry((await trainingDetailState(cdp)).geometry, mode, "mobile", 116)
    await screenshot(cdp, `${mode}-mobile-training-heat.png`)
    await clickSelector(cdp, "[data-training-review-toggle]")
    await waitFor(cdp, `document.querySelector('[data-training-review-toggle]').getAttribute("aria-checked") === "false"`)
    assert(await count(cdp, "[data-training-load-detail]") === 0, `${mode} mobile close retained training detail.`)
    await screenshot(cdp, `${mode}-mobile-training-review.png`)
  } finally {
    await cdp.close()
    await fetch(`${cdpUrl}/json/close/${target.id}`)
  }
}

async function clickIssue(cdp, label) {
  const selector = await evaluate(cdp, `(() => {
    const button = [...document.querySelectorAll("main ul button")].find((item) => item.innerText.includes(${JSON.stringify(label)}));
    return button?.getAttribute("data-issue-card") ?? null;
  })()`)
  assert(selector, `Could not click ${label} issue card.`)
  await clickSelector(cdp, `[data-issue-card="${selector}"]`)
}

async function clickMarker(cdp, label) {
  const result = await evaluate(cdp, `(() => {
    const markers = [...document.querySelectorAll('[role="button"][aria-label]')];
    const marker = markers
      .find((item) => item.getAttribute("aria-label").startsWith(${JSON.stringify(label)}));
    if (!marker) return { id: null, labels: markers.map((item) => item.getAttribute("aria-label")) };
    return { id: marker.getAttribute("data-body-map-marker"), labels: [] };
  })()`)
  assert(result.id, `Could not click ${label} Body Map marker; available labels: ${result.labels.join(" | ")}`)
  await clickSelector(cdp, `[data-body-map-marker="${result.id}"]`)
}

async function clickView(cdp, view) {
  await clickSelector(cdp, `[data-body-map-view="${view}"]`)
}

async function clickSvgMarker(cdp, selector) {
  const point = await evaluate(cdp, `(() => {
    const marker = document.querySelector(${JSON.stringify(selector)});
    if (!marker) return null;
    marker.scrollIntoView({ block: "center", inline: "center" });
    for (const target of marker.querySelectorAll('path, ellipse')) {
      const bounds = target.getBBox();
      const matrix = target.getScreenCTM();
      if (!matrix || typeof target.isPointInFill !== 'function') continue;
      for (let row = 1; row <= 7; row += 1) {
        for (let column = 1; column <= 7; column += 1) {
          const local = new DOMPoint(
            bounds.x + bounds.width * column / 8,
            bounds.y + bounds.height * row / 8,
          );
          if (!target.isPointInFill(local)) continue;
          const screen = local.matrixTransform(matrix);
          if (document.elementFromPoint(screen.x, screen.y)?.closest('[data-body-map-marker]') === marker) {
            return { x: screen.x, y: screen.y };
          }
        }
      }
    }
    const rect = marker.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`)
  assert(point, `Could not find SVG marker ${selector}.`)
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 })
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 })
  await pause(200)
}

async function clickBodyMapBlank(cdp) {
  const point = await evaluate(cdp, `(() => {
    const figure = document.querySelector('[data-body-map-figure]');
    if (!figure) return null;
    figure.scrollIntoView({ block: "center", inline: "center" });
    const rect = figure.getBoundingClientRect();
    return { x: rect.left + rect.width * 0.04, y: rect.top + rect.height * 0.04 };
  })()`)
  assert(point, "Could not find Body Map blank click target.")
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 })
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 })
  await pause(200)
}

async function clickSelector(cdp, selector) {
  const point = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: "center", inline: "center" });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`)
  assert(point, `Could not find click target ${selector}.`)
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 })
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 })
  await pause(200)
}

async function clickVisibleSelector(cdp, selector) {
  const point = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`)
  assert(point, `Could not find visible click target ${selector}.`)
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 })
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 })
  await pause(200)
}

async function activateButtonWithKeyboard(cdp, selector) {
  const focused = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.focus({ preventScroll: true });
    return document.activeElement === element;
  })()`)
  assert(focused, `Could not focus button ${selector}.`)
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 })
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 })
  await pause(200)
}

async function values(cdp, selector, datasetKey) {
  return evaluate(
    cdp,
    `[...document.querySelectorAll(${JSON.stringify(selector)})].map((item) => item.dataset[${JSON.stringify(datasetKey)}])`,
  )
}

async function attributeValues(cdp, selector, attribute) {
  return evaluate(
    cdp,
    `[...document.querySelectorAll(${JSON.stringify(selector)})].map((item) => item.getAttribute(${JSON.stringify(attribute)})).sort()`,
  )
}

async function count(cdp, selector) {
  return evaluate(cdp, `document.querySelectorAll(${JSON.stringify(selector)}).length`)
}

async function overlappingMarkerId(cdp, contextRole, trainingRole) {
  return evaluate(cdp, `(() => {
    const pathIds = (marker) => new Set(
      [...marker.querySelectorAll('[data-rendered-anatomy-path]')]
        .map((path) => path.dataset.renderedAnatomyPath),
    );
    const trainingPathIds = [...document.querySelectorAll('[data-marker-role="${trainingRole}"]')]
      .map(pathIds);
    for (const marker of document.querySelectorAll('[data-marker-role="${contextRole}"]')) {
      const contextPathIds = pathIds(marker);
      if (trainingPathIds.some((ids) => [...contextPathIds].some((id) => ids.has(id)))) {
        return marker.dataset.bodyMapMarker;
      }
    }
    return null;
  })()`)
}

async function firstScreenLayout(cdp) {
  return evaluate(cdp, `(() => {
    const panels = [...document.querySelectorAll('[data-first-screen-grid] > section')];
    const figure = document.querySelector('[data-body-map-figure]');
    const anatomy = figure.querySelector('[data-body-map-anatomy]');
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    return {
      panels: panels.map(rect),
      figure: rect(figure),
      anatomy: rect(anatomy),
      callouts: [...figure.querySelectorAll('[data-body-map-callout]')].map(rect),
    };
  })()`)
}

async function relatedTimelineState(cdp) {
  return evaluate(cdp, `(() => {
    const items = [...document.querySelectorAll('[data-related-group-id]')];
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    return {
      railCount: document.querySelectorAll('[data-related-timeline-rail]').length,
      items: items.map((item, index) => {
        const content = item.querySelector('[data-related-timeline-content]');
        const date = item.querySelector('[data-related-timeline-date]');
        const time = date.querySelector('time');
        const separator = item.querySelector('[data-related-timeline-separator]');
        const node = item.querySelector('[data-related-timeline-node]');
        const rail = item.querySelector('[data-related-timeline-rail]');
        const nextNode = items[index + 1]?.querySelector('[data-related-timeline-node]');
        const tag = item.querySelector('[data-related-role-tag]');
        const style = getComputedStyle(content);
        const tagStyle = getComputedStyle(tag);
        const slotTexts = [...item.querySelectorAll('[data-related-slot]')].map((slot) => slot.innerText.trim());
        return {
          date: item.dataset.relatedGroupDate,
          role: tag.innerText.trim(),
          scene: item.querySelector('[data-related-scene-title]').innerText.trim(),
          itemRect: rect(item),
          dateRect: rect(date),
          timeRect: rect(time),
          separatorRect: rect(separator),
          contentRect: rect(content),
          nodeX: rect(node).left + rect(node).width / 2,
          nodeY: rect(node).top + rect(node).height / 2,
          nodeRect: rect(node),
          railX: rail ? rect(rail).left + rect(rail).width / 2 : null,
          railRect: rail ? rect(rail) : null,
          railBottomStyle: rail ? getComputedStyle(rail).bottom : null,
          railGapToNextNode: rail && nextNode ? rect(nextNode).top - rect(rail).bottom : null,
          borderWidth: style.borderWidth,
          backgroundColor: style.backgroundColor,
          tagBackgroundColor: tagStyle.backgroundColor,
          tagRect: rect(tag),
          contentOverflow: content.scrollWidth - content.clientWidth,
          slotTexts,
        };
      }),
    };
  })()`)
}

async function assertDesktopIssueWorkspaceAlignment(cdp, mode) {
  const issueIds = await values(cdp, '[data-issue-card]', 'issueCard')
  assert(issueIds.length === 3, `${mode} desktop alignment test requires exactly three Issue Cards.`)

  await setWorkspaceViewportTop(cdp, -80)
  await clickVisibleSelector(cdp, `[data-issue-card="${issueIds[1]}"]`)
  await waitFor(cdp, `Math.abs(document.querySelector('[data-first-screen-grid]').getBoundingClientRect().top - 16) <= 2`)
  const aligned = await workspaceScrollState(cdp)
  assert(aligned.selectedIssueId === issueIds[1], `${mode} alignment changed the selected issue: ${JSON.stringify(aligned)}.`)
  assert(aligned.top >= 14 && aligned.top <= 18, `${mode} workspace did not retain 12-16px breathing room: ${JSON.stringify(aligned)}.`)

  await clickVisibleSelector(cdp, `[data-issue-card="${issueIds[2]}"]`)
  const switchedWhileFramed = await workspaceScrollState(cdp)
  assert(Math.abs(switchedWhileFramed.scrollY - aligned.scrollY) <= 2, `${mode} framed Issue Card switch moved the page: ${JSON.stringify({ aligned, switchedWhileFramed })}.`)

  await clickVisibleSelector(cdp, `[data-issue-card="${issueIds[2]}"]`)
  const collapsed = await workspaceScrollState(cdp)
  assert(Math.abs(collapsed.scrollY - aligned.scrollY) <= 2, `${mode} Issue Card collapse moved the page.`)
  await clickVisibleSelector(cdp, `[data-issue-card="${issueIds[2]}"]`)
  const expanded = await workspaceScrollState(cdp)
  assert(Math.abs(expanded.scrollY - aligned.scrollY) <= 2, `${mode} Issue Card expansion moved the page.`)

  await activateButtonWithKeyboard(cdp, '[data-marker-role="problem"]')
  const afterProblemMarker = await workspaceScrollState(cdp)
  assert(Math.abs(afterProblemMarker.scrollY - aligned.scrollY) <= 2, `${mode} Body Map marker selection aligned the page.`)

  await clickVisibleSelector(cdp, '[data-body-map-view="back"]')
  const afterViewSwitch = await workspaceScrollState(cdp)
  assert(Math.abs(afterViewSwitch.scrollY - aligned.scrollY) <= 2, `${mode} Body Map view switch aligned the page.`)
  await clickVisibleSelector(cdp, '[data-training-review-toggle]')
  await waitFor(cdp, `document.querySelector('[data-training-review-toggle]').getAttribute('aria-checked') === 'true'`)
  const trainingToggleState = await evaluate(cdp, `({
    checked: document.querySelector('[data-training-review-toggle]').getAttribute('aria-checked'),
    activeView: document.querySelector('[data-body-map-view][aria-pressed="true"]')?.dataset.bodyMapView ?? null,
    markerRoles: [...document.querySelectorAll('[data-marker-role]')].map((marker) => marker.dataset.markerRole),
  })`)
  assert(trainingToggleState.markerRoles.includes('training_review'), `${mode} Training Load toggle rendered no muscle markers: ${JSON.stringify(trainingToggleState)}.`)
  const afterTrainingToggle = await workspaceScrollState(cdp)
  assert(Math.abs(afterTrainingToggle.scrollY - aligned.scrollY) <= 2, `${mode} Training Load toggle aligned the page.`)
  await activateButtonWithKeyboard(cdp, '[data-marker-role="training_review"]')
  const afterTrainingMarker = await workspaceScrollState(cdp)
  assert(Math.abs(afterTrainingMarker.scrollY - aligned.scrollY) <= 2, `${mode} Training Load muscle selection aligned the page.`)
  await clickVisibleSelector(cdp, '[data-training-review-toggle]')
  await clickVisibleSelector(cdp, '[data-body-map-view="front"]')

  await clickVisibleSelector(cdp, '[data-related-timeline-content]')
  const afterRelatedRecords = await workspaceScrollState(cdp)
  assert(Math.abs(afterRelatedRecords.scrollY - aligned.scrollY) <= 2, `${mode} Related Records interaction aligned the page.`)

  if (afterRelatedRecords.selectedIssueId !== issueIds[2]) {
    await clickVisibleSelector(cdp, `[data-issue-card="${issueIds[2]}"]`)
  }
  await setWorkspaceViewportTop(cdp, -72)
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  })
  await evaluate(cdp, `(() => {
    window.__issue90ScrollCalls = [];
    window.__issue90OriginalScrollTo = window.scrollTo.bind(window);
    window.scrollTo = (...args) => {
      const options = typeof args[0] === 'object' ? args[0] : { left: args[0], top: args[1] };
      window.__issue90ScrollCalls.push(options);
      return window.__issue90OriginalScrollTo(...args);
    };
  })()`)
  await evaluate(cdp, `document.querySelector('[data-issue-card="${issueIds[0]}"]').focus({ preventScroll: true })`)
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 })
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 })
  await waitFor(cdp, `document.querySelector('[data-issue-card="${issueIds[0]}"]').getAttribute('aria-pressed') === 'true'`)
  await waitFor(cdp, `Math.abs(document.querySelector('[data-first-screen-grid]').getBoundingClientRect().top - 16) <= 2`)
  const keyboardAligned = await workspaceScrollState(cdp)
  const reducedMotionBehavior = await evaluate(cdp, `window.__issue90ScrollCalls.at(-1)?.behavior ?? null`)
  assert(keyboardAligned.selectedIssueId === issueIds[0], `${mode} keyboard selection did not select the first Issue Card.`)
  assert(keyboardAligned.focusedIssueId === issueIds[0], `${mode} keyboard alignment moved focus away from the activated card.`)
  assert(reducedMotionBehavior === "auto", `${mode} reduced-motion alignment used ${reducedMotionBehavior}.`)
  await evaluate(cdp, `(() => {
    window.scrollTo = window.__issue90OriginalScrollTo;
    delete window.__issue90OriginalScrollTo;
    delete window.__issue90ScrollCalls;
  })()`)
  await cdp.send("Emulation.setEmulatedMedia", { features: [] })
  await screenshot(cdp, `${mode}-desktop-issue-workspace-aligned.png`)
}

async function assertMobileIssueWorkspaceDoesNotAlign(cdp, mode) {
  const issueIds = await values(cdp, '[data-issue-card]', 'issueCard')
  await setWorkspaceViewportTop(cdp, -40)
  const before = await workspaceScrollState(cdp)
  await clickVisibleSelector(cdp, `[data-issue-card="${issueIds[1]}"]`)
  const after = await workspaceScrollState(cdp)
  assert(Math.abs(after.scrollY - before.scrollY) <= 2, `${mode} mobile Issue Card selection auto-scrolled the page: ${JSON.stringify({ before, after })}.`)
  await evaluate(cdp, `window.scrollTo({ top: 0, behavior: 'auto' })`)
  await pause(100)
}

async function setWorkspaceViewportTop(cdp, top) {
  await evaluate(cdp, `(() => {
    const workspace = document.querySelector('[data-first-screen-grid]');
    const rect = workspace.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - ${top}), behavior: 'auto' });
  })()`)
  await pause(100)
}

async function workspaceScrollState(cdp) {
  return evaluate(cdp, `(() => {
    const workspace = document.querySelector('[data-first-screen-grid]');
    const rect = workspace.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      scrollY: window.scrollY,
      selectedIssueId: document.querySelector('[data-issue-card][aria-pressed="true"]')?.dataset.issueCard ?? null,
      focusedIssueId: document.activeElement?.dataset?.issueCard ?? null,
    };
  })()`)
}

async function topIssueState(cdp) {
  return evaluate(cdp, `(() => {
    const list = document.querySelector('[data-top-issues-list]');
    const style = getComputedStyle(list);
    return {
      overflowY: style.overflowY,
      clientHeight: list.clientHeight,
      scrollHeight: list.scrollHeight,
      cards: [...document.querySelectorAll('[data-issue-card]')].map((card) => {
        const title = card.querySelector('[data-issue-title]');
        const summary = card.querySelector('[data-issue-summary]');
        const summaryStyle = summary ? getComputedStyle(summary) : null;
        const careList = card.querySelector('[data-issue-care-status-list]');
        const supportingEvidence = card.querySelector('[data-issue-supporting-evidence]');
        const factValues = [...card.querySelectorAll('[data-issue-fact-value]')];
        const factIcons = [...card.querySelectorAll('[data-issue-fact-icon] svg')];
        return {
          id: card.dataset.issueCard,
          expanded: card.getAttribute('aria-expanded') === 'true',
          badgeTexts: [...card.querySelectorAll('[data-issue-attention-badge]')].map((badge) => badge.innerText.trim()),
          summaryText: summary?.innerText.trim() ?? '',
          summaryHeight: summary?.getBoundingClientRect().height ?? 0,
          summaryLineHeight: summaryStyle ? Number.parseFloat(summaryStyle.lineHeight) : 0,
          summaryFontSize: summaryStyle ? Number.parseFloat(summaryStyle.fontSize) : 0,
          summaryFontWeight: summaryStyle ? Number.parseInt(summaryStyle.fontWeight) : 0,
          summaryColor: summaryStyle?.color ?? '',
          titleColor: title ? getComputedStyle(title).color : '',
          contextTags: [...card.querySelectorAll('[data-issue-context-tag]')].map((tag) => tag.innerText.trim()),
          relatedRecordsText: card.querySelector('[data-issue-line="相关记录"]')?.innerText.trim() ?? '',
          supportingDividerCount: supportingEvidence && Number.parseFloat(getComputedStyle(supportingEvidence).borderTopWidth) > 0 ? 1 : 0,
          factValueFontSizes: factValues.map((value) => Number.parseFloat(getComputedStyle(value).fontSize)),
          factValueNumericStyles: factValues.map((value) => getComputedStyle(value).fontVariantNumeric),
          factIconCount: factIcons.length,
          factIconsHidden: factIcons.every((icon) => icon.getAttribute('aria-hidden') === 'true'),
          borderedFactRowCount: [...card.querySelectorAll('[data-issue-line]')].filter((row) => {
            const rowStyle = getComputedStyle(row);
            return [rowStyle.borderTopWidth, rowStyle.borderRightWidth, rowStyle.borderBottomWidth, rowStyle.borderLeftWidth].some((width) => Number.parseFloat(width) > 0);
          }).length,
          careStatusTexts: [...card.querySelectorAll('[data-issue-care-status-list] li')].map((item) => item.innerText.trim()),
          careIndent: careList ? Number.parseFloat(getComputedStyle(careList).paddingLeft) : 0,
          exposureText: card.querySelector('[data-issue-line="相关负荷"]')?.innerText.trim() ?? '',
          legacyRowCount: card.querySelectorAll('[data-issue-line="症状"], [data-issue-line="功能表现"], [data-issue-line="情景"], [data-issue-line="时间"], [data-issue-line="最近"], [data-issue-action-list]').length,
        };
      }),
    };
  })()`)
}

async function assertEveryTopIssueCard(cdp, mode) {
  const issueIds = await attributeValues(cdp, '[data-issue-card]', 'data-issue-card')
  const expectedApiBadges = {
    issue_left_knee: '反复出现',
    issue_left_ankle: '单次出现',
    issue_unknown_shoulder: '待跟进',
  }

  for (const issueId of issueIds) {
    if (await issueExpanded(cdp, issueId) !== 'true') {
      await clickSelector(cdp, `[data-issue-card="${issueId}"]`)
      await waitFor(cdp, `document.querySelector('[data-issue-card="${issueId}"]').getAttribute('aria-expanded') === 'true'`)
    }
    const expanded = await topIssueState(cdp)
    const card = expanded.cards.find((item) => item.id === issueId)
    assert(card, `${mode} did not render Issue Card ${issueId}.`)
    assert(expanded.overflowY === 'visible', `${mode} Top Issues retained an independent scrolling container.`)
    assert(expanded.scrollHeight <= expanded.clientHeight + 1, `${mode} Top Issues overflowed its equal-height panel: ${JSON.stringify(expanded)}.`)
    assert(expanded.cards.filter((item) => item.expanded).length === 1, `${mode} expanded more than one Issue Card.`)
    assert(card.badgeTexts.length === 1, `${mode} ${issueId} rendered ${card.badgeTexts.length} attention badges.`)
    assert(card.summaryText.length > 0, `${mode} ${issueId} omitted its shared issue summary.`)
    assert(card.summaryHeight <= card.summaryLineHeight * 2 + 1, `${mode} ${issueId} summary exceeded two rendered lines.`)
    assert(card.summaryFontSize >= 13 && card.summaryFontWeight >= 500, `${mode} ${issueId} summary did not establish a primary reading level: ${JSON.stringify(card)}.`)
    assert(card.summaryColor === card.titleColor, `${mode} ${issueId} summary remained visually muted against its title: ${JSON.stringify(card)}.`)
    assert(card.contextTags.length <= 4, `${mode} ${issueId} rendered more than three context tags plus overflow.`)
    assert(card.contextTags.every((tag) => !/\d{1,2}\/\d{1,2}|后续|处理|调整|结果|状态|改善/.test(tag)), `${mode} ${issueId} context tags repeated dates, treatment, or outcome wording.`)
    assert(card.relatedRecordsText.includes('次｜'), `${mode} ${issueId} related-record summary did not disambiguate count and dates.`)
    assert(card.supportingDividerCount === 1, `${mode} ${issueId} did not use exactly one primary/supporting divider.`)
    assert(card.factValueFontSizes.every((size) => size <= card.summaryFontSize), `${mode} ${issueId} supporting facts overpowered the issue summary.`)
    assert(card.factValueNumericStyles.every((style) => style.includes('tabular-nums')), `${mode} ${issueId} factual counts did not use tabular numerals.`)
    assert(card.factIconCount <= 2 && card.factIconsHidden, `${mode} ${issueId} fact icons were excessive or exposed to assistive text.`)
    assert(card.borderedFactRowCount === 0, `${mode} ${issueId} wrapped supporting facts in bordered rows.`)
    assert(card.careStatusTexts.length <= 2, `${mode} ${issueId} rendered more than two care/status lines.`)
    assert(card.careStatusTexts.every((text) => !/^(已做|结果)：/.test(text)), `${mode} ${issueId} retained redundant care/status prefixes.`)
    assert(card.careIndent > 0, `${mode} ${issueId} care/status lines were not visually indented.`)
    assert(card.legacyRowCount === 0, `${mode} ${issueId} retained legacy presentation/context/time/recent rows.`)
    if (mode === 'api') {
      assert(card.badgeTexts[0] === expectedApiBadges[issueId], `API ${issueId} rendered badge ${card.badgeTexts[0]}.`)
      if (issueId === 'issue_unknown_shoulder') {
        assert(card.summaryText.includes('间歇性紧张伴疼痛'), `API shoulder summary lost source-supported symptoms: ${card.summaryText}.`)
      }
      if (issueId === 'issue_left_knee') {
        assert(card.careStatusTexts[0] === 'PT局部处理、训练中调整动作和跑步中调整落地方式', `API left-knee care summary drifted: ${card.careStatusTexts[0]}.`)
        assert(card.exposureText.includes('力量训练 1 次') && card.exposureText.includes('康复训练 1 次') && card.exposureText.includes('跑步 2 次'), `API left-knee exposure omitted a category: ${card.exposureText}.`)
      }
    }

    await clickSelector(cdp, `[data-issue-card="${issueId}"]`)
    await waitFor(cdp, `document.querySelector('[data-issue-card="${issueId}"]').getAttribute('aria-expanded') === 'false'`)
    const collapsed = await topIssueState(cdp)
    const collapsedCard = collapsed.cards.find((item) => item.id === issueId)
    assert(collapsed.scrollHeight <= collapsed.clientHeight + 1, `${mode} Top Issues overflowed after collapsing ${issueId}.`)
    assert(collapsedCard.summaryText === card.summaryText, `${mode} ${issueId} changed summary between expanded and collapsed states.`)
    assert(collapsedCard.summaryHeight <= collapsedCard.summaryLineHeight * 2 + 1, `${mode} ${issueId} collapsed summary exceeded two rendered lines.`)
    assert(collapsedCard.relatedRecordsText === '', `${mode} ${issueId} retained expanded related records while collapsed.`)
    assert(collapsedCard.badgeTexts.length === 1, `${mode} ${issueId} changed badge count when collapsed.`)
  }
}

function assertRelatedTimeline(state, mode, viewport) {
  assert(state.items.length > 0, `${mode} ${viewport} Related Records rendered no timeline items.`)
  assert(state.railCount === Math.max(0, state.items.length - 1), `${mode} ${viewport} Related Records rail is not continuous.`)
  const dateWidths = state.items.map((item) => item.dateRect.width)
  const separatorWidths = state.items.map((item) => item.separatorRect.width)
  assert(Math.max(...dateWidths) - Math.min(...dateWidths) <= 0.5, `${mode} ${viewport} timestamp column width drifted.`)
  assert(Math.max(...separatorWidths) - Math.min(...separatorWidths) <= 0.5, `${mode} ${viewport} separator column width drifted.`)
  for (const item of state.items) {
    const expectedDateWidth = viewport === "mobile" ? [39, 41] : [43, 45]
    const expectedSeparatorWidth = viewport === "mobile" ? [9, 11] : [11, 13]
    assert(item.dateRect.width >= expectedDateWidth[0] && item.dateRect.width <= expectedDateWidth[1], `${mode} ${viewport} timestamp width drifted: ${JSON.stringify(item)}.`)
    assert(item.separatorRect.width >= expectedSeparatorWidth[0] && item.separatorRect.width <= expectedSeparatorWidth[1], `${mode} ${viewport} separator width drifted: ${JSON.stringify(item)}.`)
    assert(item.dateRect.right < item.separatorRect.left, `${mode} ${viewport} timestamp overlaps the separator.`)
    assert(item.separatorRect.right < item.contentRect.left, `${mode} ${viewport} separator overlaps narrative content.`)
    const timestampCenterY = item.timeRect.top + item.timeRect.height / 2
    const tagCenterY = item.tagRect.top + item.tagRect.height / 2
    assert(Math.abs(timestampCenterY - item.nodeY) <= 1, `${mode} ${viewport} timestamp and node are vertically misaligned: ${JSON.stringify(item)}.`)
    assert(Math.abs(timestampCenterY - tagCenterY) <= 1, `${mode} ${viewport} timestamp and role tag are vertically misaligned: ${JSON.stringify(item)}.`)
    assert(Math.abs(item.nodeY - tagCenterY) <= 1, `${mode} ${viewport} timeline node and role tag are vertically misaligned: ${JSON.stringify(item)}.`)
    const timestampNodeGap = item.nodeRect.left - item.timeRect.right
    const expectedTimestampNodeGap = viewport === "mobile" ? [10, 16] : [14, 20]
    assert(timestampNodeGap >= expectedTimestampNodeGap[0] && timestampNodeGap <= expectedTimestampNodeGap[1], `${mode} ${viewport} timestamp-to-node spacing is uncomfortable: ${JSON.stringify(item)}.`)
    assert(item.borderWidth === "0px", `${mode} ${viewport} Related Records retained nested item cards.`)
    assert(item.backgroundColor === "rgba(0, 0, 0, 0)", `${mode} ${viewport} Related Records retained item-card backgrounds.`)
    assert(item.tagBackgroundColor !== "rgba(0, 0, 0, 0)", `${mode} ${viewport} Related Records role tag is not visually prominent.`)
    assert(item.contentOverflow <= 1, `${mode} ${viewport} Related Records content is horizontally clipped.`)
    assert(new Set(item.slotTexts).size === item.slotTexts.length, `${mode} ${viewport} Related Records repeated a slot sentence.`)
    if (item.railX !== null) assert(Math.abs(item.nodeX - item.railX) <= 1, `${mode} ${viewport} timeline node and rail are misaligned.`)
    if (item.railRect !== null) {
      assert(item.railRect.top - item.nodeRect.bottom >= 3, `${mode} ${viewport} timeline rail presses against the current node.`)
      assert(item.railBottomStyle === "0px", `${mode} ${viewport} timeline rail uses a fixed cross-item offset.`)
      assert(item.railRect.left > item.dateRect.right && item.railRect.right < item.contentRect.left, `${mode} ${viewport} timeline rail crosses timestamp or content.`)
    }
    if (item.railGapToNextNode !== null) {
      assert(item.railGapToNextNode >= 7 && item.railGapToNextNode <= 11, `${mode} ${viewport} timeline rail lacks a deliberate gap before the next node: ${JSON.stringify(item)}.`)
    }
  }
}

function assertEqualPanelHeights(layout, mode, state) {
  assert(layout.panels.length === 3, `${mode} ${state} did not render three first-screen panels.`)
  const heights = layout.panels.map((panel) => Math.round(panel.height))
  assert(Math.max(...heights) - Math.min(...heights) <= 1, `${mode} ${state} panel heights differ: ${heights.join(", ")}.`)
}

function assertStableRect(expected, actual, mode, state) {
  const widthDelta = Math.abs(expected.width - actual.width)
  const heightDelta = Math.abs(expected.height - actual.height)
  assert(widthDelta <= 1 && heightDelta <= 1, `${mode} Body Map resized after ${state}: ${expected.width}x${expected.height} -> ${actual.width}x${actual.height}.`)
}

function assertCalloutsInsideFigure(layout, mode, state) {
  for (const callout of layout.callouts) {
    assert(
      callout.left >= layout.figure.left - 1 &&
        callout.right <= layout.figure.right + 1 &&
        callout.top >= layout.figure.top - 1 &&
        callout.bottom <= layout.figure.bottom + 1,
      `${mode} ${state} Body Map callout is clipped outside the figure viewport: ${JSON.stringify({ callout, figure: layout.figure })}.`,
    )
  }
}

async function calloutLeaderMetrics(cdp) {
  return evaluate(cdp, `([...document.querySelectorAll('[data-body-map-callout]')].map((callout) => {
    const leader = callout.querySelector('[data-callout-leader]');
    const text = callout.querySelector('[data-callout-text]');
    const length = leader.getTotalLength();
    const start = leader.getPointAtLength(0);
    const end = leader.getPointAtLength(length);
    const chord = Math.hypot(end.x - start.x, end.y - start.y);
    const textBox = text.getBBox();
    const side = callout.dataset.calloutSide;
    const textGap = side === 'left' ? end.x - (textBox.x + textBox.width) : textBox.x - end.x;
    const marker = document.querySelector('[data-body-map-marker="' + callout.dataset.bodyMapCallout + '"]');
    const renderedPaths = [...(marker?.querySelectorAll('[data-rendered-anatomy-path]') ?? [])];
    const anchorInsideMarker = renderedPaths.length === 0 || renderedPaths.some((path) => {
      const box = path.getBBox();
      return start.x >= box.x - 0.05 && start.x <= box.x + box.width + 0.05 && start.y >= box.y - 0.05 && start.y <= box.y + box.height + 0.05;
    });
    const textLines = [...text.querySelectorAll('tspan')].map((line) => line.textContent ?? '');
    return { length, chord, textGap, anchorInsideMarker, hasRenderedPaths: renderedPaths.length > 0, textLines };
  }))`)
}

function assertShortestCalloutLeaders(metrics, mode, state) {
  for (const metric of metrics) {
    assert(metric.length <= metric.chord * 1.02 + 0.1, `${mode} ${state} callout took a longer-than-necessary route: ${JSON.stringify(metric)}.`)
    assert(metric.textGap >= 0.55 && metric.textGap <= 1.8, `${mode} ${state} callout has an uncomfortable text gap: ${JSON.stringify(metric)}.`)
    assert(!metric.hasRenderedPaths || metric.anchorInsideMarker, `${mode} ${state} callout anchor starts outside its rendered muscle path: ${JSON.stringify(metric)}.`)
    for (let index = 0; index < metric.textLines.length - 1; index += 1) {
      assert(
        !(/\d$/.test(metric.textLines[index]) && /^(\d|\s*组)/.test(metric.textLines[index + 1])),
        `${mode} ${state} callout split a numeric set value across lines: ${metric.textLines.join(" / ")}.`,
      )
    }
  }
}

async function trainingDetailState(cdp) {
  return evaluate(cdp, `(() => {
    const detail = document.querySelector('[data-training-load-detail]');
    const figure = document.querySelector('[data-body-map-figure]');
    const header = detail.querySelector('[data-training-load-header]');
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    const style = getComputedStyle(detail);
    return {
      header: header.innerText,
      rows: [...detail.querySelectorAll('[data-training-load-exercise]')].map((row) => ({
        exercise: row.querySelector('span')?.innerText ?? '',
        role: row.dataset.trainingLoadRole,
        text: row.innerText,
      })),
      overviewSummary: detail.querySelector('[data-training-load-overview-summary]')?.innerText ?? '',
      geometry: {
        detail: rect(detail),
        figure: rect(figure),
        header: rect(header),
        headerClientWidth: header.clientWidth,
        headerScrollWidth: header.scrollWidth,
        whiteSpace: getComputedStyle(header).whiteSpace,
        borderTopWidth: style.borderTopWidth,
        backgroundColor: style.backgroundColor,
      },
    };
  })()`)
}

async function trainingHeatState(cdp, markerId) {
  return evaluate(cdp, `(() => {
    const marker = document.querySelector('[data-body-map-marker="${markerId}"]');
    const shapes = [...marker.querySelectorAll('[data-training-heat-shape]')];
    return {
      level: marker.dataset.trainingHeatLevel,
      fillOpacity: Math.max(...shapes.map((shape) => Number(getComputedStyle(shape).fillOpacity))),
      selected: marker.getAttribute('aria-pressed'),
    };
  })()`)
}

function assertTrainingDetailGeometry(geometry, mode, state, maximumHeight) {
  assert(Math.abs(geometry.detail.left - geometry.figure.left) <= 2, `${mode} ${state} Training Load detail is not fixed at the lower left: ${JSON.stringify(geometry)}.`)
  assert(Math.abs(geometry.figure.bottom - geometry.detail.bottom - 4) <= 2, `${mode} ${state} Training Load detail is not fixed at the lower left: ${JSON.stringify(geometry)}.`)
  assert(geometry.detail.height <= maximumHeight + 1, `${mode} ${state} Training Load detail exceeded its maximum height: ${JSON.stringify(geometry)}.`)
  assert(geometry.whiteSpace === "nowrap", `${mode} ${state} Training Load header is not a single line.`)
  assert(geometry.headerScrollWidth <= geometry.headerClientWidth + 1, `${mode} ${state} Training Load header was visually truncated: ${JSON.stringify(geometry)}.`)
  assert(geometry.borderTopWidth === "0px", `${mode} ${state} Training Load detail retained a hard full border.`)
  assert(geometry.backgroundColor === "rgba(0, 0, 0, 0)", `${mode} ${state} Training Load detail retained an opaque background.`)
}

function assertRoleOrder(roles, state) {
  const order = { primary: 0, secondary: 1, stabilizer: 2, context: 3 }
  const ranks = roles.map((role) => order[role] ?? 99)
  assert(ranks.every((rank, index) => index === 0 || ranks[index - 1] <= rank), `${state} role order is ${roles.join(", ")}.`)
}

async function renderedMarkerGeometry(cdp, markerId) {
  return evaluate(cdp, `(() => {
    const anatomy = document.querySelector('[data-body-map-anatomy]').getBBox();
    const paths = [...document.querySelectorAll('[data-body-map-marker="${markerId}"] [data-rendered-anatomy-path]')];
    const boxes = paths.map((path) => path.getBBox());
    const top = Math.min(...boxes.map((box) => box.y));
    const bottom = Math.max(...boxes.map((box) => box.y + box.height));
    return {
      pathIds: paths.map((path) => path.dataset.renderedAnatomyPath).sort(),
      topRatio: (top - anatomy.y) / anatomy.height,
      heightRatio: (bottom - top) / anatomy.height,
    };
  })()`)
}

async function bodyMapViewCounts(cdp) {
  return evaluate(cdp, `Object.fromEntries([...document.querySelectorAll('[data-body-map-view]')].map((button) => [button.dataset.bodyMapView, button.innerText]))`)
}

async function activeIssueId(cdp) {
  return evaluate(cdp, `document.querySelector('[data-issue-card][aria-pressed="true"]')?.dataset.issueCard ?? null`)
}

async function issueExpanded(cdp, issueId) {
  return evaluate(cdp, `document.querySelector('[data-issue-card="${issueId}"]')?.getAttribute('aria-expanded')`)
}

async function relatedPanelText(cdp) {
  return evaluate(cdp, `document.querySelector("[data-related-records-scroll]").innerText`)
}

async function activeIssueText(cdp) {
  return evaluate(cdp, `document.querySelector("main ul button[aria-pressed='true']")?.innerText ?? ""`)
}

async function screenshot(cdp, fileName) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
  await writeFile(path.join(outputDir, fileName), Buffer.from(result.data, "base64"))
}

async function waitFor(cdp, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return
    await pause(100)
  }
  throw new Error(`Timed out waiting for browser condition: ${expression}`)
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function argValue(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1]
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

class CDP {
  static async connect(url) {
    const socket = new WebSocket(url)
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true })
      socket.addEventListener("error", reject, { once: true })
    })
    return new CDP(socket)
  }

  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data)
      if (!message.id) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      clearTimeout(pending.timeoutId)
      if (message.error) pending.reject(new Error(message.error.message))
      else pending.resolve(message.result)
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP command timed out: ${method}`))
      }, 10000)
      this.pending.set(id, { resolve, reject, timeoutId })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    for (const { reject, timeoutId } of this.pending.values()) {
      clearTimeout(timeoutId)
      reject(new Error("CDP connection closed."))
    }
    this.pending.clear()
    this.socket.close()
  }
}

await mkdir(outputDir, { recursive: true })
await validateApi(`${baseUrl}/`)
console.log(`PT Review API browser behavior passed; screenshots: ${outputDir}`)
