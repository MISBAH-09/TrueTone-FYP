import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 shadow-xl text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Page not found</h1>
        <p className="text-slate-600 mb-8">We couldn’t find the page you were looking for.</p>
        <Link
          to="/"
          className="inline-flex rounded-full bg-green-600 px-6 py-3 text-white hover:bg-green-700 transition"
        >
          Go back to sign in
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
