import { useState, useEffect, useCallback, createContext, useContext } from 'react';

export type Language = 'en' | 'zh';

// All translations
const translations = {
  en: {
    // App name & taglines
    appName: 'TraceBook',
    tagline: 'Trace your experiences',
    
    // Common
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    confirm: 'Confirm',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    none: 'None',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    or: 'or',
    and: 'and',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    
    // Auth & Login
    login: 'Log In',
    logout: 'Log Out',
    loginWithGoogle: 'Sign in with Google',
    loginWithEmail: 'Sign in with Email',
    guestMode: 'Try as Guest',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    displayName: 'Display Name',
    forgotPassword: 'Forgot Password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    welcomeTitle: 'Welcome to TraceBook',
    welcomeSubtitle: 'Your personal food journey tracker',
    welcomeBack: 'Welcome Back',
    signInToAccount: 'Sign in to your account',
    createAccount: 'Create Account',
    createOne: 'Create one',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    creatingAccount: 'Creating account...',
    loginPrompt: 'Log in to post and edit experiences',
    continueAsGuest: 'Continue as guest to view',
    joinTraceBook: 'Join TraceBook to start mapping your experiences',
    afterSignUp: 'After signing up:',
    verifyEmail: 'Verify your email address',
    waitForApproval: 'Wait for admin approval',
    atLeast6Chars: 'At least 6 characters',
    yourName: 'Your name',
    fillAllFields: 'Please fill in all fields',
    passwordMinLength: 'Password must be at least 6 characters',
    accountCreatedVerify: 'Account created! Please check your email to verify your account.',
    
    // User Profile
    viewProfile: 'View your profile',
    editProfile: 'Edit Profile',
    viewHistory: 'History',
    user: 'User',
    admin: 'Admin',
    saving: 'Saving...',
    saveChanges: 'Save Changes',
    anonymousUser: 'Anonymous User',
    selectImageFile: 'Please select an image file',
    imageSizeLimit: 'Image must be less than 5MB',
    
    // Side Menu
    mapManagement: 'Map Management',
    manageMaps: 'Manage your maps',
    statistics: 'Statistics',
    viewStats: 'View your stats',
    about: 'About',
    howItWorks: 'How TraceBook works',
    siteManagement: 'Site Management',
    manageUsersSettings: 'Manage users & settings',
    closeMenu: 'Close Menu',
    language: 'Language',
    switchLanguage: 'Switch language',
    
    // Language names
    english: 'English',
    chinese: '简体中文',
    
    // Map types
    satellite: 'Satellite',
    roadmap: 'Road',
    darkMode: 'Dark Mode',
    switchToRoad: 'Switch to Road View',
    switchToDark: 'Switch to Dark Mode',
    switchToSatellite: 'Switch to Satellite View',
    zoomToCity: 'Zoom to My City',
    
    // Map Management
    myMaps: 'My Maps',
    sharedMaps: 'Shared Maps',
    joinedMaps: 'Joined Maps',
    createMap: 'Create Map',
    createSharedMap: 'Create Shared Map',
    joinMap: 'Join Map',
    joinSharedMap: 'Join a Shared Map',
    leaveMap: 'Leave Map',
    shareCode: 'Share Code',
    enterShareCode: 'Enter share code',
    mapName: 'Map Name',
    members: 'Members',
    owner: 'Owner',
    member: 'Member',
    defaultMap: 'Default',
    privateMap: 'Private',
    maxMapsReached: 'Maximum maps reached',
    shared: 'Shared',
    private: 'Private',
    you: 'You',
    mapSettings: 'Map Settings',
    deleteMap: 'Delete Map',
    kickMember: 'Remove Member',
    copied: 'Copied!',
    copyCode: 'Copy Code',
    joinWithCode: 'Join with Code',
    enterCodeToJoin: 'Enter the share code to join a map',
    join: 'Join',
    joining: 'Joining...',
    creating: 'Creating...',
    invalidCode: 'Invalid code. Please try again.',
    alreadyMember: 'You are already a member of this map.',
    mapFull: 'This map has reached its member limit.',
    maxSharedMaps: 'You can only be part of 3 shared maps total.',
    confirmLeaveMap: 'Are you sure you want to leave this map?',
    confirmDeleteMap: 'Are you sure you want to delete this map? All data will be lost.',
    confirmKickMember: 'Are you sure you want to remove this member?',
    noMaps: 'No maps yet',
    createFirstMap: 'Create your first map to get started',
    
    // Restaurants & Visits
    addMemory: 'Add Memory',
    editMemory: 'Edit Memory',
    deleteMemory: 'Delete Memory',
    restaurant: 'Restaurant',
    visitDate: 'Visit Date',
    rating: 'Rating',
    comment: 'Comment',
    comments: 'Comments',
    photos: 'Photos',
    addPhoto: 'Add Photo',
    noPhotos: 'No photos',
    searchRestaurants: 'Search restaurants...',
    searchPlaces: 'Search places...',
    noResults: 'No results found',
    selectLocation: 'Select a location',
    addExperience: 'Add Experience',
    editExperience: 'Edit Experience',
    deleteExperience: 'Delete Experience',
    experience: 'Experience',
    experiences: 'Experiences',
    memory: 'Memory',
    memories: 'Memories',
    writeComment: 'Write a comment...',
    updateComment: 'Update your comments...',
    notes: 'Notes',
    updating: 'Updating...',
    addPhotos: 'Add Photos',
    removePhoto: 'Remove Photo',
    tapToRate: 'Tap to rate',
    selectDate: 'Select date',
    today: 'Today',
    year: 'Year',
    noExperiences: 'No experiences yet',
    addFirstExperience: 'Add your first experience!',
    confirmDeleteExperience: 'Are you sure you want to delete this experience?',
    experienceDeleted: 'Experience deleted',
    experienceSaved: 'Experience saved',
    by: 'by',
    on: 'on',
    at: 'at',
    ratingSystem: 'Rating System',
    
    // Grades/Ratings
    gradeS: 'Outstanding',
    gradeA: 'Excellent', 
    gradeB: 'Good',
    gradeC: 'Average',
    gradeD: 'Below Average',
    gradeE: 'Poor',
    gradeSDesc: 'Exceptional experience, must visit again',
    gradeADesc: 'Great experience, highly recommended',
    gradeBDesc: 'Good experience, worth visiting',
    gradeCDesc: 'Decent experience, nothing special',
    gradeDDesc: 'Disappointing experience',
    gradeEDesc: 'Poor experience, would not recommend',
    
    // Stats
    totalVisits: 'Total Visits',
    totalRestaurants: 'Total Restaurants',
    totalPlaces: 'Total Places',
    averageRating: 'Average Rating',
    topRated: 'Top Rated',
    recentVisits: 'Recent Visits',
    yourStats: 'Your Statistics',
    placesVisited: 'Places Visited',
    totalExperiences: 'Total Experiences',
    ratingDistribution: 'Rating Distribution',
    noData: 'No data yet',
    startAdding: 'Start adding experiences to see your stats',
    
    // Notifications
    notifications: 'Notifications',
    markAllRead: 'Mark all as read',
    noNotifications: 'No notifications',
    memberJoined: 'joined the shared map',
    memberLeft: 'left the shared map',
    memberRemoved: 'You were removed from the shared map',
    postAdded: 'added a memory',
    postDeleted: 'removed a memory',
    accountApproved: 'Your account has been approved',
    welcomeNotification: 'Welcome! Start exploring and adding your food memories.',
    
    // Pending/Approval
    pendingApproval: 'Pending Approval',
    emailNotVerified: 'Email not verified',
    emailVerified: 'Email verified',
    waitingApproval: 'Waiting for admin approval',
    resendVerification: 'Resend Verification Email',
    refreshStatus: 'Refresh Status',
    checkEmail: 'Please check your email and click the verification link.',
    verificationSent: 'Verification email sent!',
    accountPending: 'Your account is pending approval',
    pendingMessage: 'An administrator will review your account shortly. You will receive a notification once approved.',
    
    // Site Management
    userManagement: 'User Management',
    approveRejectUsers: 'Approve, reject, or delete users',
    pendingUsers: 'Pending Approval',
    approvedUsers: 'Approved Users',
    approve: 'Approve',
    reject: 'Reject',
    noPendingUsers: 'No pending users',
    noApprovedUsers: 'No approved users yet',
    totalUsers: 'Total Users',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    joined: 'Joined',
    moreOptionsSoon: 'More options coming soon...',
    failedToLoad: 'Failed to load',
    tryAgain: 'Try Again',
    loadingUsers: 'Loading users...',
    confirmRejectUser: 'Are you sure you want to reject this user? They will not be able to access the app.',
    confirmDeleteUser: 'Are you sure you want to delete this user? This will remove their profile data. Note: To fully remove auth, you\'ll need to delete them from Firebase Console.',
    searchExperiences: 'Search your experiences...',
    selectAll: 'Select All',
    clearAll: 'Clear All',
    
    // Confirmations
    confirmDelete: 'Are you sure you want to delete this?',
    confirmLeave: 'Are you sure you want to leave?',
    confirmLogout: 'Are you sure you want to log out?',
    confirmClearDatabase: 'WARNING: This will delete ALL experiences from the database. This action cannot be undone. Are you sure?',
    
    // Errors
    loginFailed: 'Login failed. Please try again.',
    saveFailed: 'Failed to save. Check your internet connection.',
    loadFailed: 'Failed to load data.',
    locationError: 'Could not access your location. Please check browser permissions.',
    geolocationNotSupported: 'Geolocation is not supported by this browser.',
    somethingWentWrong: 'Something went wrong',
    tryAgainLater: 'Please try again later',
    networkError: 'Network error. Please check your connection.',
    
    // Info/About
    version: 'Version',
    madeWith: 'Made with ❤️',
    aboutTitle: 'About TraceBook',
    aboutDescription: 'TraceBook helps you track and share your food experiences with friends and family.',
    howToUse: 'How to Use',
    step1: 'Search for a restaurant or place',
    step2: 'Add your experience with photos and rating',
    step3: 'Share maps with friends to discover together',
    features: 'Features',
    feature1: 'Track your food journey on a beautiful map',
    feature2: 'Rate and review your experiences',
    feature3: 'Share maps with friends and family',
    feature4: 'View statistics and insights',
    
    // Guest mode
    guestModeTitle: 'Guest Mode',
    guestModeDesc: 'You are viewing a demo. Sign in to save your own memories.',
    guestRestriction: 'Sign in to add experiences',
    
    // Translation
    translate: 'Translate',
    translating: 'Translating...',
    translationFailed: 'Translation failed',
    originalText: 'Original',
    showOriginal: 'Show original',
    
    // Filter
    filterByRating: 'Filter by Rating',
    showAll: 'Show All',
    clearFilter: 'Clear Filter',
    
    // Header
    searchPlaceholder: 'Search...',
    menu: 'Menu',
    
    // Empty states
    noMemoriesYet: 'No memories yet',
    tapPlusToAdd: 'Tap + to add your first memory',
    noSearchResults: 'No results found for your search',
    
    // Time
    justNow: 'Just now',
    minutesAgo: 'minutes ago',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
    weeksAgo: 'weeks ago',
    monthsAgo: 'months ago',
    yearsAgo: 'years ago',
  },
  
  zh: {
    // App name & taglines
    appName: 'TraceBook',
    tagline: '记录你的美食足迹',
    
    // Common
    close: '关闭',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    confirm: '确认',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    search: '搜索',
    filter: '筛选',
    all: '全部',
    none: '无',
    back: '返回',
    next: '下一步',
    done: '完成',
    or: '或',
    and: '和',
    yes: '是',
    no: '否',
    ok: '好的',
    
    // Auth & Login
    login: '登录',
    logout: '退出登录',
    loginWithGoogle: '使用 Google 登录',
    loginWithEmail: '使用邮箱登录',
    guestMode: '游客模式',
    signUp: '注册',
    email: '邮箱',
    password: '密码',
    displayName: '显示名称',
    forgotPassword: '忘记密码？',
    noAccount: '还没有账号？',
    hasAccount: '已有账号？',
    welcomeTitle: '欢迎使用 TraceBook',
    welcomeSubtitle: '你的私人美食旅程记录',
    welcomeBack: '欢迎回来',
    signInToAccount: '登录你的账号',
    createAccount: '创建账号',
    createOne: '创建账号',
    signIn: '登录',
    signingIn: '登录中...',
    creatingAccount: '创建中...',
    loginPrompt: '登录后可发布和编辑体验',
    continueAsGuest: '以游客身份浏览',
    joinTraceBook: '加入 TraceBook 开始记录你的美食足迹',
    afterSignUp: '注册后：',
    verifyEmail: '验证你的邮箱地址',
    waitForApproval: '等待管理员审核',
    atLeast6Chars: '至少6个字符',
    yourName: '你的名字',
    fillAllFields: '请填写所有字段',
    passwordMinLength: '密码至少需要6个字符',
    accountCreatedVerify: '账号创建成功！请查看邮箱验证您的账号。',
    
    // User Profile
    viewProfile: '查看个人资料',
    editProfile: '编辑资料',
    viewHistory: '历史记录',
    user: '用户',
    admin: '管理员',
    saving: '保存中...',
    saveChanges: '保存更改',
    anonymousUser: '匿名用户',
    selectImageFile: '请选择图片文件',
    imageSizeLimit: '图片大小不能超过5MB',
    
    // Side Menu
    mapManagement: '地图管理',
    manageMaps: '管理你的地图',
    statistics: '统计数据',
    viewStats: '查看统计',
    about: '关于',
    howItWorks: 'TraceBook 使用指南',
    siteManagement: '站点管理',
    manageUsersSettings: '管理用户和设置',
    closeMenu: '关闭菜单',
    language: '语言',
    switchLanguage: '切换语言',
    
    // Language names
    english: 'English',
    chinese: '简体中文',
    
    // Map types
    satellite: '卫星',
    roadmap: '道路',
    darkMode: '深色模式',
    switchToRoad: '切换到道路视图',
    switchToDark: '切换到深色模式',
    switchToSatellite: '切换到卫星视图',
    zoomToCity: '定位到我的城市',
    
    // Map Management
    myMaps: '我的地图',
    sharedMaps: '共享地图',
    joinedMaps: '已加入地图',
    createMap: '创建地图',
    createSharedMap: '创建共享地图',
    joinMap: '加入地图',
    joinSharedMap: '加入共享地图',
    leaveMap: '离开地图',
    shareCode: '共享码',
    enterShareCode: '输入共享码',
    mapName: '地图名称',
    members: '成员',
    owner: '所有者',
    member: '成员',
    defaultMap: '默认',
    privateMap: '私有',
    maxMapsReached: '已达地图数量上限',
    shared: '共享',
    private: '私有',
    you: '你',
    mapSettings: '地图设置',
    deleteMap: '删除地图',
    kickMember: '移除成员',
    copied: '已复制！',
    copyCode: '复制邀请码',
    joinWithCode: '使用邀请码加入',
    enterCodeToJoin: '输入邀请码加入地图',
    join: '加入',
    joining: '加入中...',
    creating: '创建中...',
    invalidCode: '邀请码无效，请重试。',
    alreadyMember: '你已经是这个地图的成员。',
    mapFull: '这个地图已达成员上限。',
    maxSharedMaps: '你最多只能加入3个共享地图。',
    confirmLeaveMap: '确定要离开这个地图吗？',
    confirmDeleteMap: '确定要删除这个地图吗？所有数据将丢失。',
    confirmKickMember: '确定要移除这个成员吗？',
    noMaps: '暂无地图',
    createFirstMap: '创建你的第一个地图',
    
    // Restaurants & Visits
    addMemory: '添加记忆',
    editMemory: '编辑记忆',
    deleteMemory: '删除记忆',
    restaurant: '餐厅',
    visitDate: '访问日期',
    rating: '评分',
    comment: '评论',
    comments: '评论',
    photos: '照片',
    addPhoto: '添加照片',
    noPhotos: '暂无照片',
    searchRestaurants: '搜索餐厅...',
    searchPlaces: '搜索地点...',
    noResults: '未找到结果',
    selectLocation: '选择位置',
    addExperience: '添加体验',
    editExperience: '编辑体验',
    deleteExperience: '删除体验',
    experience: '体验',
    experiences: '体验',
    memory: '记忆',
    memories: '记忆',
    writeComment: '写下你的感想...',
    updateComment: '更新你的评论...',
    notes: '备注',
    updating: '更新中...',
    addPhotos: '添加照片',
    removePhoto: '移除照片',
    tapToRate: '点击评分',
    selectDate: '选择日期',
    today: '今天',
    year: '年份',
    noExperiences: '暂无体验',
    addFirstExperience: '添加你的第一个体验！',
    confirmDeleteExperience: '确定要删除这个体验吗？',
    experienceDeleted: '体验已删除',
    experienceSaved: '体验已保存',
    by: '由',
    on: '于',
    at: '在',
    ratingSystem: '评分系统',
    
    // Grades/Ratings
    gradeS: '卓越',
    gradeA: '优秀',
    gradeB: '良好',
    gradeC: '一般',
    gradeD: '较差',
    gradeE: '很差',
    gradeSDesc: '非凡体验，必须再来',
    gradeADesc: '很棒的体验，强烈推荐',
    gradeBDesc: '不错的体验，值得一试',
    gradeCDesc: '普通体验，没什么特别',
    gradeDDesc: '令人失望的体验',
    gradeEDesc: '糟糕的体验，不推荐',
    
    // Stats
    totalVisits: '总访问次数',
    totalRestaurants: '餐厅总数',
    totalPlaces: '地点总数',
    averageRating: '平均评分',
    topRated: '最高评分',
    recentVisits: '最近访问',
    yourStats: '你的统计',
    placesVisited: '访问地点',
    totalExperiences: '总体验数',
    ratingDistribution: '评分分布',
    noData: '暂无数据',
    startAdding: '开始添加体验查看统计',
    
    // Notifications
    notifications: '通知',
    markAllRead: '全部标为已读',
    noNotifications: '暂无通知',
    memberJoined: '加入了共享地图',
    memberLeft: '离开了共享地图',
    memberRemoved: '你已被移出共享地图',
    postAdded: '添加了一条记忆',
    postDeleted: '删除了一条记忆',
    accountApproved: '你的账号已获批准',
    welcomeNotification: '欢迎！开始探索并添加你的美食记忆吧。',
    
    // Pending/Approval
    pendingApproval: '等待审核',
    emailNotVerified: '邮箱未验证',
    emailVerified: '邮箱已验证',
    waitingApproval: '等待管理员审核',
    resendVerification: '重新发送验证邮件',
    refreshStatus: '刷新状态',
    checkEmail: '请查看邮箱并点击验证链接。',
    verificationSent: '验证邮件已发送！',
    accountPending: '你的账号正在等待审核',
    pendingMessage: '管理员将尽快审核你的账号。审核通过后你将收到通知。',
    
    // Site Management
    userManagement: '用户管理',
    approveRejectUsers: '审核、拒绝或删除用户',
    pendingUsers: '待审核用户',
    approvedUsers: '已审核用户',
    approve: '通过',
    reject: '拒绝',
    noPendingUsers: '暂无待审核用户',
    noApprovedUsers: '暂无已审核用户',
    totalUsers: '用户总数',
    pending: '待审核',
    approved: '已审核',
    rejected: '已拒绝',
    joined: '加入于',
    moreOptionsSoon: '更多功能即将推出...',
    failedToLoad: '加载失败',
    tryAgain: '重试',
    loadingUsers: '加载用户中...',
    confirmRejectUser: '确定要拒绝此用户吗？他们将无法访问应用。',
    confirmDeleteUser: '确定要删除此用户吗？这将删除其个人资料数据。注意：要完全删除身份验证，您需要在 Firebase 控制台中删除他们。',
    searchExperiences: '搜索你的体验...',
    selectAll: '全选',
    clearAll: '清除',
    
    // Confirmations
    confirmDelete: '确定要删除吗？',
    confirmLeave: '确定要离开吗？',
    confirmLogout: '确定要退出登录吗？',
    confirmClearDatabase: '警告：这将删除数据库中的所有记录。此操作无法撤销。确定要继续吗？',
    
    // Errors
    loginFailed: '登录失败，请重试。',
    saveFailed: '保存失败，请检查网络连接。',
    loadFailed: '加载数据失败。',
    locationError: '无法获取位置信息，请检查浏览器权限。',
    geolocationNotSupported: '此浏览器不支持地理定位。',
    somethingWentWrong: '出了点问题',
    tryAgainLater: '请稍后重试',
    networkError: '网络错误，请检查连接。',
    
    // Info/About
    version: '版本',
    madeWith: '用 ❤️ 制作',
    aboutTitle: '关于 TraceBook',
    aboutDescription: 'TraceBook 帮助你记录和分享与朋友家人的美食体验。',
    howToUse: '使用方法',
    step1: '搜索餐厅或地点',
    step2: '添加体验、照片和评分',
    step3: '与朋友共享地图一起探索',
    features: '功能特点',
    feature1: '在精美地图上记录美食之旅',
    feature2: '为体验评分和写评论',
    feature3: '与朋友家人共享地图',
    feature4: '查看统计和洞察',
    
    // Guest mode
    guestModeTitle: '游客模式',
    guestModeDesc: '你正在浏览演示版。登录后可保存你自己的记忆。',
    guestRestriction: '登录后可添加体验',
    
    // Translation
    translate: '翻译',
    translating: '翻译中...',
    translationFailed: '翻译失败',
    originalText: '原文',
    showOriginal: '显示原文',
    
    // Filter
    filterByRating: '按评分筛选',
    showAll: '显示全部',
    clearFilter: '清除筛选',
    
    // Header
    searchPlaceholder: '搜索...',
    menu: '菜单',
    
    // Empty states
    noMemoriesYet: '暂无记忆',
    tapPlusToAdd: '点击 + 添加你的第一个记忆',
    noSearchResults: '未找到搜索结果',
    
    // Time
    justNow: '刚刚',
    minutesAgo: '分钟前',
    hoursAgo: '小时前',
    daysAgo: '天前',
    weeksAgo: '周前',
    monthsAgo: '个月前',
    yearsAgo: '年前',
  }
};

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

// Create context
export const LanguageContext = createContext<LanguageContextType | null>(null);

// Hook to use language
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Hook for managing language state (used in provider)
export function useLanguageState() {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('app_language');
    if (saved === 'en' || saved === 'zh') {
      return saved;
    }
    // Check browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) {
      return 'zh';
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  }, [language]);

  return {
    language,
    setLanguage,
    t
  };
}

// Translation utility for user content
export async function translateText(text: string, targetLang: 'en' | 'zh'): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  
  try {
    // Using Google Translate API (unofficial endpoint)
    const sourceLang = targetLang === 'en' ? 'zh-CN' : 'en';
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang === 'zh' ? 'zh-CN' : 'en'}&dt=t&q=${encodeURIComponent(text)}`
    );
    
    if (!response.ok) throw new Error('Translation failed');
    
    const data = await response.json();
    // The response format is [[["translated text","original text",null,null,10]],null,"en"]
    if (data && data[0]) {
      return data[0].map((item: any[]) => item[0]).join('');
    }
    throw new Error('Invalid response');
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

export { translations };
