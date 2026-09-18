import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { LayoutGrid } from 'lucide-react'
import { AnimatePresence, domMax, LazyMotion, MotionConfig } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { BROWSE_CONTAINER } from '@/components/layout/app-shell'
import { AnswerSheet } from '@/components/practice/AnswerSheet'
import { PracticeQuestion } from '@/components/practice/PracticeQuestion'
import { QuestionStem } from '@/components/exams/QuestionStem'
import { PracticeResult } from '@/components/practice/PracticeResult'
import { PracticeSettings } from '@/components/practice/PracticeSettings'
import {
  SwipeQuestionCard,
  type SwipeCardEnter,
} from '@/components/practice/SwipeQuestionCard'
import {
  QuestionNavigator,
  type NavigatorGroup,
} from '@/components/practice/QuestionNavigator'
import { TimerChip } from '@/components/practice/TimerChip'
import { usePracticeAnswers } from '@/hooks/use-practice-session'
import {
  useGradePracticeSection,
  useSavePracticeAnswerDrafts,
  useUpdatePracticeSessionProgress,
} from '@/hooks/use-practice-mutations'
import { usePracticeClock } from '@/hooks/use-practice-clock'
import type { ExamItemWithOptions } from '@/services/exams'
import type { ExamStem } from '@/services/exam-stem'
import {
  peekItemAnswer,
  type PracticeAnswerDraft,
  type PracticeGradeResult,
  type PracticeSession,
  type RevealedItemAnswer,
} from '@/services/practice'

/**
 * 共享答题器：**整卷练习**与**题型练习**共用同一套答题 UI 与提交逻辑。
 *
 * 输入是「已经展平好的题目序列 + 题号导航分组 + 会话」；调用方只负责决定
 * 「练哪些题」，不重复实现答题、草稿、乐观态、计时、判分、结果页。
 *
 * 它**不是**页面：不决定会话从哪来、不判断要不要新建会话、不管路由。
 *
 * ⚠️ 答案边界不变：
 * - 常规查询（题目 / 作答）拿不到任何答案列；
 * - 「答题时显示答案」只经 `peek_item_answer`（单题、按会话范围限定）；
 * - 提交判分只经 `grade_practice_section`。两者都不在这里放宽任何列白名单。
 *
 * ⚠️ **保存策略：作答期间完全不联网，只在「离开」时一次性落库。**
 * 实测过反面做法的问题：逐次点选项就 upsert + 失效缓存，会让一次点选连带发出
 * 3 个请求，而且画面上什么都不做时还有 30s 一次的计时写回 —— 对用户就是纯噪音，
 * 而作答数据真正被服务端用到的时刻只有**提交判分**。
 * 因此：
 *
 * | 时机 | 行为 |
 * | --- | --- |
 * | 选中选项 / 打字 / 标记 | **只改内存**（`pending`），零请求 |
 * | 切换上一题 / 下一题 | **只改内存**，零请求 |
 * | 点「退出」 | 批量落库（≤2 次写）+ 写回进度与 `paused`，**成功后**才离开 |
 * | 返回上一页 / 点链接（路由卸载） | 卸载时批量落库 + `paused`（fire-and-forget） |
 * | 关标签 / 后退到站外（`pagehide`） | 同上，落库 + `paused` |
 * | 切后台 / 切标签页（`visibilitychange`） | 只落库，**不改状态**（可能马上回来） |
 * | 提交判分 | **先落库并 await，再调判分 RPC**（否则判分读不到作答） |
 *
 * ⚠️ **「离开」= 一定会被写成 `paused`**，这是 `statusLabel`「已暂停」能成立的前提：
 * 只要有一条离开路径漏了写状态，那条会话就永远停在「进行中」，记录页的标签就成了假话。
 *
 * ⚠️ **但「已交卷」的会话例外：一条 PATCH 都不许发。**
 * 判分成功后组件**不会卸载**，只是换成结果页 —— 于是「点提交 → 点查看练习记录」
 * 这条路上，卸载兜底照样会跑。如果它无条件写 `paused`，就会把判分 RPC 刚写好的
 * `completed` 覆盖回去，用户交完卷、记录页里那张卷子却还挂在「未完成」。
 * 见 `terminalRef` 与 `flushAll` 里的处理。
 */
