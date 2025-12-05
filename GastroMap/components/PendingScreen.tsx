import React from 'react';
import { Lock, RefreshCw, LogOut, Mail, CheckCircle, Clock, Send } from 'lucide-react';

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-600 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600 rounded-full blur-[100px]"></div>
      </div>
      
      <div className="bg-gray-800/80 backdrop-blur p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 z-10 animate-scale-in">
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-500/20 p-4 rounded-full">
            <Clock size={40} className="text-yellow-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Account Pending</h1>
        <p className="text-gray-400 mb-8 leading-relaxed text-center">
          Please complete the following steps to access your account.
        </p>

        {/* Status Checklist */}
        <div className="space-y-4 mb-8">
          {/* Email Verification Status */}
          <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
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
                <Mail size={24} className="text-yellow-400" />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-medium ${emailVerified ? 'text-green-300' : 'text-yellow-300'}`}>
                Email Verification
              </p>
              <p className={`text-sm ${emailVerified ? 'text-green-400/70' : 'text-yellow-400/70'}`}>
                {emailVerified ? 'Verified ✓' : 'Check your inbox for verification email'}
              </p>
            </div>
            {!emailVerified && (
              <button
                onClick={handleResendVerification}
                disabled={resendCooldown > 0}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={12} />
                {resendCooldown > 0 ? `${resendCooldown}s` : 'Resend'}
              </button>
            )}
          </div>

          {/* Admin Approval Status */}
          <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
            adminApproved 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}>
            <div className={`p-2 rounded-full ${
              adminApproved ? 'bg-green-500/20' : 'bg-yellow-500/20'
            }`}>
              {adminApproved ? (
                <CheckCircle size={24} className="text-green-400" />
              ) : (
                <Lock size={24} className="text-yellow-400" />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-medium ${adminApproved ? 'text-green-300' : 'text-yellow-300'}`}>
                Admin Approval
              </p>
              <p className={`text-sm ${adminApproved ? 'text-green-400/70' : 'text-yellow-400/70'}`}>
                {adminApproved ? 'Approved ✓' : 'Waiting for administrator approval'}
              </p>
            </div>
          </div>
        </div>

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
            {isCheckingStatus ? 'Checking...' : 'Check Status'}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3 px-6 rounded-xl transition"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
