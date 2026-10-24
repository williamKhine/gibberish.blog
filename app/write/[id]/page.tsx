import { ProtectedPage as AuthGate } from "@/components/protected-page"
import { Writer } from "@/components/editor"
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <AuthGate>
      <Writer id={(await params).id} />
    </AuthGate>
  )
}
