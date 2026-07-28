'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [serverError, setServerError] = useState('');

  const validateField = (name, value) => {
    const trimmed = value ? value.trim() : '';
    switch (name) {
      case 'name':
        if (!trimmed) return 'Full name is required';
        if (trimmed.length < 2) return 'Full name must be at least 2 characters';
        return '';
      case 'email':
        if (!trimmed) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    setServerError('');

    if (touched[name]) {
      const errorMsg = validateField(name, value);
      setFieldErrors((prev) => ({ ...prev, [name]: errorMsg }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFocusedInput(null);
    const errorMsg = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const validateForm = () => {
    const errors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
    };

    setFieldErrors(errors);
    setTouched({ name: true, email: true, password: true });

    return !errors.name && !errors.email && !errors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
    };

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setIsSubmitting(false);

      if (result.success) {
        setFormData({ name: "", email: "", password: "" });
        setTouched({ name: false, email: false, password: false });
        router.push('/login');
      } else {
        setServerError(result.message || 'Registration failed');
      }
    } catch (err) {
      setIsSubmitting(false);
      setServerError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden font-sans text-gray-100">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-gray-900/50 border border-gray-800 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl transition-all duration-500 hover:border-gray-700 hover:shadow-indigo-500/10">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg shadow-indigo-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mb-2 bg-[length:200%_auto] animate-gradient">
              MindStack AI
            </h1>
            <p className="text-gray-400 text-sm font-medium tracking-wide">Enterprise RAG Knowledge Assistant</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {serverError && (
              <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg text-center animate-fade-in">
                {serverError}
              </div>
            )}

            <div className="space-y-5">
              {/* Name Input */}
              <div className="relative group">
                <input
                  type="text"
                  name="name"
                  id="name"
                  className={`block w-full px-4 py-3 border rounded-xl leading-5 bg-gray-900/50 text-gray-200 placeholder-gray-500 focus:outline-none transition-all duration-300 sm:text-sm ${
                    touched.name && fieldErrors.name
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/50'
                      : 'border-gray-800 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500'
                  }`}
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={handleBlur}
                />
                {touched.name && fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-400 font-medium pl-1 animate-fade-in">{fieldErrors.name}</p>
                )}
              </div>

              {/* Email Input */}
              <div className="relative group">
                <input
                  type="email"
                  name="email"
                  id="email"
                  className={`block w-full px-4 py-3 border rounded-xl leading-5 bg-gray-900/50 text-gray-200 placeholder-gray-500 focus:outline-none transition-all duration-300 sm:text-sm ${
                    touched.email && fieldErrors.email
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/50'
                      : 'border-gray-800 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500'
                  }`}
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={handleBlur}
                />
                {touched.email && fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-400 font-medium pl-1 animate-fade-in">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="relative group">
                <input
                  type="password"
                  name="password"
                  id="password"
                  className={`block w-full px-4 py-3 border rounded-xl leading-5 bg-gray-900/50 text-gray-200 placeholder-gray-500 focus:outline-none transition-all duration-300 sm:text-sm ${
                    touched.password && fieldErrors.password
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/50'
                      : 'border-gray-800 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500'
                  }`}
                  placeholder="Password (min 8 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={handleBlur}
                />
                {touched.password && fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-400 font-medium pl-1 animate-fade-in">{fieldErrors.password}</p>
                )}
              </div>
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
                  Creating Account...
                </div>
              ) : (
                'Sign Up for MindStack'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                Log in instead
              </Link>
            </p>
          </div>
        </div>

        {/* Subtle footer */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <p>By registering, you agree to our Terms of Service and Privacy Policy.</p>
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
  );
}
