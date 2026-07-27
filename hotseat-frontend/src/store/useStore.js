import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const useStore = create(
  persist(
    (set, get) => ({
      // Persisted auth state (survives page reloads via zustand persist)
      user: null,
      group: null,
      streak: 0,
      lang: 'en',
      
      // Ephemeral server data (fetched fresh each session)
      userGroups: [],
      currentQuestion: null,
      todayAnswered: false, 
      groupAnswers: [],
      
      // UI state
      isLoading: false,
      isFetchingAnswers: false,
      error: null,

      // Actions
      
      setLang: (language) => set({ lang: language }),

      // Direct state setters for socket-driven updates
      setGroup: (groupObj) => set({ group: groupObj }),

      // Context switching
      setActiveGroup: (groupObj) => set({ group: groupObj, todayAnswered: false, groupAnswers: [] }),
      clearActiveGroup: () => set({ group: null, currentQuestion: null, groupAnswers: [] }),

      // Multi-tenant group fetching
      fetchUserGroups: async () => {
        const state = get();
        if (!state.user) return;
        set({ isLoading: true });
        try {
          const res = await fetch(`${SERVER_URL}/api/user-groups/${state.user.id}`);
          if (res.ok) {
            const data = await res.json();
            set({ userGroups: data, isLoading: false });
          }
        } catch (err) {
          console.error("Failed to fetch user groups:", err);
          set({ isLoading: false });
        }
      },

      // Onboarding & account recovery
      joinGroup: async (name, code = null) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${SERVER_URL}/api/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, code })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to connect');
          
          set({
            user: data.user,
            group: data.group, // Auto-enter the room on first join
            isLoading: false
          });
          return true; 
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return false; 
        }
      },

      recoverAccount: async (name, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${SERVER_URL}/api/recover-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Recovery failed');

          set({
            user: data.user,
            userGroups: data.groups,
          group: null,
            isLoading: false
          });
          return true;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      // ── EXISTING USER ADDING GROUPS ──
      joinAdditionalGroup: async (code) => {
        const state = get();
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${SERVER_URL}/api/join-group`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.user.id, code })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          
          await get().fetchUserGroups(); 
          set({ isLoading: false });
          return data.group;
        } catch (err) {
          set({ error: err.message, isLoading: false });
          return null;
        }
      },

      createAdditionalGroup: async (groupName) => {
        const state = get();
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${SERVER_URL}/api/create-group`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.user.id, group_name: groupName })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          
          await get().fetchUserGroups(); 
          set({ isLoading: false });
          return data.group;
        } catch (err) {
          set({ error: err.message, isLoading: false });
          return null;
        }
      },

      // Room-level actions (require an active group)
      fetchTodayQuestion: async () => {
        try {
          const response = await fetch(`${SERVER_URL}/api/daily-question`);
          if (!response.ok) throw new Error('Network error');
          const data = await response.json();
          set({ currentQuestion: data });
          await get().fetchGroupAnswers();
          await get().refreshGroupMembers(); 
        } catch (error) {
          console.error("Failed to fetch question:", error);
        }
      },

      fetchGroupAnswers: async () => {
        const state = get();
        if (!state.currentQuestion || !state.group) return;
        set({ isFetchingAnswers: true });
        try {
          const response = await fetch(`${SERVER_URL}/api/answers/${state.group.id}/${state.currentQuestion.id}`);
          if (response.ok) {
            const data = await response.json();
            const didIAnswer = data.some(ans => ans.user_id === state.user.id);
            set({ groupAnswers: data, todayAnswered: didIAnswer, isFetchingAnswers: false });
          }
        } catch (error) {
          set({ isFetchingAnswers: false });
        }
      },

      submitAnswer: async (answerText) => {
        const state = get();
        try {
          const response = await fetch(`${SERVER_URL}/api/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: state.user.id,
              group_id: state.group.id,
              question_id: state.currentQuestion.id,
              answer_text: answerText
            })
          });
          
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to save to database');
          
          await get().fetchGroupAnswers();
          return true;
        } catch (error) {
          console.error("Submission failed:", error);
          set({ error: error.message });
          return false;
        }
      },

      refreshGroupMembers: async () => {
        const state = get();
        if (!state.group || !state.user) return;
        try {
          const response = await fetch(`${SERVER_URL}/api/group-members/${state.group.id}`);
          if (response.ok) {
            const members = await response.json();
            const isStillInGroup = members.some(m => m.id === state.user.id);
            if (!isStillInGroup) {
              alert("You have been removed from this group.");
              get().clearActiveGroup();
              return;
            }
            set({ group: { ...state.group, members } });
          }
        } catch (err) {}
      },

      leaveGroup: async () => {
        const state = get();
        if (!state.user || !state.group) return;

        try {
          await fetch(`${SERVER_URL}/api/leave-group`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.user.id, group_id: state.group.id })
          });
        } catch (err) {
          console.error("Departure failed:", err);
        }
        
        if (state.userGroups.length <= 1) {
          get().logout();
        } else {
          get().clearActiveGroup();
          get().fetchUserGroups();
        }
      },

      updateGroupName: async (newName) => {
        const state = get();
        if (!state.group) return;
        try {
          const res = await fetch(`${SERVER_URL}/api/update-group`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_id: state.group.id, name: newName })
          });
          if (res.ok) {
            set({ group: { ...state.group, name: newName } });
          }
        } catch (err) {
          console.error('Failed to update group name:', err);
        }
      },
      uploadPfp: async (file) => {
        const state = get();
        const formData = new FormData();
        
        // Multer parses fields in order — text fields must be appended before the file.
        formData.append('user_id', state.user.id);
        formData.append('avatar', file);

        set({ isLoading: true });
        try {
          const response = await fetch(`${SERVER_URL}/api/upload-pfp`, {
            method: 'POST',
            body: formData, 
          });
          if (!response.ok) throw new Error('Upload failed');
          const data = await response.json();
          
          set({
            user: { ...state.user, avatar_url: data.avatar_url },
            isLoading: false
          });
          return true;
        } catch (error) {
          console.error("Failed to upload image:", error);
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => set({ 
        user: null, group: null, userGroups: [], todayAnswered: false, 
        groupAnswers: [], currentQuestion: null, error: null 
      }),
    }),
    {
        name: 'hotseat-storage',
        partialize: (state) => ({
          user: state.user,
          group: state.group,
          streak: state.streak,
          lang: state.lang,
        })
    }
  )
)

export default useStore