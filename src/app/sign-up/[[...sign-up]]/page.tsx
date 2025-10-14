import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join Our Family! 🌟
          </h1>
          <p className="text-gray-600">
            Start capturing your baby&apos;s beautiful journey together
          </p>
        </div>
        <SignUp 
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