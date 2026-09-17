import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

const TrueToneLogo = () => (
  <Link to="/" className="flex items-center gap-2 text-white">
    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
      <Leaf className="w-4 h-4 text-white" />
    </div>
    <span className="text-xl font-bold">TrueTone</span>
  </Link>
);

export default TrueToneLogo;
