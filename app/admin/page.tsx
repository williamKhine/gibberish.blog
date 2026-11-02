import { ProtectedPage as AuthGate } from "@/components/protected-page"
import { Admin } from "@/components/admin"
export default function Page() {
  return (
    <AuthGate admin>
      <Admin />
    </AuthGate>
  )
}