export type RunnerQuestion = {
  /** 唯一键 = item id */
  key: string
  /** 全卷 / 全练习序号，1 开始 */
  globalNo: number
  /** 所属题组在题号导航里的下标 */
  groupIndex: number
  /** 题组标题（如「2020 · 阅读理解」「第 3 大题 · 阅读理解」） */
  groupTitle: string
  /** 是否翻译题：决定有没有「标记已完成 → 提交看参考译文」这条通路 */
  isTranslation: boolean
  /** 所属大题的题干上下文（原文 / 要求 / 图表） —— 答题时**必须**能看，见 QuestionStem */
  stem: ExamStem
  item: ExamItemWithOptions
}

/** 「离开时落库」的待写集合：同一题多次改动合并成一条，撤销则记为待删。 */
type PendingStore = {
  upserts: Map<string, PracticeAnswerDraft>
  deletes: Set<string>
}

const EMPTY_PENDING: PendingStore = { upserts: new Map(), deletes: new Set() }

/** 保存状态：驱动「退出时自动保存」这类提示，静默时什么都不显示。 */
type SaveState = 'idle' | 'saving' | 'error'

export function PracticeRunner({
  session,
  eyebrow,
  title,
  questions,
  groups,
  timeLimitSeconds,
  graded,
  onGraded,
  resultEyebrow = 'Result',
  resultTitle,
  resultActions,
  onExit,
}: {
  session: PracticeSession
  eyebrow: string
  title: string
  questions: RunnerQuestion[]
  groups: NavigatorGroup[]
  /** 限时（秒）。由调用方按题量折算，见 `deriveTimeLimitSeconds` */
  timeLimitSeconds: number
  graded: PracticeGradeResult[] | null
  onGraded: (results: PracticeGradeResult[]) => void
  resultEyebrow?: string
  resultTitle: string
  resultActions?: ReactNode
  /** 「时间到且一题未答」时的出口（会话会被置为 abandoned） */
  onExit: () => void
}) {
  const sessionId = session.id

  // ── 已保存作答（页面打开时读一次，之后不再随交互重取）──────────────
  const answersQuery = usePracticeAnswers(sessionId)
  const answerByItem = useMemo(() => {
    const map = new Map<string, { selectedOption: number | null; textAnswer: string }>()
    for (const answer of answersQuery.data ?? []) {
      map.set(answer.itemId, {
        selectedOption: answer.selectedOption,
        textAnswer: answer.textAnswer ?? '',
      })
    }
    return map
  }, [answersQuery.data])

  // ── 乐观态（点下去立刻有反馈，不等服务端回读）─────────────────
  const [pendingSelection, setPendingSelection] = useState<Record<string, number>>({})
  const [pendingMarks, setPendingMarks] = useState<Record<string, boolean>>({})
  const [draftText, setDraftText] = useState<Record<string, string>>({})

  // ── 待落库的差异（唯一会被写进数据库的东西）────────────────────
  const pendingRef = useRef<PendingStore>(EMPTY_PENDING)
  const [dirtyCount, setDirtyCount] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const saveStateRef = useRef<SaveState>('idle')
  const mountedRef = useRef(true)

  const syncDirty = useCallback(() => {
    setDirtyCount(
      pendingRef.current.upserts.size + pendingRef.current.deletes.size,
    )
  }, [])

  const setSave = useCallback((next: SaveState) => {
    saveStateRef.current = next
    if (mountedRef.current) setSaveState(next)
  }, [])

  /** 记一道题的作答改动（不联网）。 */
  const markAnswer = useCallback(
    (targetItemId: string, patch: Omit<PracticeAnswerDraft, 'itemId'>) => {
      const store = pendingRef.current
      store.deletes.delete(targetItemId)
      store.upserts.set(targetItemId, { itemId: targetItemId, ...patch })
      syncDirty()
    },
    [syncDirty],
  )

  /** 记一道题要撤销（真删行，不联网）。 */
  const markDeleted = useCallback(
    (targetItemId: string) => {
      const store = pendingRef.current
      store.upserts.delete(targetItemId)
      store.deletes.add(targetItemId)
      syncDirty()
    },
    [syncDirty],
  )

  const saveDraftsMutation = useSavePracticeAnswerDrafts()
  const saveDraftsAsync = saveDraftsMutation.mutateAsync

  /**
   * 把内存里的作答差异一次性落库（无改动时是空操作）。
   *
   * **只有成功才清空**，失败时保留差异，让「退出」可以重试 —— 否则一次网络抖动
   * 就把用户刚做的题静默丢掉。
   *
   * @returns 是否真的发出了写请求（用于决定要不要顺带写回进度，避免空请求）
   */
  const flushAnswers = useCallback(async (): Promise<boolean> => {
    const { upserts, deletes } = pendingRef.current
    if (upserts.size === 0 && deletes.size === 0) return false
    setSave('saving')
    try {
      await saveDraftsAsync({
        sessionId,
        upserts: [...upserts.values()],
        deletes: [...deletes],
      })
    } catch (error) {
      setSave('error')
      throw error
    }
    pendingRef.current = { upserts: new Map(), deletes: new Set() }
    if (mountedRef.current) setDirtyCount(0)
    setSave('idle')
    return true
  }, [saveDraftsAsync, sessionId, setSave])

  // ── 当前题（挂载时按会话进度定位，无需 effect 同步）─────────────
  const [index, setIndex] = useState(() => {
    if (questions.length === 0) return 0
    // 会话里的 current_item_no 一律是「本练习的全局题号」（1-based）
    return Math.min(Math.max(session.currentItemNo - 1, 0), questions.length - 1)
  })
  const current = questions[index]
  const itemId = current?.key
  const saved = itemId ? answerByItem.get(itemId) : undefined
  const draft = itemId ? draftText[itemId] : undefined
  const textValue = draft ?? saved?.textAnswer ?? ''
  const selectedOption =
    itemId && pendingSelection[itemId] !== undefined
      ? pendingSelection[itemId]
      : (saved?.selectedOption ?? null)

  const updateProgress = useUpdatePracticeSessionProgress()
  const updateProgressAsync = updateProgress.mutateAsync
  const updateProgressMutate = updateProgress.mutate
  const gradeMutation = useGradePracticeSection()
  const gradeMutate = gradeMutation.mutate

  // ── 离开时的统一出口 ────────────────────────────────────────
  /** 已经明确离开过一次（点了退出 / 时间到），卸载兜底不必再跑一遍。 */
  const leftRef = useRef(false)
  /** 卸载兜底要用的最新进度快照（**在 effect 里写**，不在 render 期写 ref）。 */
  const exitSnapshotRef = useRef({ currentNo: 1, seconds: 0 })
  /**
   * 会话是否已经「结束」（`completed` / `abandoned`）。
   *
   * ⚠️ 这个 ref 是本文件最容易漏的地方，别删。
   *
   * 判分成功后组件**不卸载**，只是 `if (graded)` 换成结果页 —— 所以
   * 「点提交并查看结果 → 点查看练习记录」这条路上，**卸载兜底照样会跑**。
   * 它若是无条件写 `paused`，就会把判分 RPC 刚写好的 `completed` 覆盖回去。
   * 实测复现过一次：同一条会话 `completed_at` 08:49:09.505、`paused_at`
   * 08:49:09.600（相差 0.1 秒），结果用户交完卷，那张卷子还挂在「未完成」里。
   *
   * 终态会话的静默重写没有任何意义，必须整条跳过。
   * 初值取会话自身状态 —— **重进一份已交卷的卷子看结果**时走的是同样的离开路径。
   */
  const terminalRef = useRef(
    session.status === 'completed' || session.status === 'abandoned',
  )

  /**
   * 落库作答 + 写回进度。
   *
   * 无改动且不是「退出」时**直接返回**：既避免在什么都没做的情况下打扰服务端，
   * 也让 StrictMode 的开发期二次挂载不会多出一条空 PATCH。
   *
   * 终态会话（见 `terminalRef`）**一条 PATCH 都不发**：既不写 `paused`，也不写
   * 进度 —— 卷子已经交完了，离开结果页不该在它身上留下任何痕迹。
   */
  const flushAll = useCallback(
    async (options: { paused: boolean; currentNo: number; seconds: number }) => {
      const wrote = await flushAnswers()
      const shouldPause = options.paused && !terminalRef.current
      if (!wrote && !shouldPause) return
      await updateProgressAsync({
        id: sessionId,
        patch: {
          currentItemNo: options.currentNo,
          elapsedSeconds: options.seconds,
          ...(shouldPause
            ? { status: 'paused' as const, pausedAt: new Date().toISOString() }
            : {}),
        },
        // 第二道防线：万一前端判漏（例如同一份会话在另一个标签页被交卷），
        // 数据库层也不允许把 completed / abandoned 改回 paused。
        guard: { notTerminal: true },
      })
    },
    [flushAnswers, sessionId, updateProgressAsync],
  )
  const flushAllRef = useRef(flushAll)
  useEffect(() => {
    flushAllRef.current = flushAll
  }, [flushAll])

  /**
   * 卸载兜底：**返回上一页 / 点别处链接 / 路由跳走**都走这里。
   * 用 fire-and-forget：清理函数不能是 async，请求也不依赖组件是否还挂着。
   *
   * ⚠️ 这里**要写 `paused`**（此前写的是 false，是个 bug）：用户既然已经离开答题页，
   * 这次练习就是「中途离开」，状态必须落成 paused。否则会话永远停在 active，
   * 记录页/首页给它贴「进行中」—— 标签看着就是错的（用户报障的根因之一）。
   * 唯一的例外是**已经结束**的会话（`terminalRef`）—— 那条路会在 `flushAll` 里整条跳过。
   *
   * ⚠️ **推迟一拍再判定**，而不是直接写：开发期 `<StrictMode>` 会「setup → cleanup →
   * setup」同步跑一轮，直接写会让**刚建好的会话瞬间变成已暂停**（实测复现）。
   * 下一拍若组件又挂上了（下面的 `clearTimeout`），说明用户还在/又回到了答题页，
   * 这次「离开」就是假的，直接取消 —— 比用「挂载时长 > N 毫秒」这类阈值更精确，
   * 也不依赖魔法数字。
   * （SPA 内跳转时定时器一定会跑；真的整页卸载走 `pagehide`，那条路径不经过这里。）
   */
  const leaveTimerRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(leaveTimerRef.current)
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (leftRef.current) return
      const { currentNo, seconds } = exitSnapshotRef.current
      leaveTimerRef.current = window.setTimeout(() => {
        void flushAllRef.current({ paused: true, currentNo, seconds }).catch(() => {
          // 卸载后没有任何提示位可挂，只能放弃这次兜底；用户下次进入会从服务端状态继续。
        })
      }, 0)
    }
  }, [])

  /**
   * 关标签 / 后退到站外 / 刷新 → `pagehide`：这是真的「离开」，同样落 paused。
   * 切后台 / 切标签页 → `visibilitychange`：只保存作答、**不改状态**，
   * 因为很可能马上回来（每次切标签都写一条 PATCH 是纯噪音）。
   */
  useEffect(() => {
    const flush = (paused: boolean) => {
      if (leftRef.current) return
      const { currentNo, seconds } = exitSnapshotRef.current
      void flushAllRef.current({ paused, currentNo, seconds }).catch(() => {})
    }
    const onPageHide = () => flush(true)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush(false)
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  // ── 提交判分（必须先落库，再判分）──────────────────────────────
  const submitNow = useCallback(() => {
    if (saveStateRef.current === 'saving') return
    void (async () => {
      try {
        await flushAnswers()
        // 把本次实际用时写回：作答期间不再有周期性写回，这里不写就只剩 0。
        await updateProgressAsync({
          id: sessionId,
          patch: { elapsedSeconds: exitSnapshotRef.current.seconds },
        })
      } catch {
        // 保存失败就不提交：判分 RPC 只认库里已有的行，
        // 硬提交会得到一份缺题的结果页，比「稍后重试」更难解释。
        return
      }
      gradeMutate(sessionId, {
        onSuccess: (rows) => {
          // 判分成功 = 这次练习已经结束（RPC 会把会话置 completed）。
          // 必须在离开页面**之前**打上终态标记，否则紧接着的卸载兜底
          // 会写一条 `paused` 把它覆盖掉（用户报障的根因）。
          terminalRef.current = true
          onGraded(rows)
        },
      })
    })()
  }, [flushAnswers, gradeMutate, onGraded, sessionId, updateProgressAsync])

  const [expiredEmpty, setExpiredEmpty] = useState(false)
  /** 「退出」正在批量落库中：置灰按钮，避免连点出两次写。 */
  const [exitPending, setExitPending] = useState(false)
  /** 移动端「答题卡」抽屉开关。 */
  const [sheetOpen, setSheetOpen] = useState(false)
  /**
   * 已展开题干的大题 id 集合。
   *
   * 按**大题**而不是按题记：一篇阅读的 5 道题共用同一段原文，
   * 展开一次就该一直可见，否则每题都要重新点开（等于没有题干）。
   */
  const [openStems, setOpenStems] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  )
  const toggleStem = useCallback((stemKey: string) => {
    setOpenStems((prev) => {
      const next = new Set(prev)
      if (next.has(stemKey)) next.delete(stemKey)
      else next.add(stemKey)
      return next
    })
  }, [])
  /** 边界反馈：在首/末题朝墙外滑动时闪现的一次性提示（null = 不显示）。 */
  const [boundaryHint, setBoundaryHint] = useState<string | null>(null)
  const boundaryTimerRef = useRef<number | undefined>(undefined)

  const flashBoundaryHint = useCallback((message: string) => {
    window.clearTimeout(boundaryTimerRef.current)
    setBoundaryHint(message)
    boundaryTimerRef.current = window.setTimeout(
      () => setBoundaryHint(null),
      1400,
    )
  }, [])
  // 卸载时清掉提示定时器，避免对已卸载组件 setState。
  useEffect(() => () => window.clearTimeout(boundaryTimerRef.current), [])
  /** 「已作答下标集合」只算一次，供已作答计数 / 桌面栏 / 移动抽屉共用（此前内联算三遍）。 */
  const answeredIndices = useMemo(
    () =>
      answeredIndicesOf(
        questions,
        answerByItem,
        pendingSelection,
        pendingMarks,
        draftText,
      ),
    [questions, answerByItem, pendingSelection, pendingMarks, draftText],
  )
  const answeredCount = answeredIndices.size

  // ── 计时（到点自动交卷）────────────────────────────────────
  const handleExpire = useCallback(() => {
    if (answeredCount === 0) {
      // 一题未答就没有可判的东西：置为 abandoned，别产出一个空结果页。
      setExpiredEmpty(true)
      leftRef.current = true
      terminalRef.current = true
      void updateProgressAsync({
        id: sessionId,
        patch: { status: 'abandoned', elapsedSeconds: timeLimitSeconds },
      }).catch(() => {})
      return
    }
    submitNow()
  }, [answeredCount, sessionId, submitNow, timeLimitSeconds, updateProgressAsync])

  const { elapsedSeconds, remainingSeconds } = usePracticeClock({
    initialElapsedSeconds: session.elapsedSeconds,
    timeLimitSeconds,
    running: !graded && !expiredEmpty,
    onExpire: handleExpire,
  })
  // 离开时要写回的进度快照。**只在这里（effect）写 ref**：render 期写 ref 会被
  // React Compiler 跳过优化，项目里已经踩过一次。
  useEffect(() => {
    exitSnapshotRef.current = { currentNo: index + 1, seconds: elapsedSeconds }
  }, [index, elapsedSeconds])

  // 把折算出的时限落库一次。
  // 需要落库的原因：drill 会话只存「题型 + 年份」，题量并不在会话里，
  // 事后无法反推限时，记录页也就显示不出「限时多久」。守卫保证只写一次。
  const timeLimitPersisted = session.timeLimitSeconds === timeLimitSeconds
  useEffect(() => {
    if (timeLimitPersisted) return
    updateProgressMutate({ id: sessionId, patch: { timeLimitSeconds } })
  }, [timeLimitPersisted, sessionId, timeLimitSeconds, updateProgressMutate])

  // ── 设置：答题时显示答案 ────────────────────────────────────
  // 规则（用户明确要求）：**只在该题是选择题、且用户已经选中某个选项之后**才揭示；
  // 翻译 / 写作这类主观题一律不揭示（没有「选项」这个概念，提前看参考译文等于送答案）。
  const [showAnswer, setShowAnswer] = useState(false)
  const [revealedByItem, setRevealedByItem] = useState<Record<string, RevealedItemAnswer>>({})
  const [revealErrors, setRevealErrors] = useState<Record<string, string>>({})

  const isChoice = current?.item.item_type === 'choice'
  const revealEnabled = showAnswer && isChoice && selectedOption !== null
  // 关掉开关立刻不再展示（展示条件里带 showAnswer，不需要额外清 state）
  const revealed = showAnswer && itemId ? (revealedByItem[itemId] ?? null) : null
  const revealError = itemId ? (revealErrors[itemId] ?? null) : null

  useEffect(() => {
    if (!revealEnabled || !itemId) return
    if (revealedByItem[itemId]) return
    let cancelled = false
    peekItemAnswer({ sessionId, itemId })
      .then((answer) => {
        if (!cancelled && answer) {
          setRevealedByItem((prev) => ({ ...prev, [itemId]: answer }))
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setRevealErrors((prev) => ({
          ...prev,
          [itemId]: error instanceof Error ? error.message : '答案暂时无法显示。',
        }))
      })
    return () => {
      cancelled = true
    }
  }, [revealEnabled, sessionId, itemId, revealedByItem])

  // ── 切题（只改内存，不写库）──────────────────────────────────
  /**
   * 入场方向：相邻切题（滑动 / 上一题 / 下一题 / 答题卡点相邻题）给 180ms
   * 整程滑行；跨多题跳转（桌面导航器远跳 / 首屏定位）直接换，大跳做整程滑行反而晃眼。
   */
  const [enterFrom, setEnterFrom] = useState<SwipeCardEnter>(null)
  const goTo = (next: number) => {
    if (questions.length === 0) return
    const target = Math.min(Math.max(next, 0), questions.length - 1)
    if (target === index) return
    setEnterFrom(
      Math.abs(target - index) === 1 ? (target > index ? 'right' : 'left') : null,
    )
    setIndex(target)
  }

  // ── 结果视图 ──────────────────────────────────────────────
  if (graded) {
    // 「我的作答」= 服务端快照 ∪ 本次未回读的本地草稿
    // （落库时刻意不触发重取，所以草稿可能还没进缓存）。
    const myTextAnswers: Record<string, string> = {}
    for (const [key, value] of answerByItem) {
      if (value.textAnswer) myTextAnswers[key] = value.textAnswer
    }
    for (const [key, value] of Object.entries(draftText)) {
      if (value) myTextAnswers[key] = value
    }
    // `item_no` 是「大题内序号」，跨大题连排会重复；结果页统一用「全局题号 · 所属大题」。
    const labels: Record<string, string> = {}
    for (const question of questions) {
      labels[question.key] = `第 ${question.globalNo} 题 · ${question.groupTitle}`
    }
    return (
      <main className={`${BROWSE_CONTAINER} py-10`}>
        <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
          {resultEyebrow}
        </p>
        <h1 className="mt-2 font-heading text-2xl leading-tight font-semibold md:text-[2rem]">
          {resultTitle}
        </h1>

        <div className="mt-6">
          <PracticeResult
            items={questions.map((question) => question.item)}
            results={graded}
            totalItemCount={questions.length}
            textAnswers={myTextAnswers}
            labels={labels}
          />
        </div>

        {resultActions ? (
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t pt-6">
            {resultActions}
          </div>
        ) : null}
      </main>
    )
  }

  if (expiredEmpty) {
    return (
      <main className={`${BROWSE_CONTAINER} py-16`}>
        <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
          Time is up
        </p>
        <h1 className="mt-2 font-heading text-2xl leading-tight font-semibold">
          时间到
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          本次没有作答任何题目，已结束这次练习。下次可以随时重新开始。
        </p>
        <div className="mt-6">
          <Button type="button" size="md" className="h-11 md:h-10" onClick={onExit}>
            返回
          </Button>
        </div>
      </main>
    )
  }

  if (saveState === 'saving' || gradeMutation.isPending) {
    return <RunnerFullScreen text={gradeMutation.isPending ? '正在判分…' : '正在保存…'} />
  }

  if (!current) {
    return <RunnerFullScreen text="这次练习还没有可作答的题目。" />
  }

  const isTranslation = current.isTranslation
  const isMarked =
    pendingMarks[current.key] ??
    (saved !== undefined && saved.selectedOption === null && saved.textAnswer === '')

  /** 选中选项：只改内存（用户明确要求这里不要发请求）。 */
  const choose = (optionIndex: number) => {
    setPendingSelection((prev) => ({ ...prev, [current.key]: optionIndex }))
    markAnswer(current.key, { selectedOption: optionIndex })
  }

  const handleTextChange = (value: string) => {
    setDraftText((prev) => ({ ...prev, [current.key]: value }))
    markAnswer(current.key, { textAnswer: value })
  }

  const toggleMark = () => {
    const next = !isMarked
    setPendingMarks((prev) => ({ ...prev, [current.key]: next }))
    // 标记 = 一条（可能为空的）文本作答行 —— 这是提交后拿到参考译文的唯一通路
    // （参考译文只在 `grade_practice_section` 的下发范围里，而它的范围是「实际作答过的题」）。
    // 撤销 = **真删**这一行：只把文本置空是不够的，行还在就仍会被判分 RPC 收进结果里，
    // 「可撤销」就成了假的（见 practice.ts deletePracticeAnswer 的注释）。
    if (next) {
      markAnswer(current.key, { textAnswer: textValue })
    } else {
      markDeleted(current.key)
    }
  }

  const isFirst = index === 0
  const isLast = index === questions.length - 1

  const pauseAndExit = () => {
    if (exitPending) return
    setExitPending(true)
    void (async () => {
      try {
        await flushAll({ paused: true, currentNo: index + 1, seconds: elapsedSeconds })
      } catch {
        // 保存失败就留在页面：差异还在内存里，用户可以再点一次退出重试。
        setExitPending(false)
        return
      }
      leftRef.current = true
      onExit()
    })()
  }

  // 保存中会整体让位给「正在保存…」全屏（见上面的提前 return），所以这里只剩两种状态。
  const saveHint =
    saveState === 'error'
      ? '保存失败，请重试'
      : dirtyCount > 0
        ? '退出时自动保存'
        : null

  return (
    <main className={`${BROWSE_CONTAINER} py-8 pb-32 md:pb-10`}>
      {/* 顶部：进度 + 计时 + 设置 + 退出 */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
            {eyebrow} · Question {index + 1} of {questions.length}
          </p>
          <h1 className="mt-1 truncate font-heading text-[22px] leading-snug font-semibold">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <TimerChip remainingSeconds={remainingSeconds} />
          <PracticeSettings
            showAnswerImmediately={showAnswer}
            onToggleShowAnswer={setShowAnswer}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 px-3 md:h-8"
            onClick={pauseAndExit}
            disabled={exitPending}
          >
            {exitPending ? '保存中…' : '退出'}
          </Button>
        </div>
      </header>

      <div className="mt-6 flex gap-8">
        {/* reducedMotion="user"：系统开「减弱动效」时动画直接跳终态，手势保留 */}
        <MotionConfig reducedMotion="user">
          <LazyMotion features={domMax}>
          {/* overflow-x-clip：切题滑行时卡住横向溢出，不出水平滚动条 */}
          <div className="relative min-w-0 flex-1 overflow-x-clip">
            {/* custom=入场侧方向：AnimatePresence 会把它喂给进出场双方的 variants，
                退场中的旧卡随之重新求值 exit —— 方向绝不能存在卡片自己的 state 里 */}
            <AnimatePresence initial={false} mode="popLayout" custom={enterFrom}>
              <SwipeQuestionCard
                key={index}
                enterFrom={enterFrom}
                canSwipeNext={index < questions.length - 1}
                canSwipePrev={index > 0}
                onCommit={(direction) =>
                  goTo(direction === 'left' ? index + 1 : index - 1)
                }
                onBoundaryHit={(direction) =>
                  flashBoundaryHint(
                    direction === 'left' ? '已是最后一题' : '已是第一题',
                  )
                }
              >
                <Card>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-baseline justify-between gap-3 border-b pb-3">
                      <span className="text-sm font-semibold text-foreground">
                        第 {current.globalNo} 题
                        <span className="ml-2 font-normal text-muted-foreground">
                          （{current.groupTitle} 第 {current.item.item_no} 小题）
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          已作答 {answeredCount}/{questions.length}
                        </span>
                        {saveHint ? (
                          <span
                            className={
                              saveState === 'error'
                                ? 'block text-xs text-destructive'
                                : 'block text-xs text-muted-foreground'
                            }
                            role={saveState === 'error' ? 'alert' : undefined}
                          >
                            {saveHint}
                          </span>
                        ) : null}
                      </span>
                    </div>

                    {/* 大题题干：原文 / 题目要求 / 图表。默认收起，展开状态按大题记住。 */}
                    <QuestionStem
                      stem={current.stem}
                      open={openStems.has(current.stem.key)}
                      onToggle={() => toggleStem(current.stem.key)}
                      itemContent={current.item.content}
                    />

                    <PracticeQuestion
                      item={current.item}
                      selectedOption={selectedOption}
                      onSelect={choose}
                      isTextAnswered={isTranslation ? isMarked : undefined}
                      onToggleTextAnswer={isTranslation ? toggleMark : undefined}
                      textAnswer={textValue}
                      onTextAnswerChange={handleTextChange}
                      textPlaceholder={isTranslation ? '在此输入你的译文…' : '在此写作…'}
                      revealed={
                        revealed
                          ? {
                              correctOption: revealed.correctOption,
                              explanation: revealed.explanation,
                              referenceTranslation: revealed.referenceTranslation,
                            }
                          : undefined
                      }
                    />

                    {showAnswer && isChoice && selectedOption === null ? (
                      <p className="text-xs text-muted-foreground">
                        选中一个选项后，这里会显示这道题的答案。
                      </p>
                    ) : null}

                    {revealError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {revealError}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                {/* 提交区（内容流内）：桌面在此提交；移动端提交收进「答题卡」抽屉底部，避免两处提交 */}
                <div className="mt-6 hidden border-t pt-6 md:block">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      size="md"
                      className="h-11 w-full md:h-10 md:w-auto"
                      onClick={submitNow}
                      disabled={answeredCount === 0}
                    >
                      提交并查看结果
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {answeredCount === 0
                        ? '至少作答一题才能提交。'
                        : `已作答 ${answeredCount} 题，未作答的题不参与判分；提交时自动保存，时间到会自动交卷。`}
                    </p>
                  </div>
                  {gradeMutation.isError ? (
                    <p className="mt-3 text-sm text-destructive" role="alert">
                      提交失败，请稍后重试。
                    </p>
                  ) : null}
                </div>
              </SwipeQuestionCard>
            </AnimatePresence>
          </div>
          </LazyMotion>
        </MotionConfig>

        {/* 桌面：题号导航在右侧 sticky */}
        <aside className="hidden w-[300px] shrink-0 md:block">
          <div className="sticky top-20">
            <Card>
              <CardContent>
                <QuestionNavigator
                  groups={groups}
                  currentIndex={index}
                  answeredIndices={answeredIndices}
                  onSelect={goTo}
                />
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      {/* 边界反馈提示：常驻 aria-live 区域（滑动只存在于移动端，桌面直接隐藏）。 */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-16 z-20 flex justify-center md:hidden"
      >
        {boundaryHint ? (
          <span className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-full border border-border bg-popover px-3 py-1 text-xs text-popover-foreground shadow-sm duration-150">
            {boundaryHint}
          </span>
        ) : null}
      </div>

      {/* 移动端 sticky 操作条 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card px-5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 flex-1 px-4"
            onClick={() => goTo(index - 1)}
            disabled={isFirst}
          >
            上一题
          </Button>
          {/* 中间：打开「答题卡」抽屉（考试类 App 的标配入口，拇指可及） */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 shrink-0 gap-1.5 px-4"
            onClick={() => setSheetOpen(true)}
            aria-label="打开答题卡"
          >
            <Icon icon={LayoutGrid} size={16} />
            答题卡
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-11 flex-1 px-4"
            onClick={() => goTo(index + 1)}
            disabled={isLast}
          >
            下一题
          </Button>
        </div>
      </div>

      {/* 移动端「答题卡」底部抽屉（design-system §8.14） */}
      <AnswerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        groups={groups}
        currentIndex={index}
        answeredIndices={answeredIndices}
        onSelect={goTo}
        onSubmit={submitNow}
        answeredCount={answeredCount}
        total={questions.length}
      />
    </main>
  )
}

/**
 * 「哪些题算已作答」：服务端已有行 ∪ 本地乐观态。
 *
 * 抽成纯函数是因为它被用在三处（已作答计数、移动端题号条、桌面题号栏），
 * 内联三遍迟早会有一处忘记把新的乐观态算进去。
 */
function answeredIndicesOf(
  questions: RunnerQuestion[],
  answerByItem: Map<string, { selectedOption: number | null; textAnswer: string }>,
  pendingSelection: Record<string, number>,
  pendingMarks: Record<string, boolean>,
  draftText: Record<string, string>,
): Set<number> {
  const isAnswered = (itemId: string): boolean => {
    if (pendingMarks[itemId] === true) return true
    if (pendingSelection[itemId] !== undefined) return true
    if (draftText[itemId] !== undefined) return true
    // 撤销标记后那一行会被（或已被）删掉，在回读之前先判为「未作答」
    if (pendingMarks[itemId] === false) return false
    return answerByItem.has(itemId)
  }
  const set = new Set<number>()
  questions.forEach((question, index) => {
    if (isAnswered(question.key)) set.add(index)
  })
  return set
}

function RunnerFullScreen({ text }: { text: string }) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl items-center justify-center px-5 py-16 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </main>
  )
}
