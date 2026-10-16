import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

interface AuthPageProps {
  onBack: () => void;
}

export default function AuthPage({ onBack }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  
  const [countdown, setCountdown] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email) {
      setErrorMsg("请先输入邮箱地址");
      return;
    }
    setErrorMsg("");
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (response.ok && data.code === 200) {
        setCountdown(60);
      } else {
        setErrorMsg(data.detail || data.message || "发送失败");
      }
    } catch (err: any) {
      setErrorMsg("网络异常，请稍后重试");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isLogin && password !== confirmPassword) {
      setErrorMsg("两次输入的密码不一致");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin 
        ? { email, password } 
        : { email, password, username, verificationCode };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error(`服务器异常 (${response.status})，请稍后重试`);
      }

      if (!response.ok || (data.code && data.code !== 200)) {
        throw new Error(data.detail || data.message || "请求失败，请检查输入");
      }

      // 根据 API 的实际返回结构处理数据
      const token = data.data?.access_token || data.access_token;
      const user = data.data?.user || data.user;
      
      localStorage.setItem("stars:token", token);
      localStorage.setItem("stars:user", JSON.stringify(user));
      
      setIsLoading(false);
      onBack();
      window.location.reload();

    } catch (err: any) {
      setErrorMsg(err.message || "网络错误，请稍后重试");
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50 animate-fade-in h-[100dvh] w-full overflow-y-auto">
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-100 text-gray-800 transition-colors z-10"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="w-full max-w-[420px] px-6 py-12 flex flex-col items-center justify-center relative bg-white sm:rounded-2xl sm:shadow-xl sm:border border-gray-100 mx-4">
        <div className="mb-10 flex flex-col items-center">
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 mb-1 select-none">
            <span className="text-[#e50914]">迹</span>向
          </h1>
          <div className="h-1 w-full bg-[#e50914]" />
        </div>

        <div className="w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 font-sans text-center">
            {isLogin ? "欢迎回来" : "创建您的账号"}
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100 text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">昵称</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#e50914]/50 focus:border-[#e50914] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#e50914]/50 focus:border-[#e50914] transition-colors"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#e50914]/50 focus:border-[#e50914] transition-colors"
                  />
                  <button
                    type="button"
                    disabled={countdown > 0}
                    onClick={handleSendCode}
                    className="px-4 py-3 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg border border-gray-200 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[100px]"
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">密码</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#e50914]/50 focus:border-[#e50914] transition-colors"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">确认密码</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#e50914]/50 focus:border-[#e50914] transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#e50914] hover:bg-[#d40812] text-white font-bold rounded-lg transition-colors mt-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-[#e50914]/20"
            >
              {isLoading ? "请稍候..." : (isLogin ? "登录" : "注册")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[13px] font-semibold text-gray-500">
              {isLogin ? "还没有账号？" : "已经有账号了？"}{" "}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrorMsg("");
                }}
                className="text-[#e50914] hover:underline"
              >
                {isLogin ? "去注册" : "去登录"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
