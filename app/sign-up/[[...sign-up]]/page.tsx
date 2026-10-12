import { SignUp } from "@clerk/nextjs"
import { configured } from "@/lib/config"
import { PreviewGate } from "@/components/auth-gate"
export default function Page() {
  return configured ? (
    <div className="inner-page flex justify-center">
      <SignUp />
    </div>
  ) : (
    <PreviewGate />
  )
}
