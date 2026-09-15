import { Link, useParams } from 'react-router-dom'
import { ExamSection } from '@/components/exams/ExamSection'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useExamPaper } from '@/hooks/use-exam-paper'
import { toExamErrorMessage } from '@/services/exams'

/** 只接受标准 UUID，避免把 `/exams/abc` 这类地址发成无效的数据库查询。 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  )
}

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
          返回历年真题
        </Link>
      </div>
    </main>
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
      <main className="mx-auto w-full max-w-3xl px-5 py-12">
        <BackLink to="/exams">← 历年真题</BackLink>
        <div className="mt-6 flex flex-col gap-4" aria-hidden="true">
          <div className="h-9 w-2/3 animate-pulse rounded-lg bg-muted" />
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-xl bg-muted"
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

  const itemCount = data.sections.reduce(
    (total, section) => total + section.items.length,
    0,
  )

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12">
      <BackLink to="/exams">← 历年真题</BackLink>

      <header className="mt-4">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {data.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          共 {data.sections.length} 大题 · {itemCount} 小题
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          本页只展示题目；答案与解析不在本页显示。
        </p>
      </header>

      {data.sections.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="text-sm text-muted-foreground">
            这套试卷还没有录入大题。
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          {data.sections.map((section, index) => (
            <ExamSection key={section.id} section={section} index={index} />
          ))}
        </div>
      )}
    </main>
  )
}
