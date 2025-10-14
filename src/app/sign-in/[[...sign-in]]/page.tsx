import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome Back! 👶
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            Sign in to continue tracking your baby&apos;s precious moments
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              card: "shadow-xl border-0 w-full",
              headerTitle: "text-lg sm:text-xl font-semibold text-gray-900",
              headerSubtitle: "text-sm sm:text-base text-gray-600",
              formButtonPrimary: "min-h-[44px] text-base",
              formFieldInput: "min-h-[44px] text-base",
            }
          }}
        />
      </div>
    </div>
  )
}