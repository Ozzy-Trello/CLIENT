import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/app/dto/types';
import { generateId } from '@/app/utils/general';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  loading: false,
  error: null,
};

// Demo user for quick login
const demoUser: User = {
  id: generateId(),
  username: 'demouser',
  fullname: 'Demo User',
  email: 'demo@example.com',
  accessToken: 'fake-access-token',
  refreshToken: 'fake-refresh-token',
  avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=random',
  roleName: 'user',
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.isAuthenticated = true;
      state.currentUser = action.payload;
      state.loading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
    },
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = {
          ...state.currentUser,
          ...action.payload,
        };
      }
    },
  },
});

// Actions
export const { loginStart, loginSuccess, loginFailure, logout, updateUserProfile } = authSlice.actions;

// Thunks (simulating async calls)
export const login = (credentials: { email: string; password: string }) => async (dispatch: any) => {
  try {
    dispatch(loginStart());
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, any credentials will work
    dispatch(loginSuccess(demoUser));
    
    return { success: true };
  } catch (error) {
    dispatch(loginFailure('Invalid credentials'));
    return { success: false, error: 'Invalid credentials' };
  }
};

export const demoLogin = () => async (dispatch: any) => {
  try {
    dispatch(loginStart());
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    dispatch(loginSuccess(demoUser));
    
    return { success: true };
  } catch (error) {
    dispatch(loginFailure('Failed to login as demo user'));
    return { success: false, error: 'Failed to login as demo user' };
  }
};

export default authSlice.reducer;