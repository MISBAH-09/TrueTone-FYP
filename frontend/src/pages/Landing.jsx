import { Link } from "react-router-dom";
import { Shield, ArrowRight, ScanFace, FlaskConical, Sparkles, TrendingUp } from "lucide-react";
import TrueToneLogo from "../components/TrueToneLogo";
import heroImage from "../assets/hero-image.jpg";
import { motion } from "framer-motion";

const features = [
  {
    title: "AI Skin Analysis",
    description: "Upload a photo and our CNN-powered engine detects your skin type, tone, and conditions instantly.",
    icon: <ScanFace className="w-5 h-5" />,
  },
  {
    title: "Product Scanner",
    description: "Scan product labels with OCR to extract ingredients and flag harmful chemicals for your skin.",
    icon: <FlaskConical className="w-5 h-5" />,
  },
  {
    title: "Smart Recommendations",
    description: "Get personalized product suggestions tailored to your unique skin profile and concerns.",
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    title: "Track Progress",
    description: "Monitor your skin health journey over time with visual analytics and improvement insights.",
    icon: <TrendingUp className="w-5 h-5" />,
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between py-4 px-6">
          <TrueToneLogo />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          </div>
          <div className="flex items-center gap-3">
          <Link to="/auth">
            <button className="text-sm text-gray-500 hover:text-gray-700">
              Sign In
            </button>
          </Link>

          <Link to="/auth?signup=true" className="">
            <button className="text-sm px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl">
              Get Started
            </button>
          </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* <div className="inline-flex items-center gap-2 bg-accent rounded-full px-4 py-1.5 text-sm text-accent-foreground mb-6">
                <Shield className="w-4 h-4" />
                <span>AI-Powered Skincare Safety</span>
              </div> */}
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                Your Skin,{" "}
                <span className="text-gradient">Understood</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
                TrueTone analyzes your skin, scans product ingredients, and recommends
                safe, personalized skincare — all powered by advanced AI.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth?signup=true" className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/30 hover:bg-emerald-700 transition">
                    Start Free Analysis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <a href="#features" className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
                    Learn More
                  </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl shadow-primary/10">
                <img
                  src={heroImage}
                  alt="TrueTone Smart Skin Analysis"
                  className="w-full h-auto object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
        {/* <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700 mb-6">
                <Shield className="w-4 h-4" />
                AI-Powered Skincare Safety
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl md:text-6xl leading-tight">
                Your Skin,
                <span className="block text-emerald-800">Understood</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                TrueTone analyzes your skin, scans product ingredients, and recommends safe, personalized skincare — all powered by advanced AI.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/auth?signup=true" className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/30 hover:bg-emerald-700 transition">
                  Start Free Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a href="#features" className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
                  Learn More
                </a>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl shadow-primary/10">
                <img
                  src={heroImage}
                  alt="TrueTone Smart Skin Analysis"
                  className="w-full h-auto object-cover"
                />
              </div>
            </motion.div>
          </div>
        </section> */}

        <section id="features" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-emerald-700">Features</p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">Everything Your Skin Needs</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Comprehensive AI-driven tools to analyze, protect, and improve your skin health.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-[28px] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-sm">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-emerald-700">How TrueTone Works</p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">Three simple steps to healthier, safer skincare.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Built for accuracy and safety, TrueTone helps you identify skin concerns, scan products, and get better recommendations.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { step: "01", title: "Upload & Analyze", desc: "Take a photo of your skin. Our CNN model identifies your skin type, tone, and any conditions." },
                { step: "02", title: "Scan Products", desc: "Photograph product labels. OCR + NLP extracts ingredients and flags harmful substances." },
                { step: "03", title: "Get Recommendations", desc: "Receive safe, personalized product suggestions matched to your unique skin profile." },
              ].map((item) => (
                <div key={item.step} className="rounded-[32px] border border-slate-200 bg-white p-8 text-left shadow-sm">
                  <div className="text-4xl font-semibold text-emerald-800">{item.step}</div>
                  <h3 className="mt-4 text-xl font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="rounded-[36px] bg-emerald-700 px-8 py-14 text-center text-white shadow-2xl shadow-emerald-500/10 sm:px-12">
              <h2 className="text-3xl font-semibold sm:text-4xl">Start Your Skin Journey Today</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-emerald-100">
                Join thousands who trust TrueTone for safer, smarter skincare decisions.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-center">
                <Link to="/auth?signup=true" className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-500/10 hover:bg-slate-100 transition">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a href="#features" className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-8 py-3 text-sm font-semibold text-white hover:bg-white/20 transition">
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 py-10 text-center text-sm text-slate-500">
          © 2026 TrueTone. Smart Skin Analysis and Product Safety System.
        </footer>
      {/* </main> */}
    </div>
  );
};

export default Landing;
