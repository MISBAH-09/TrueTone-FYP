import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  getPasswordRecoveryQuestion,
  loginUser,
  parseApiError,
  RECOVERY_QUESTIONS,
  resetPassword,
  signupUser,
} from "../services/user";
import TrueToneLogo from "../components/TrueToneLogo";
import AuthFaceScanPanel from "../components/AuthFaceScanPanel";
import { Button, Input, InlineAlert } from "../components/ui";

const FieldError = ({ message }) =>
  message ? <p className="mt-1 text-xs font-medium text-[var(--tt-avoid)]">{message}</p> : null;

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("signup") === "true");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [recoveryQuestion, setRecoveryQuestion] = useState("");
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginAsEvaluator, setLoginAsEvaluator] = useState(false);
  const [evaluatorCode, setEvaluatorCode] = useState("");

  const clearErrors = () => {
    setError("");
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    const local = {};
    if (!username.trim()) local.username = ["Username is required."];
    if (!password) local.password = ["Password is required."];
    if (isSignUp) {
      if (!email.trim()) local.email = ["Email is required."];
      if (!recoveryQuestion) local.recovery_question = ["Please choose a security question."];
      if (!recoveryAnswer.trim()) local.recovery_answer = ["Please enter an answer."];
    }
    if (Object.keys(local).length) {
      setFieldErrors(local);
      setError("Please fill in the required fields.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signupUser({
          username: username.trim(),
          email: email.trim(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          recovery_question: recoveryQuestion,
          recovery_answer: recoveryAnswer,
        });

        setIsSignUp(false);
        clearErrors();
        setSuccess("Account created successfully. Please sign in to continue.");
        setPassword("");
        setRecoveryQuestion("");
        setRecoveryAnswer("");
      } else {
        const data = await loginUser({
          username: username.trim(),
          password,
          login_as_evaluator: loginAsEvaluator,
          evaluator_code: loginAsEvaluator ? evaluatorCode : "",
        });

        if (data.data.role === "evaluator") {
          navigate("/inspector");
        } else if (data.data.onboarding_completed) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      }
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.errors);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setSuccess("");

    if (!username.trim() || !email.trim()) {
      setError("Please enter your username and email.");
      return;
    }

    if (recoveryQuestion && password !== confirmPassword) {
      setError("The new passwords do not match.");
      setFieldErrors({ password: ["The new passwords do not match."] });
      return;
    }

    setLoading(true);
    try {
      if (!recoveryQuestion) {
        const result = await getPasswordRecoveryQuestion({
          username: username.trim(),
          email: email.trim(),
        });
        const question = result.data?.question;
        if (!question) {
          setError("We couldn't verify this account. Please contact support.");
          return;
        }
        setRecoveryQuestion(question);
        return;
      }

      const result = await resetPassword({
        username: username.trim(),
        email: email.trim(),
        recovery_question: recoveryQuestion,
        recovery_answer: recoveryAnswer,
        password,
      });
      setForgotPassword(false);
      setRecoveryQuestion("");
      setRecoveryAnswer("");
      setPassword("");
      setConfirmPassword("");
      setSuccess(result.message || "Password updated. Please sign in.");
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.errors);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setForgotPassword(true);
    setIsSignUp(false);
    setRecoveryQuestion("");
    setRecoveryAnswer("");
    setPassword("");
    setConfirmPassword("");
    clearErrors();
    setSuccess("");
  };

  const handleBackToSignIn = () => {
    setForgotPassword(false);
    setRecoveryQuestion("");
    setRecoveryAnswer("");
    setPassword("");
    setConfirmPassword("");
    clearErrors();
    setSuccess("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tt-paper)] md:flex-row">
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <TrueToneLogo className="mb-8" />
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tt-ink)] sm:text-3xl">
            {forgotPassword ? "Reset your password" : isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="mt-2 text-sm text-[var(--tt-secondary)]">
            {forgotPassword
              ? recoveryQuestion
                ? "Answer your recovery question and choose a new password."
                : "Enter the username and email address associated with your account."
              : isSignUp
              ? "Start your personalized skincare journey."
              : "Sign in to continue your skincare journey."}
          </p>

          {success ? (
            <div className="mt-6 rounded-[var(--tt-radius)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </div>
          ) : null}

          {error ? (
            <InlineAlert tone="error" className="mt-6">
              {error}
            </InlineAlert>
          ) : null}

          {forgotPassword ? (
            <form onSubmit={handleRecoverySubmit} className="mt-6 space-y-3">
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={Boolean(recoveryQuestion)}
              />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={Boolean(recoveryQuestion)}
              />

              {recoveryQuestion ? (
                <>
                  <p className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper-alt)] px-3 py-3 text-sm font-medium text-[var(--tt-ink)]">
                    {RECOVERY_QUESTIONS.find((item) => item.value === recoveryQuestion)?.label}
                  </p>
                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    required
                    autoComplete="off"
                  />
                  <Input
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-[var(--tt-secondary)]">
                    Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
                  </p>
                </>
              ) : null}

              <Button type="submit" variant="primary" disabled={loading} className="w-full">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Please wait..." : recoveryQuestion ? "Update Password" : "Continue"}
              </Button>
              <button
                type="button"
                onClick={handleBackToSignIn}
                className="w-full py-2 text-sm font-medium text-[var(--tt-primary)] hover:underline"
              >
                Back to sign in
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3" noValidate>
            <div>
              <Input
                type="text"
                placeholder="Username *"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={loading}
              />
              <FieldError message={fieldErrors.username?.[0]} />
            </div>

            {isSignUp && (
              <>
                <Input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  disabled={loading}
                />
                <Input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  disabled={loading}
                />
                <div>
                  <Input
                    type="email"
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                  <FieldError message={fieldErrors.email?.[0]} />
                </div>
              </>
            )}

            <div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password *"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  disabled={loading}
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
              <FieldError message={fieldErrors.password?.[0]} />
            </div>

            {isSignUp && (
              <>
                <p className="text-xs text-[var(--tt-secondary)]">
                  Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
                </p>
                <label className="block space-y-1.5 text-sm font-medium text-[var(--tt-ink)]">
                  Password recovery question *
                  <select
                    value={recoveryQuestion}
                    onChange={(e) => setRecoveryQuestion(e.target.value)}
                    required
                    disabled={loading}
                    className="h-[var(--tt-control-h)] w-full rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-3 text-sm font-normal text-[var(--tt-ink)] focus:border-[var(--tt-primary)] focus:outline-none"
                  >
                    <option value="" disabled>Choose a question</option>
                    {RECOVERY_QUESTIONS.map((question) => (
                      <option key={question.value} value={question.value}>{question.label}</option>
                    ))}
                  </select>
                  <FieldError message={fieldErrors.recovery_question?.[0]} />
                </label>
                <label className="block space-y-1.5 text-sm font-medium text-[var(--tt-ink)]">
                  Your answer *
                  <Input
                    type="text"
                    placeholder="Enter a private answer"
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    required
                    autoComplete="off"
                    disabled={loading}
                  />
                  <FieldError message={fieldErrors.recovery_answer?.[0]} />
                </label>
                <p className="text-xs text-[var(--tt-secondary)]">
                  Choose an answer that is hard for others to guess. We store it securely, but recovery questions are less secure than email verification.
                </p>
              </>
            )}

            {!isSignUp && (
              <>
                <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-3 py-2.5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--tt-ink)]">
                    <input
                      type="checkbox"
                      checked={loginAsEvaluator}
                      onChange={(e) => {
                        setLoginAsEvaluator(e.target.checked);
                        if (!e.target.checked) setEvaluatorCode("");
                      }}
                      className="h-4 w-4 rounded border-[var(--tt-border)] accent-[var(--tt-primary)]"
                    />
                    Sign in as an evaluator
                  </label>
                  {loginAsEvaluator ? (
                    <div className="mt-2.5 space-y-1">
                      <Input
                        type="password"
                        placeholder="Enter evaluator access code"
                        value={evaluatorCode}
                        onChange={(e) => setEvaluatorCode(e.target.value)}
                        autoComplete="off"
                      />
                      <p className="text-xs text-[var(--tt-secondary)]">
                        Matching code opens the evaluator panel; otherwise you sign in as a standard user.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-sm text-[var(--tt-secondary)]">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--tt-border)] text-[var(--tt-primary)] focus:ring-[var(--tt-primary)]"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-medium text-[var(--tt-primary)] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
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
          )}

          <p className="mt-6 text-center text-sm text-[var(--tt-secondary)]">
            {forgotPassword ? "" : isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            {!forgotPassword && (
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                clearErrors();
                setSuccess("");
              }}
              className="font-medium text-[var(--tt-primary)] hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
            )}
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
