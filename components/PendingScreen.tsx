import React from 'react';
import { RefreshCw, LogOut, Mail, CheckCircle, Clock, Send, Sparkles } from 'lucide-react';

interface PendingScreenProps {
  isCheckingStatus: boolean;
  emailVerified: boolean;
  adminApproved: boolean;
  onRefreshStatus: () => void;
  onResendVerification: () => void;
  onLogout: () => void;
}

export const PendingScreen: React.FC<PendingScreenProps> = ({
  isCheckingStatus,
  emailVerified,
  adminApproved,
  onRefreshStatus,
  onResendVerification,
  onLogout
}) => {
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    try {
      await onResendVerification();
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      console.error("Error resending verification:", error);
    }
  };

  // If admin already approved (manual override), show different message
  const isManuallyApproved = adminApproved && !emailVerified;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-600 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600 rounded-full blur-[100px]"></div>
      </div>
      
      <div className="bg-gray-800/80 backdrop-blur p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 z-10 animate-scale-in">
        {isManuallyApproved ? (
          // Admin manually approved - user can proceed
          <>
            <div className="flex justify-center mb-6">
              <div className="bg-green-500/20 p-4 rounded-full">
                <Sparkles size={40} className="text-green-500" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2 text-center">Account Approved!</h1>
            <p className="text-gray-400 mb-6 leading-relaxed text-center">
              Your account has been manually approved by an administrator. You're all set!
            </p>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-green-400" />
                <div>
                  <p className="text-green-300 font-medium">Admin Approved</p>
                  <p className="text-sm text-green-400/70">You can now access all features</p>
                </div>
              </div>
            </div>

            <button
              onClick={onRefreshStatus}
              disabled={isCheckingStatus}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-semibold py-3 px-6 rounded-xl transition"
            >
              {isCheckingStatus ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} />
              )}
              {isCheckingStatus ? 'Loading...' : 'Continue to App'}
            </button>
          </>
        ) : (
          // Normal flow - waiting for email verification
          <>
            <div className="flex justify-center mb-6">
              <div className="bg-yellow-500/20 p-4 rounded-full">
                <Mail size={40} className="text-yellow-500" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2 text-center">Verify Your Email</h1>
            <p className="text-gray-400 mb-6 leading-relaxed text-center">
              We've sent a verification link to your email. Click the link to activate your account.
            </p>

            {/* Email Verification Status */}
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all mb-6 ${
              emailVerified 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <div className={`p-2 rounded-full ${
                emailVerified ? 'bg-green-500/20' : 'bg-yellow-500/20'
              }`}>
                {emailVerified ? (
                  <CheckCircle size={24} className="text-green-400" />
                ) : (
                  <Clock size={24} className="text-yellow-400" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${emailVerified ? 'text-green-300' : 'text-yellow-300'}`}>
                  {emailVerified ? 'Email Verified!' : 'Waiting for Verification'}
                </p>
                <p className={`text-sm ${emailVerified ? 'text-green-400/70' : 'text-yellow-400/70'}`}>
                  {emailVerified 
                    ? 'Your account is now active' 
                    : 'Check your inbox and spam folder'}
                </p>
              </div>
            </div>

            {!emailVerified && (
              <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-400 text-center mb-3">
                  Didn't receive the email?
                </p>
                <button
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={onRefreshStatus}
                disabled={isCheckingStatus}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-3 px-6 rounded-xl transition"
              >
                {isCheckingStatus ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                {isCheckingStatus ? 'Checking...' : "I've Verified My Email"}
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3 px-6 rounded-xl transition"
              >
                <LogOut size={18} />
                Log Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
