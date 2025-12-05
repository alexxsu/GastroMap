import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface LoginScreenProps {
  onLogin: () => void;
  onGuestLogin: () => void;
  onEmailLogin: (email: string, password: string) => Promise<{ needsVerification: boolean; needsApproval: boolean }>;
  onEmailSignUp: (email: string, password: string, displayName: string) => Promise<void>;
}

type AuthMode = 'initial' | 'signin' | 'signup';

// Wrapper component that handles all the overflow issues robustly
const LoginWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div 
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#111827',
      overflowX: 'hidden',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}
  >
    {/* Background gradient - no blur, no transform, safe positioning */}
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(147, 51, 234, 0.15) 0%, transparent 50%)',
        pointerEvents: 'none',
      }}
    />
    {/* Scrollable content container */}
    <div 
      style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100%',
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 48px 16px',
        overflowX: 'hidden',
      }}
    >
      {children}
    </div>
  </div>
);

// Card component for consistent styling
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div 
    className={`bg-gray-800/80 backdrop-blur rounded-2xl shadow-2xl border border-gray-700 animate-fade-in-up ${className}`}
    style={{
      width: '100%',
      maxWidth: '400px',
      boxSizing: 'border-box',
      padding: '20px',
    }}
  >
    {children}
  </div>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  onGuestLogin, 
  onEmailLogin,
  onEmailSignUp 
}) => {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<AuthMode>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(language === 'zh' ? '请填写所有字段' : 'Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await onEmailLogin(email, password);
    } catch (err: any) {
      setError(err.message || t('loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setError(language === 'zh' ? '请填写所有字段' : 'Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      setError(language === 'zh' ? '密码至少需要6个字符' : 'Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await onEmailSignUp(email, password, displayName);
      setSuccessMessage(language === 'zh' ? '账号创建成功！请查看邮箱验证您的账号。' : 'Account created! Please check your email to verify your account.');
    } catch (err: any) {
      setError(err.message || (language === 'zh' ? '注册失败' : 'Sign up failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
    setSuccessMessage('');
  };

  const goBack = () => {
    resetForm();
    setMode('initial');
  };

  // Initial mode - show main options
  if (mode === 'initial') {
    return (
      <LoginWrapper>
        <Card className="text-center">
          {/* Logo Section */}
          <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="TraceBook Logo" className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-2xl" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 tracking-tight">{t('appName')}</h1>
          <p className="text-gray-400 mb-4 leading-relaxed text-sm">
            {language === 'zh' ? '记录你的美食足迹，与朋友实时分享。' : 'Trace your experiences. Share memories with friends in real-time.'}
          </p>

          {/* Informational Badge */}
          <div className="flex items-center justify-center gap-2 mb-4 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full mx-auto w-fit">
            <span className="text-blue-200 text-xs font-medium tracking-wide">
              {language === 'zh' ? '登录后可发布和编辑体验' : 'Log in to post and edit experiences'}
            </span>
          </div>

          {/* Section 1: Google Sign In */}
          <div className="mb-3">
            <button
              onClick={onLogin}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-black/20 active:scale-95"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="truncate">{language === 'zh' ? '使用 Google 登录' : 'Sign in with Google'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-gray-600"></div>
            <span className="text-gray-500 text-sm flex-shrink-0">{language === 'zh' ? '或' : 'or'}</span>
            <div className="flex-1 h-px bg-gray-600"></div>
          </div>

          {/* Section 2: Email Sign In & Create Account */}
          <div className="space-y-2.5 mb-3">
            <button
              onClick={() => { resetForm(); setMode('signin'); }}
              className="w-full flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-black/20 active:scale-95"
            >
              <Mail size={20} className="flex-shrink-0" />
              <span className="truncate">{language === 'zh' ? '使用邮箱登录' : 'Sign in with Email'}</span>
            </button>

            <button
              onClick={() => { resetForm(); setMode('signup'); }}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-black/20 active:scale-95"
            >
              <User size={20} className="flex-shrink-0" />
              <span className="truncate">{language === 'zh' ? '创建账号' : 'Create Account'}</span>
            </button>
          </div>

          {/* Section 3: Guest Login */}
          <div className="pt-3 border-t border-gray-700">
            {/* Animated "Try Demo" indicator */}
            <div className="flex flex-col items-center mb-2">
              <div className="flex items-center gap-1 text-emerald-400 text-xs animate-bounce">
                <Sparkles size={14} className="flex-shrink-0" />
                <span>{language === 'zh' ? '新用户？先试试看！' : 'New here? Try it first!'}</span>
                <Sparkles size={14} className="flex-shrink-0" />
              </div>
            </div>
            <button
              onClick={onGuestLogin}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-medium py-2.5 px-4 rounded-xl transition"
            >
              <span>{language === 'zh' ? '👀 以访客身份浏览' : '👀 Browse as Guest'}</span>
            </button>
            <p className="text-gray-500 text-xs mt-2 text-center">
              {language === 'zh' ? '无需注册，可查看示例数据' : 'No sign-up needed. View demo data.'}
            </p>
          </div>
        </Card>
      </LoginWrapper>
    );
  }

  // Sign in with email mode
  if (mode === 'signin') {
    return (
      <LoginWrapper>
        <Card>
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
          >
            <ArrowLeft size={18} />
            <span>{language === 'zh' ? '返回' : 'Back'}</span>
          </button>

          <div className="text-center mb-5">
            <h1 className="text-xl font-bold text-white mb-1">{language === 'zh' ? '欢迎回来' : 'Welcome Back'}</h1>
            <p className="text-gray-400 text-sm">{language === 'zh' ? '登录你的账号' : 'Sign in to your account'}</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('email')}</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('password')}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl py-2.5 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                  style={{ fontSize: '16px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-3 px-6 rounded-xl transition shadow-lg shadow-blue-900/20"
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              <span>{isLoading ? (language === 'zh' ? '登录中...' : 'Signing in...') : t('login')}</span>
            </button>
          </form>

          <p className="mt-5 text-center text-gray-400 text-sm">
            {t('noAccount')}{' '}
            <button 
              onClick={() => { resetForm(); setMode('signup'); }}
              className="text-blue-400 hover:text-blue-300 transition"
            >
              {language === 'zh' ? '创建账号' : 'Create one'}
            </button>
          </p>
        </Card>
      </LoginWrapper>
    );
  }

  // Sign up mode
  return (
    <LoginWrapper>
      <Card>
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
        >
          <ArrowLeft size={18} />
          <span>{language === 'zh' ? '返回' : 'Back'}</span>
        </button>

        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-white mb-1">{language === 'zh' ? '创建账号' : 'Create Account'}</h1>
          <p className="text-gray-400 text-xs">{language === 'zh' ? '加入 TraceBook 开始记录你的美食足迹' : 'Join TraceBook to start mapping your experiences'}</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-3 py-2 rounded-xl mb-3 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-3 py-2 rounded-xl mb-3 text-sm">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleEmailSignUp} className="space-y-2.5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('displayName')}</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={language === 'zh' ? '你的名字' : 'Your name'}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('email')}</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('password')}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === 'zh' ? '至少6个字符' : 'At least 6 characters'}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-2.5 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                style={{ fontSize: '16px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 px-3 py-2.5 rounded-xl text-sm text-yellow-200">
            <p className="text-xs">{language === 'zh' ? '注册后：' : 'After signing up:'}</p>
            <ul className="list-disc list-inside mt-1 text-yellow-300/80 text-xs space-y-0.5">
              <li>{language === 'zh' ? '验证你的邮箱地址' : 'Verify your email address'}</li>
              <li>{language === 'zh' ? '等待管理员审核' : 'Wait for admin approval'}</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-3 px-6 rounded-xl transition shadow-lg shadow-blue-900/20"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            <span>{isLoading ? (language === 'zh' ? '创建中...' : 'Creating account...') : (language === 'zh' ? '创建账号' : 'Create Account')}</span>
          </button>
        </form>

        <p className="mt-4 text-center text-gray-400 text-sm">
          {t('hasAccount')}{' '}
          <button 
            onClick={() => { resetForm(); setMode('signin'); }}
            className="text-blue-400 hover:text-blue-300 transition"
          >
            {t('login')}
          </button>
        </p>
      </Card>
    </LoginWrapper>
  );
};
