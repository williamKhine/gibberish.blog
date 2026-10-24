import { ProtectedPage as AuthGate } from "@/components/protected-page"
import { Dashboard } from "@/components/dashboard"
export default function Page() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  )
}
