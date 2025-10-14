import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back! 👶
          </h1>
          <p className="text-gray-600">
            Sign in to continue tracking your baby&apos;s precious moments
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              card: "shadow-xl border-0",
              headerTitle: "text-xl font-semibold text-gray-900",
              headerSubtitle: "text-gray-600",
            }
          }}
        />
      </div>
    </div>
  )
}