import Link from "next/link";
import { auth } from "@/lib/auth";
import { Heart, Shield, Users, MessageSquare, BarChart3, ArrowRight } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">CoParent</span>
            </div>
            <div className="flex items-center gap-3">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full mb-6">
                <Heart className="w-4 h-4" />
                Supporting families through transition
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
                Co-parenting
                <span className="block text-emerald-600">made peaceful</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed">
                A compassionate platform helping separated parents coordinate schedules, communicate respectfully, and prioritize what matters most — their children&apos;s wellbeing.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {session?.user ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white text-base font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white text-base font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                    >
                      Start Free
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 text-base font-semibold rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>

              {/* Trust indicators */}
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Secure & Private
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  Mediator-supported
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  AI-moderated chat
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] bg-gradient-to-br from-emerald-100 via-blue-50 to-indigo-100">
                {/* Decorative illustration representing co-parenting reconciliation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    viewBox="0 0 600 450"
                    className="w-full h-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Background decor */}
                    <circle cx="480" cy="80" r="120" fill="#d1fae5" opacity="0.6" />
                    <circle cx="100" cy="380" r="100" fill="#dbeafe" opacity="0.5" />
                    <circle cx="520" cy="350" r="80" fill="#e0e7ff" opacity="0.5" />

                    {/* Tree / nature */}
                    <g transform="translate(80, 80)">
                      <rect x="18" y="40" width="8" height="60" rx="4" fill="#92400e" />
                      <circle cx="22" cy="30" r="35" fill="#10b981" opacity="0.8" />
                      <circle cx="5" cy="45" r="25" fill="#059669" opacity="0.7" />
                      <circle cx="40" cy="42" r="22" fill="#047857" opacity="0.6" />
                    </g>

                    {/* Parent A (left) */}
                    <g transform="translate(140, 100)">
                      <ellipse cx="40" cy="120" rx="45" ry="55" fill="#3b82f6" opacity="0.15" />
                      {/* Head */}
                      <circle cx="40" cy="30" r="22" fill="#fbbf24" />
                      {/* Hair */}
                      <ellipse cx="40" cy="16" rx="24" ry="12" fill="#78350f" />
                      {/* Body */}
                      <rect x="22" y="52" width="36" height="50" rx="12" fill="#3b82f6" />
                      {/* Arms open in welcoming gesture */}
                      <path d="M22 65 Q5 55 10 75" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" fill="none" />
                      <path d="M58 65 Q75 55 70 75" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" fill="none" />
                      {/* Smile */}
                      <path d="M30 35 Q40 44 50 35" stroke="#78350f" strokeWidth="2" fill="none" />
                      {/* Eyes */}
                      <circle cx="31" cy="28" r="2.5" fill="#78350f" />
                      <circle cx="49" cy="28" r="2.5" fill="#78350f" />
                    </g>

                    {/* Parent B (right) */}
                    <g transform="translate(350, 100)">
                      <ellipse cx="40" cy="120" rx="45" ry="55" fill="#8b5cf6" opacity="0.15" />
                      {/* Head */}
                      <circle cx="40" cy="30" r="22" fill="#fbbf24" />
                      {/* Hair */}
                      <ellipse cx="40" cy="18" rx="24" ry="10" fill="#1e293b" />
                      {/* Body */}
                      <rect x="22" y="52" width="36" height="50" rx="12" fill="#8b5cf6" />
                      {/* Arms open */}
                      <path d="M22 65 Q5 55 10 75" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" fill="none" />
                      <path d="M58 65 Q75 55 70 75" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" fill="none" />
                      {/* Smile */}
                      <path d="M30 35 Q40 44 50 35" stroke="#1e293b" strokeWidth="2" fill="none" />
                      {/* Eyes */}
                      <circle cx="31" cy="28" r="2.5" fill="#1e293b" />
                      <circle cx="49" cy="28" r="2.5" fill="#1e293b" />
                    </g>

                    {/* Child (center, between parents) */}
                    <g transform="translate(240, 160)">
                      <ellipse cx="35" cy="90" rx="35" ry="40" fill="#f59e0b" opacity="0.12" />
                      {/* Head */}
                      <circle cx="35" cy="25" r="18" fill="#fed7aa" />
                      {/* Curly hair */}
                      <circle cx="25" cy="14" r="8" fill="#1e293b" />
                      <circle cx="35" cy="10" r="9" fill="#1e293b" />
                      <circle cx="45" cy="14" r="8" fill="#1e293b" />
                      {/* Body */}
                      <rect x="20" y="43" width="30" height="35" rx="10" fill="#f59e0b" />
                      {/* Arms reaching up to both parents */}
                      <path d="M20 55 Q5 48 10 60" stroke="#fed7aa" strokeWidth="6" strokeLinecap="round" fill="none" />
                      <path d="M50 55 Q65 48 60 60" stroke="#fed7aa" strokeWidth="6" strokeLinecap="round" fill="none" />
                      {/* Big smile */}
                      <path d="M27 30 Q35 38 43 30" stroke="#92400e" strokeWidth="2" fill="none" />
                      {/* Eyes */}
                      <circle cx="28" cy="24" r="2.5" fill="#92400e" />
                      <circle cx="42" cy="24" r="2.5" fill="#92400e" />
                    </g>

                    {/* Heart connecting them all */}
                    <g transform="translate(265, 260)">
                      <path
                        d="M15 8C15 4 19 0 23 0C27 0 30 3 30 6C30 3 33 0 37 0C41 0 45 4 45 8C45 15 30 25 30 25C30 25 15 15 15 8Z"
                        fill="#ef4444"
                        opacity="0.85"
                      />
                    </g>

                    {/* Subtle connection lines between parents */}
                    <path
                      d="M200 210 Q300 180 400 210"
                      stroke="#10b981"
                      strokeWidth="2"
                      fill="none"
                      opacity="0.3"
                      strokeDasharray="6,4"
                    />

                    {/* Small hearts floating */}
                    <g transform="translate(160, 270)">
                      <path
                        d="M4 2C4 1 5 0 6.5 0C8 0 9 1 9 2.5C9 4 6 7 6.5 7C7 7 4 4 4 2Z"
                        fill="#f43f5e"
                        opacity="0.5"
                      />
                    </g>
                    <g transform="translate(410, 280)">
                      <path
                        d="M3 1.5C3 0.5 4 0 5 0C6 0 7 1 7 2C7 3 5 5.5 5 6C5 5.5 3 3 3 1.5Z"
                        fill="#f43f5e"
                        opacity="0.4"
                      />
                    </g>
                  </svg>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-emerald-100 rounded-2xl -z-10" />
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-100 rounded-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything you need to co-parent peacefully
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Our platform provides the tools and support to help separated families thrive.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: MessageSquare,
                title: "Safe Communication",
                description:
                  "AI-moderated messaging that flags conflict and promotes respectful dialogue between parents.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: BarChart3,
                title: "Smart Assessments",
                description:
                  "Comprehensive questionnaires that identify strengths and areas for growth in co-parenting.",
                color: "bg-emerald-50 text-emerald-600",
              },
              {
                icon: Users,
                title: "Mediator Support",
                description:
                  "Professional mediators can monitor cases, provide guidance, and help resolve disputes.",
                color: "bg-violet-50 text-violet-600",
              },
              {
                icon: Shield,
                title: "Child-First Approach",
                description:
                  "Every feature is designed to prioritize children's emotional wellbeing and stability.",
                color: "bg-amber-50 text-amber-600",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${feature.color} flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!session?.user && (
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Ready to create a healthier co-parenting dynamic?
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
              Join families who are building better communication and brighter futures for their children.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white text-base font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-500">CoParent &mdash; Building bridges for families</span>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} CoParent. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
