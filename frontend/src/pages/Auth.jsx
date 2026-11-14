import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signupUser, loginUser } from "../services/user";
import TrueToneLogo from "../components/TrueToneLogo";
import AuthFaceScanPanel from "../components/AuthFaceScanPanel";
import { Button, Input, InlineAlert } from "../components/ui";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("signup") === "true");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await signupUser({
          username,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        });

        setIsSignUp(false);
        setError("");
        setPassword("");
        alert("Account created successfully! Please login to continue.");
      } else {
        const data = await loginUser({ username, password });

        if (data.data.onboarding_completed) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Network error. Make sure the backend server is running.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tt-paper)] md:flex-row">
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <TrueToneLogo className="mb-8" />
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tt-ink)] sm:text-3xl">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="mt-2 text-sm text-[var(--tt-secondary)]">
            {isSignUp
              ? "Start your personalized skincare journey."
              : "Sign in to continue your skincare journey."}
          </p>

          {error ? (
            <InlineAlert tone="error" className="mt-6">
              {error}
            </InlineAlert>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />

            {isSignUp && (
              <>
                <Input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
                <Input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </>
            )}

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--tt-radius)] text-[var(--tt-secondary)] hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {isSignUp && (
              <p className="text-xs text-[var(--tt-secondary)]">
                Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
              </p>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between text-sm text-[var(--tt-secondary)]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--tt-border)] text-[var(--tt-primary)] focus:ring-[var(--tt-primary)]"
                  />
                  Remember me
                </label>
                <button type="button" className="font-medium text-[var(--tt-primary)] hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" variant="primary" disabled={loading} className="w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading
                ? isSignUp
                  ? "Creating Account..."
                  : "Signing In..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--tt-secondary)]">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="font-medium text-[var(--tt-primary)] hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>

          <p className="mt-4 text-center text-xs text-[var(--tt-secondary)]">
            <Link to="/" className="hover:text-[var(--tt-ink)] hover:underline">
              Back to TrueTone
            </Link>
          </p>
        </div>
      </div>

      <AuthFaceScanPanel />
    </div>
  );
};

export default Auth;
