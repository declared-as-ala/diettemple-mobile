import type { Order } from '../services/ordersService';

export interface User {
  _id: string;
  email?: string;
  phone?: string;
  name?: string;
  photoUri?: string;
  avatar?: string;
  badgePhoto?: string;
  age?: string;
  sexe?: string;
  poids?: string;
  taille?: string;
  objectif?: string;
  level?: 'Intiate' | 'Fighter' | 'Warrior' | 'Champion' | 'Elite';
  plan?: string | null;
  subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'NONE';
  updatedAt?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type VideoSourceType = 'upload' | 'youtube' | 'external';

export interface Exercise {
  _id: string;
  name: string;
  muscleGroup: string;
  reps?: number;
  sets?: number;
  duration?: number;
  restTime?: number;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoSource?: VideoSourceType;
  videoFilePath?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

export type RootStackParamList = {
  Intro: undefined;
  Onboarding: undefined;
  Login: { redirectTo?: 'PremiumHome' | 'UHPreview' | 'UH' } | undefined;
  Signup: undefined;
  GenderVideo: { gender: 'homme' | 'femme' };
  UHPreview: undefined;
  PremiumHome: undefined;
  Subscribe: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { emailOrPhone: string; isPhone: boolean };
  ResetPassword: { emailOrPhone: string; otp: string };
  Home: undefined;
  MainTabs: undefined;
  Favorites: undefined;
  Notifications: undefined;
  ChangePassword: undefined;
  LegalNotices: undefined;
  HelpSupport: undefined;
  EditProfile: { field: 'name' | 'age' | 'sexe' | 'poids' | 'taille' | 'objectif'; currentValue: string };
  Boutique: undefined;
  ProductDetail: { productId: string };
  SearchProducts: undefined;
  FilterProducts: undefined;
  Cart: undefined;
  OrdersList: undefined;
  AddProduct: undefined;
  CheckoutCart: undefined;
  DeliveryAddress: {
    subtotal: number;
    discount: number;
    deliveryFee: number;
    total: number;
    promoCode?: string;
  };
  PaymentSuccess: {
    orderId: string;
    order?: Order; // Optional: pass full order object to avoid API call
  };
  SessionDetail: {
    sessionId: string;
  };
  ExerciseDetail: {
    exerciseId: string;
  };
  WorkoutSession: {
    sessionId: string;
  };
  ExerciseWorkout: {
    sessionId: string;
    workoutSessionId: string;
    exercises: Exercise[];
    currentExerciseIndex: number;
    gymPhoto?: string;
  };
  GymPhotoCapture: {
    sessionId: string;
    workoutSessionId: string;
    exercises: Exercise[];
  };
  WorkoutCompletion: {
    sessionId: string;
    workoutSessionId: string;
    exercises: Exercise[];
    completedExercises: number;
  };
  SessionPreStart: { sessionId: string };
  /** Skip aperçu: sync gym → SessionReels or GymVerification */
  SessionQuickStart: { sessionId: string };
  Warmup: { sessionTemplateId: string };
  GymVerification: { sessionId: string };
  SessionSummary: {
    workoutSessionId: string;
    timeSpentMinutes?: number;
    setsCompleted?: number;
  };
  WeekPlan: { weekNumber?: number };
  RenewRequest: undefined;
  SessionReels: {
    sessionTemplateId: string;
    /** When true, screen restores index / logs / time from AsyncStorage (see activeWorkoutPersistStore). */
    resumeFromStorage?: boolean;
    session: {
      _id: string;
      title: string;
      durationMinutes?: number;
      difficulty?: string;
      items: Array<{
        exerciseId: {
          _id: string;
          name: string;
          muscleGroup?: string;
          equipment?: string;
          videoUrl?: string;
          description?: string;
          videoSource?: VideoSourceType;
        };
        alternatives?: Array<{ _id: string; name: string; muscleGroup?: string; equipment?: string; videoUrl?: string }>;
        sets?: number;
        reps?: string;
        restSeconds?: number;
        order?: number;
      }>;
    };
  };
  Gallery: undefined;
  DayGalleryDetails: { date: string };
  Recettes: undefined;
  MealScan: undefined;
  GymPresenceVerification: undefined;
};

// --- Nutrition / Recipes ---
export interface MealProgress {
  calories: number;
  grams?: number;
  progressPct: number;
  targetCalories?: number;
}

export interface DailyMealsSummary {
  dateKey: string;
  breakfast: MealProgress;
  lunch: MealProgress;
  dinner: MealProgress;
  totalTargetCalories?: number;
}

export interface Recipe {
  _id: string;
  title: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
  tags?: string[];
  videoSource?: 'upload' | 'youtube';
  videoUrl?: string;
  posterUrl?: string;
  preparationTimeMinutes?: number | null;
  preparationTimeLabel?: string | null;
  mealPrepDays?: number[];
  isBatchCookingFriendly?: boolean;
  servings?: number | null;
  storageInstructions?: string | null;
  ingredients?: Array<{
    name: string;
    normalizedName?: string;
    quantity?: number;
    unit?: string;
  }>;
  ingredientMatch?: {
    availableCount: number;
    totalRequired: number;
    missingCount: number;
    missingIngredients: string[];
    matchPercentage: number;
  } | null;
}
