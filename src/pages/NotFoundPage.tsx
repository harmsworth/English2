import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center px-5 py-16">
      <p className="text-sm font-medium tracking-wide text-muted-foreground">
        404
      </p>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        页面不存在
      </h1>

      <p className="mt-4 text-base leading-8 text-muted-foreground">
        这个地址没有对应的内容，回首页继续学习吧。
      </p>

      <Link
        to="/"
        className="mt-8 w-fit text-sm font-medium text-primary underline underline-offset-4"
      >
        返回首页
      </Link>
    </main>
  )
}
