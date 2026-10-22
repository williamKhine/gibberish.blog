import { Feed } from "@/components/feed"
export default async function Page({
  params,
}: {
  params: Promise<{ tag: string }>
}) {
  const { tag } = await params
  return (
    <div className="page-width inner-page">
      <span className="eyebrow">A SHARED LITTLE OBSESSION</span>
      <h1>#{tag}</h1>
      <p className="intro">Different brains. Same rabbit hole.</p>
      <Feed tag={tag} />
    </div>
  )
}
