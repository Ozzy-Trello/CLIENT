// src/store/slices/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/app/dto/types';
import { generateId } from '@/app/utils/general';

export const mockUsers: User[] = [
  {
    id: generateId(),
    username: 'admin',
    fullname: 'Admin User',
    email: 'admin@example.com',
    refreshToken: 'mock-refresh-token',
    accessToken: 'mock-access-token',
    avatar: 'https://ui-avatars.com/api/?name=Admin',
    roleName: 'admin'
  },
  {
    id: generateId(),
    username: 'jane_doe',
    fullname: 'Jane Doe',
    email: 'janedoe@example.com',
    refreshToken: 'mock-refresh-token',
    accessToken: 'mock-access-token',
    avatar: 'https://ui-avatars.com/api/?name=Jane+Doe',
    roleName: 'Deal Maker'
  },
  {
    id: generateId(),
    username: 'larry_page',
    fullname: 'Larry Page',
    email: 'larrypage@example.com',
    refreshToken: 'mock-refresh-token',
    accessToken: 'mock-access-token',
    avatar: 'https://ui-avatars.com/api/?name=John Doe',
    roleName: 'Desainer'
  },
];

interface UserState {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  users: [],
  loading: false,
  error: null
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Login a user
    loginUser: (state, action: PayloadAction<{ username: string; password: string, fullname: string, email: string }>) => {
      // In a real app, you'd validate credentials against an API
      // For demo purposes, create a mock user if they don't exist
      const existingUser = state.users.find(user => user.username === action.payload.username);
      
      if (existingUser) {
        state.currentUser = existingUser;
      } else {
        // Create a new user for demo purposes
        const newUser: User = {
          id: generateId(),
          username: action.payload.username,
          fullname: action.payload.fullname, // Using username as fullname for demo
          email: action.payload.email,
          refreshToken: 'mock-refresh-token',
          accessToken: 'mock-access-token',
          avatar: `https://ui-avatars.com/api/?name=${action.payload.username}`,
          roleName: 'user'
        };
        
        state.users.push(newUser);
        state.currentUser = newUser;
      }
      
      state.error = null;
    },
    
    // Logout the current user
    logoutUser: (state) => {
      state.currentUser = null;
    },
    
    // Add a new user
    addUser: (state, action: PayloadAction<Omit<User, 'id'>>) => {
      const newUser: User = {
        ...action.payload,
        id: generateId()
      };
      
      state.users.push(newUser);
    },
    
    // Update user details
    updateUser: (state, action: PayloadAction<Partial<User> & { id: string }>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      
      if (index !== -1) {
        state.users[index] = { ...state.users[index], ...action.payload };
        
        // If the updated user is the current user, update currentUser as well
        if (state.currentUser && state.currentUser.id === action.payload.id) {
          state.currentUser = { ...state.currentUser, ...action.payload };
        }
      }
    },
    
    // For demo purposes, initialize with mock users
    initializeMockUsers: (state) => {
      if (state.users.length === 0) {
      
        
        state.users = mockUsers;
        state.currentUser = mockUsers[0]; // Set admin as current user by default
      }
    }
  }
});

export const { 
  loginUser, 
  logoutUser, 
  addUser, 
  updateUser, 
  initializeMockUsers 
} = userSlice.actions;

export default userSlice.reducer;