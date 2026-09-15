import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center px-5 py-16">
      <p className="text-sm font-medium tracking-wide text-muted-foreground">
        考研英语二 · 真题学习
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        英语真题
      </h1>

      <p className="mt-4 text-lg leading-8 text-muted-foreground">
        每天进步一点。
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button type="button">开始学习</Button>
        <Button type="button" variant="outline">
          查看历年真题
        </Button>
      </div>

      <p className="mt-12 text-sm text-muted-foreground">项目初始化成功。</p>
    </main>
  )
}
