import { useState } from "react";
import NavBar from "../../Components/NavBar/NavBar";
import PasswordInput from "../../Components/Inputs/PasswordInput";
import { Link, useNavigate } from "react-router-dom";
import { validateEmail } from "../../Utils/helper";
import axiosInstance from "../../Utils/axiosInstance";
import FullScreenLoader from "../../Components/Loading/FullScreenLoader";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      setError("Please enter your name");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please Create your password");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await axiosInstance.post("/create_acct", {
        fullname: name,
        email,
        password,
      });

      if (res.data?.accessToken) {
        localStorage.setItem("token", res.data.accessToken);
        navigate("/dashboard");
        return;
      }

      navigate("/login");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "An unexpected error occurred. Please try again later";
      setError(msg);
      return;
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      <NavBar />
      {isLoading && <FullScreenLoader message="Creating account..." />}

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-slate-50/50 px-4">
        <div className="w-full max-w-sm border border-slate-200 rounded-2xl bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <h4 className="text-2xl font-semibold text-slate-800">Sign Up</h4>
              <p className="text-sm text-slate-500 mt-1">Create an account to get started</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                className="input-box rounded-lg focus:border-primary/50 transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Email"
                className="input-box rounded-lg focus:border-primary/50 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            
            <button 
              type="submit" 
              className="btn-primary mt-6 h-11 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              Sign Up
            </button>
            
            <p className="text-sm text-center mt-6 text-slate-600">
              Already have an Account?
              <Link
                to="/login"
                className="font-medium text-primary ml-3 hover:underline"
              >
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default SignUp;
