import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface EmailVerificationPageProps {
  token?: string; // Token from URL params
}

const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({ token }) => {
  const { verifyEmail, resendVerification, isLoading } = useAuth();
  const [verificationState, setVerificationState] = useState<'verifying' | 'success' | 'error' | 'resend'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (token) {
      handleVerification(token);
    } else {
      setVerificationState('resend');
    }
  }, [token]);

  const handleVerification = async (verificationToken: string) => {
    try {
      setVerificationState('verifying');
      await verifyEmail(verificationToken);
      setVerificationState('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Email verification failed');
      setVerificationState('error');
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setResendMessage('Please enter your email address');
      return;
    }

    try {
      setResendLoading(true);
      setResendMessage('');
      await resendVerification(email.trim());
      setResendMessage('Verification email sent successfully! Please check your inbox.');
    } catch (error) {
      setResendMessage(error instanceof Error ? error.message : 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const renderVerifyingState = () => (
    <div className="text-center">
      <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
        <svg
          className="animate-spin h-6 w-6 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Verifying your email...
      </h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        Please wait while we verify your email address.
      </p>
    </div>
  );

  const renderSuccessState = () => (
    <div className="text-center">
      <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-6 w-6 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Email Verified Successfully!
      </h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        Your email has been verified. You can now sign in to your account.
      </p>
      <div className="mt-6">
        <a
          href="/login"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Sign In
        </a>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center">
      <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Verification Failed
      </h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        {errorMessage}
      </p>
      <div className="mt-6 space-y-4">
        <button
          onClick={() => setVerificationState('resend')}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Request New Verification Email
        </button>
        <a
          href="/login"
          className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Back to Sign In
        </a>
      </div>
    </div>
  );

  const renderResendState = () => (
    <div className="text-center">
      <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-yellow-100">
        <svg
          className="h-6 w-6 text-yellow-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Verify Your Email
      </h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        Enter your email address to receive a new verification link.
      </p>

      <form className="mt-8 space-y-6" onSubmit={handleResendVerification}>
        {resendMessage && (
          <div className={`rounded-md p-4 ${
            resendMessage.includes('successfully') ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className={`h-5 w-5 ${
                    resendMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  {resendMessage.includes('successfully') ? (
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  ) : (
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  )}
                </svg>
              </div>
              <div className="ml-3">
                <p className={`text-sm ${
                  resendMessage.includes('successfully') ? 'text-green-800' : 'text-red-800'
                }`}>
                  {resendMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Enter your email address"
          />
        </div>

        <div className="space-y-4">
          <button
            type="submit"
            disabled={resendLoading}
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
              resendLoading
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {resendLoading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Sending...
              </div>
            ) : (
              'Send Verification Email'
            )}
          </button>

          <a
            href="/login"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Sign In
          </a>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {verificationState === 'verifying' && renderVerifyingState()}
        {verificationState === 'success' && renderSuccessState()}
        {verificationState === 'error' && renderErrorState()}
        {verificationState === 'resend' && renderResendState()}
      </div>
    </div>
  );
};

export default EmailVerificationPage;
