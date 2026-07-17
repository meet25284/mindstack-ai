'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function IsAuthenticated({ children }) {
    const router = useRouter();
    const [isAuth, setIsAuth] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
        } else {
            setIsAuth(true);
        }
    }, [router]);

    if (!isAuth) return null;

    return <>{children}</>;
}


function LoginPage() {
    const router = useRouter();

    const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
    const [otpSent, setOtpSent] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        otp: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setMessage('');
    };

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch("/api/lwp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email, password: formData.password }),
            });
            const result = await response.json();

            setIsSubmitting(false);

            if (response.status === 200) {
                setFormData({
                    email: "",
                    password: "",
                });
                localStorage.setItem("token", result.token)
                router.push('/chat');

            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
            setIsSubmitting(false);
            setError('An error occurred. Please try again.');
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setMessage('');

        if (!formData.email) {
            setError('Please enter your email');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch("/api/sendotp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email }),
            });
            const result = await response.json();

            setIsSubmitting(false);

            if (response.ok) {
                setOtpSent(true);
                setMessage(result.message);
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
            setIsSubmitting(false);
            setError('An error occurred. Please try again.');
        }


    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!formData.otp) {
            setError('Please enter the OTP');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch("/api/verifyotp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email, otp: formData.otp }),
            });
            const result = await response.json();
            setIsSubmitting(false);
            if (response.ok) {
                setOtpSent(true);
                setMessage(result.message);
                router.push('/chat');
                setFormData({
                    email: "",
                    otp: "",
                });
                localStorage.setItem("token", result.token)
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
            setIsSubmitting(false);
            setError('An error occurred. Please try again.');
        }

    };

    return (
        <IsAuthenticated>
            <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden font-sans text-gray-100">
                {/* Background Ambient Glows */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

                <div className="w-full max-w-md relative z-10">
                    <div className="bg-gray-900/50 border border-gray-800 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl transition-all duration-500 hover:border-gray-700 hover:shadow-indigo-500/10">

                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg shadow-indigo-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mb-2 bg-[length:200%_auto] animate-gradient">
                                Welcome Back
                            </h1>
                            <p className="text-gray-400 text-sm font-medium tracking-wide">
                                Log in to MindStack AI
                            </p>
                        </div>

                        <form
                            onSubmit={loginMethod === 'password' ? handlePasswordLogin : (otpSent ? handleVerifyOtp : handleSendOtp)}
                            className="space-y-5"
                        >
                            {error && (
                                <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg text-center animate-fade-in">
                                    {error}
                                </div>
                            )}
                            {message && (
                                <div className="p-3 text-sm text-green-400 bg-green-900/20 border border-green-900/50 rounded-lg text-center animate-fade-in">
                                    {message}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Email Input */}
                                <div className="relative group" style={{ margin: "2px 10px" }}>
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        className="block w-full px-4 py-3 border border-gray-800 rounded-xl leading-5 bg-gray-900/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 sm:text-sm"
                                        placeholder=" Email Address"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onFocus={() => setFocusedInput('email')}
                                        onBlur={() => setFocusedInput(null)}
                                        disabled={otpSent}
                                    />
                                </div>

                                {/* Password Input */}
                                {loginMethod === 'password' && (
                                    <div className="relative group" style={{ margin: "2px 10px" }}>
                                        <input
                                            type="password"
                                            name="password"
                                            id="password"
                                            className="block w-full px-4 py-3 border border-gray-800 rounded-xl leading-5 bg-gray-900/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 sm:text-sm"
                                            placeholder=" Password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            onFocus={() => setFocusedInput('password')}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </div>
                                )}

                                {/* OTP Input */}
                                {loginMethod === 'otp' && otpSent && (
                                    <div className="relative group" style={{ margin: "2px 10px" }}>
                                        <input
                                            type="text"
                                            name="otp"
                                            id="otp"
                                            className="block w-full px-4 py-3 border border-gray-800 rounded-xl leading-5 bg-gray-900/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 sm:text-sm text-center tracking-widest text-lg"
                                            placeholder=" Enter OTP"
                                            value={formData.otp}
                                            onChange={handleChange}
                                            onFocus={() => setFocusedInput('otp')}
                                            onBlur={() => setFocusedInput(null)}
                                            maxLength={6}
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden mt-2"
                            >
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                                {isSubmitting ? (
                                    <div className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </div>
                                ) : (
                                    loginMethod === 'password' ? 'Log In' : (otpSent ? 'Verify & Log In' : 'Send OTP')
                                )}
                            </button>

                            {/* Toggle Login Method */}
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLoginMethod(loginMethod === 'password' ? 'otp' : 'password');
                                        setOtpSent(false);
                                        setError('');
                                        setMessage('');
                                    }}
                                    className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    {loginMethod === 'password' ? 'Login with OTP instead' : 'Login with Password instead'}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 text-center border-t border-gray-800 pt-6">
                            <p className="text-sm text-gray-400">
                                Don't have an account?{' '}
                                <Link href="/" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Subtle footer */}
                    <div className="mt-8 text-center text-xs text-gray-600">
                        <p>By logging in, you agree to our Terms of Service and Privacy Policy.</p>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}} />
            </div>
        </IsAuthenticated>
    );
}
