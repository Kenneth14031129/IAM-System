import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

axios.defaults.baseURL = API_BASE_URL;

const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Auth Async Thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/login', { username, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setAuthToken(token);
      return { token, user };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ username, email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/register', { username, email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setAuthToken(token);
      return { token, user };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Registration failed');
    }
  }
);

export const fetchUserPermissions = createAsyncThunk(
  'auth/fetchPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/me/permissions');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch permissions');
    }
  }
);

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token'),
    permissions: [],
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.permissions = [];
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setAuthToken(null);
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Permissions
      .addCase(fetchUserPermissions.fulfilled, (state, action) => {
        state.permissions = action.payload;
      });
  }
});

// Generic CRUD Async Thunks
const createCrudThunks = (entityName) => {
  const endpoint = `/${entityName}`;
  
  return {
    fetchAll: createAsyncThunk(
      `${entityName}/fetchAll`,
      async (_, { rejectWithValue }) => {
        try {
          const response = await axios.get(endpoint);
          return response.data;
        } catch (error) {
          return rejectWithValue(error.response?.data?.error || `Failed to fetch ${entityName}`);
        }
      }
    ),
    
    create: createAsyncThunk(
      `${entityName}/create`,
      async (data, { rejectWithValue }) => {
        try {
          const response = await axios.post(endpoint, data);
          return response.data;
        } catch (error) {
          return rejectWithValue(error.response?.data?.error || `Failed to create ${entityName}`);
        }
      }
    ),
    
    update: createAsyncThunk(
      `${entityName}/update`,
      async ({ id, data }, { rejectWithValue }) => {
        try {
          const response = await axios.put(`${endpoint}/${id}`, data);
          return response.data;
        } catch (error) {
          return rejectWithValue(error.response?.data?.error || `Failed to update ${entityName}`);
        }
      }
    ),
    
    delete: createAsyncThunk(
      `${entityName}/delete`,
      async (id, { rejectWithValue }) => {
        try {
          await axios.delete(`${endpoint}/${id}`);
          return id;
        } catch (error) {
          return rejectWithValue(error.response?.data?.error || `Failed to delete ${entityName}`);
        }
      }
    )
  };
};

// Create CRUD thunks for each entity
export const usersThunks = createCrudThunks('users');
export const groupsThunks = createCrudThunks('groups');
export const rolesThunks = createCrudThunks('roles');
export const modulesThunks = createCrudThunks('modules');
export const permissionsThunks = createCrudThunks('permissions');

// Generic CRUD slice creator
const createCrudSlice = (name, thunks) => {
  return createSlice({
    name,
    initialState: {
      items: [],
      loading: false,
      error: null
    },
    reducers: {
      clearError: (state) => {
        state.error = null;
      }
    },
    extraReducers: (builder) => {
      builder
        // Fetch All
        .addCase(thunks.fetchAll.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunks.fetchAll.fulfilled, (state, action) => {
          state.loading = false;
          state.items = action.payload;
        })
        .addCase(thunks.fetchAll.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
        })
        // Create
        .addCase(thunks.create.fulfilled, (state, action) => {
          state.items.push(action.payload);
        })
        .addCase(thunks.create.rejected, (state, action) => {
          state.error = action.payload;
        })
        // Update
        .addCase(thunks.update.fulfilled, (state, action) => {
          const index = state.items.findIndex(item => item.id === action.payload.id);
          if (index !== -1) {
            state.items[index] = action.payload;
          }
        })
        .addCase(thunks.update.rejected, (state, action) => {
          state.error = action.payload;
        })
        // Delete
        .addCase(thunks.delete.fulfilled, (state, action) => {
          state.items = state.items.filter(item => item.id !== action.payload);
        })
        .addCase(thunks.delete.rejected, (state, action) => {
          state.error = action.payload;
        });
    }
  });
};

// Create slices for each entity
const usersSlice = createCrudSlice('users', usersThunks);
const groupsSlice = createCrudSlice('groups', groupsThunks);
const rolesSlice = createCrudSlice('roles', rolesThunks);
const modulesSlice = createCrudSlice('modules', modulesThunks);
const permissionsSlice = createCrudSlice('permissions', permissionsThunks);

// Relationship thunks
export const assignUserToGroup = createAsyncThunk(
  'relationships/assignUserToGroup',
  async ({ groupId, userId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/groups/${groupId}/users`, { userId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to assign user to group');
    }
  }
);

export const assignRoleToGroup = createAsyncThunk(
  'relationships/assignRoleToGroup',
  async ({ groupId, roleId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/groups/${groupId}/roles`, { roleId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to assign role to group');
    }
  }
);

export const assignPermissionToRole = createAsyncThunk(
  'relationships/assignPermissionToRole',
  async ({ roleId, permissionId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/roles/${roleId}/permissions`, { permissionId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to assign permission to role');
    }
  }
);

export const simulateAction = createAsyncThunk(
  'relationships/simulateAction',
  async ({ module, action }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/simulate-action', { module, action });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Simulation failed');
    }
  }
);

export const getRoleGroups = createAsyncThunk(
  'relationships/getRoleGroups',
  async (roleId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/roles/${roleId}/groups`);
      return { roleId, groups: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch role groups');
    }
  }
);

export const removeRoleFromGroup = createAsyncThunk(
  'relationships/removeRoleFromGroup',
  async ({ groupId, roleId }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`/groups/${groupId}/roles/${roleId}`);
      return { groupId, roleId, message: response.data.message };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove role from group');
    }
  }
);

// Export actions
export const { logout, clearError } = authSlice.actions;
export const clearUsersError = usersSlice.actions.clearError;
export const clearGroupsError = groupsSlice.actions.clearError;
export const clearRolesError = rolesSlice.actions.clearError;
export const clearModulesError = modulesSlice.actions.clearError;
export const clearPermissionsError = permissionsSlice.actions.clearError;

// Initialize token on app start
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

// Configure store
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    users: usersSlice.reducer,
    groups: groupsSlice.reducer,
    roles: rolesSlice.reducer,
    modules: modulesSlice.reducer,
    permissions: permissionsSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']
      }
    })
});