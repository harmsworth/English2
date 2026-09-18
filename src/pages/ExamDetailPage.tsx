import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ExamSection } from '@/components/exams/ExamSection'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BROWSE_CONTAINER } from '@/components/layout/app-shell'
import { useExamPaper } from '@/hooks/use-exam-paper'
import { toExamErrorMessage } from '@/services/exams'
import { sumBy } from '@/lib/number'
import { cn } from '@/lib/utils'

/** 只接受标准 UUID，避免把 `/exams/abc` 这类地址发成无效的数据库查询。 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function CenteredState({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center px-5 py-16">
      {eyebrow ? (
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="mt-4 text-base leading-8 text-muted-foreground">
        {description}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {action ? (
          <Button type="button" variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
        <Link
          to="/exams"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          返回题库
        </Link>
      </div>
    </main>
  )
}

/**
 * 页面级返回入口（回到 `/exams` 题库列表）。
 *
 * 顶栏里虽然有「题库」，但那是**全局导航**；详情页是深层页，用户从列表点进来后
 * 视线停在页面顶部，需要一个就地可点的「回到上一级」入口 —— 否则只能去顶栏绕一圈，
 * 移动端还得先认出底部标签栏里的「题库」。
 *
 * 刻意用**文字链接**而非按钮：本页的主操作只有一个（「开始整卷练习」），
 * 再放一个实心按钮会和它争视觉权重；返回属于辅助动作。
 * 目标地址刻意写死 `/exams` 而不是 `navigate(-1)`：直接访问 / 刷新本页时
 * 历史里可能没有上一页，写死才能保证「返回」永远有落点（`/exams` 默认就是整卷分栏）。
 */
function BackLink() {
  return (
    <Link
      to="/exams"
      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
      返回题库
    </Link>
  )
}

/**
 * 试卷详情：把一张试卷按大题顺序铺开。
 *
 * 路由参数是试卷 id（不是年份），这样将来多版本共存也不需要改路由。
 * 本页只展示题目，**不展示任何答案 / 解析 / 正确选项**。
 */
export default function ExamDetailPage() {
  const { paperId } = useParams<{ paperId: string }>()
  const isValidId = Boolean(paperId) && UUID_PATTERN.test(paperId ?? '')

  const { data, isPending, isError, error, refetch } = useExamPaper(
    isValidId ? paperId : undefined,
  )

  if (!isValidId) {
    return (
      <CenteredState
        eyebrow="404"
        title="试卷不存在"
        description="这个地址没有对应的试卷，回列表重新选择一套吧。"
      />
    )
  }

  if (isPending) {
    return (
      <main className={`${BROWSE_CONTAINER} py-12`}>
        <BackLink />
        {/* 静态骨架，不做闪烁（design-direction「安静」原则） */}
        <div className="mt-6 flex flex-col gap-4" aria-hidden="true">
          <div className="h-9 w-2/3 rounded-lg border border-border bg-card" />
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-40 rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      </main>
    )
  }

  if (isError) {
    return (
      <CenteredState
        eyebrow="出错了"
        title="试卷加载失败"
        // 底层错误结构只在 service 层解读，页面只负责展示这句话。
        description={toExamErrorMessage(error)}
        action={{
          label: '重新加载',
          onClick: () => {
            void refetch()
          },
        }}
      />
    )
  }

  if (data === null) {
    return (
      <CenteredState
        eyebrow="404"
        title="试卷不存在"
        description="这套试卷可能已被更新或下线，回列表看看其他年份。"
      />
    )
  }

  const itemCount = sumBy(data.sections, (section) => section.items.length)

  return (
    <main className={`${BROWSE_CONTAINER} py-12 md:py-16`}>
      <BackLink />
      <p className="mt-6 text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
        {data.year} · Examination
      </p>
      <h1 className="mt-3 font-heading text-2xl leading-tight font-semibold md:text-[2.5rem]">
        {data.title}
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{data.sections.length} 大题</Badge>
          <Badge variant="primary">{itemCount} 小题</Badge>
        </div>
        {/*
          整卷练习入口收敛到这里一个：之前每个大题下面都挂「开始练习」，
          既重复又误导（点进去其实只能练那一个大题）。整卷页里可按大题跳。
        */}
        <Link
          to={`/exams/${paperId}/practice`}
          className={cn(
            buttonVariants({ variant: 'default', size: 'md' }),
            'h-11 w-full px-5 sm:w-auto md:h-10'
          )}
        >
          开始整卷练习
        </Link>
      </div>

      {/* 桌面 2:1 分栏（≈840 : 400）；移动侧栏下移为整宽卡片（§9 规则 #3） */}
      <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <h2 className="font-heading text-[19px] font-semibold">
            Examination Sections
          </h2>

          {data.sections.length === 0 ? (
            <Card>
              <CardContent className="text-sm text-muted-foreground">
                这套试卷还没有录入大题。
              </CardContent>
            </Card>
          ) : (
            data.sections.map((section, index) => (
              <ExamSection key={section.id} section={section} index={index} />
            ))
          )}
        </div>

        <aside className="shrink-0 lg:w-[400px]">
          <Card>
            <CardHeader>
              <CardDescription>How it works</CardDescription>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
              <p>
                本页按大题顺序铺开全卷，可先通读，再点上方「开始整卷练习」一次练完 9 个大题。
              </p>
              <p>
                练习时可随时在题号列表跳题、看用时；主观题（翻译 / 写作）直接在页面里写，输入会自动保存。
              </p>
              <p>
                整卷提交后由服务端统一判分，判分后才会下发正确答案与解析；答错的客观题会自动收进错题本。
              </p>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">题目页不含答案</p>
              <p>
                答案与解析不在本页显示 —— 这是刻意的：唯一的答案出口是提交后的判分结果。
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}
