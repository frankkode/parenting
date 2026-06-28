import Link from "next/link";
import { auth } from "@/lib/auth";
import { Heart, Shield, Users, MessageSquare, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <img
                src="/logob.png"
                alt="CoParent Logo"
                className="w-9 h-9 rounded-xl object-contain shadow-sm shadow-emerald-200"
              />
              <span className="font-bold text-xl text-gray-900 tracking-tight">CoParent</span>
            </div>
            <div className="flex items-center gap-3">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200"
                >
                  Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200"
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
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/30 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50/80 text-emerald-700 text-sm font-semibold rounded-full border border-emerald-100 mb-8">
                <Heart className="w-4 h-4" />
                Supporting families through transition
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.08] tracking-tight">
                Co-parenting
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                  made peaceful
                </span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-lg">
                A compassionate platform helping separated parents coordinate schedules, communicate respectfully, and prioritize what matters most — their children&apos;s wellbeing.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {session?.user ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-emerald-600 text-white text-base font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-200/50"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-emerald-600 text-white text-base font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-200/50"
                    >
                      Start Free
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-gray-700 text-base font-semibold rounded-xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>

              {/* Trust indicators */}
              <div className="mt-10 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  Secure & Private
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  Mediator-supported
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  AI-moderated chat
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-300/50 aspect-[4/3]">
                <img
                  src="/shelby-bauman-PmrPOHq4WqQ-unsplash.jpg"
                  alt="Happy family spending quality time together"
                  className="w-full h-full object-cover"
                />
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/10 via-transparent to-transparent" />
              </div>
              {/* Decorative blobs behind image */}
              <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-emerald-100/80 rounded-2xl -z-10" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-teal-100/60 rounded-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Secondary image section */}
      <section className="py-16 lg:py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image */}
            <div className="relative order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-xl shadow-gray-200/70 aspect-[16/9]">
                <img
                  src="/thomas-dumortier-15pdFxjIfuw-unsplash.jpg"
                  alt="Peaceful co-parenting environment"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-bl from-gray-900/5 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-100/70 rounded-2xl -z-10" />
              <div className="absolute -top-6 -left-6 w-20 h-20 bg-blue-100/70 rounded-2xl -z-10" />
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2 max-w-lg">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
                Built for families,
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                  guided by experts
                </span>
              </h2>
              <p className="mt-5 text-lg text-gray-600 leading-relaxed">
                Our platform is designed with input from family mediators and child psychologists to ensure every interaction supports healthy co-parenting.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "AI-powered conflict detection in messages",
                  "Comprehensive co-parenting assessments",
                  "Professional mediator oversight",
                  "Secure digital agreement signing",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
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
                  "Every feature is designed to prioritize children&apos;s emotional wellbeing and stability.",
                color: "bg-amber-50 text-amber-600",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all group"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-6 h-6" />
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
        <section className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Ready to create a healthier co-parenting dynamic?
            </h2>
            <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
              Join families who are building better communication and brighter futures for their children.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white text-base font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-200/50"
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
              <img
                src="/logob.png"
                alt="CoParent Logo"
                className="w-7 h-7 rounded-lg object-contain"
              />
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
