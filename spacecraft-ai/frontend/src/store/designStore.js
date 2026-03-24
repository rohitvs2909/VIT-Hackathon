import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Design wizard store - NEW IMAGE-BASED WORKFLOW
export const useDesignStore = create((set) => ({
  // Uploaded image
  uploadedImage: null,
  imageId: null,
  setUploadedImage: (image) => set({
    uploadedImage: image,
    imageId: image?.id || null,
  }),

  // Room type
  roomType: 'living room',
  setRoomType: (roomType) => set({ roomType }),

  // Style selection
  style: 'modern',
  setStyle: (style) => set({ style }),

  // Mood selection
  mood: 'calm',
  setMood: (mood) => set({ mood }),

  // Budget
  budget: 'medium',
  customBudget: null,
  setBudget: (budget) => set({ budget }),
  setCustomBudget: (amount) => set({ customBudget: amount }),

  // Priority
  priority: 'aesthetics',
  setPriority: (priority) => set({ priority }),

  // Student mode flag
  isStudentMode: false,
  setStudentMode: (isStudentMode) => set({ isStudentMode }),

  // Generated design result
  generatedDesign: null,
  setGeneratedDesign: (design) => set({ generatedDesign: design }),

  // Generation state
  isGenerating: false,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  generationError: null,
  setGenerationError: (error) => set({ generationError: error }),

  // Wizard step (1-5 for new workflow)
  step: 1,
  setStep: (step) => set({ step }),

  // Reset store
  reset: () => set({
    uploadedImage: null,
    imageId: null,
    roomType: 'living room',
    style: 'modern',
    mood: 'calm',
    budget: 'medium',
    customBudget: null,
    priority: 'aesthetics',
    isStudentMode: false,
    generatedDesign: null,
    isGenerating: false,
    generationError: null,
    step: 1,
  }),

  // Legacy room data (for compatibility)
  roomData: {
    roomType: 'bedroom',
    area: 15,
    length: 4,
    width: 3.75,
    height: 2.8,
    doors: 1,
    windows: 1,
    existingFurniture: [],
    imageUrl: null,
  },
  setRoomData: (data) => set((state) => ({
    roomData: { ...state.roomData, ...data },
  })),

  // Legacy style data (for compatibility)
  styleData: {
    styleId: 'style-modern',
  },
  setStyleData: (data) => set({
    styleData: data,
  }),

  // Legacy budget data (for compatibility)
  budgetData: {
    amount: 25000,
    mood: 'mood-productive',
    priority: 'balanced',
  },
  setBudgetData: (data) => set((state) => ({
    budgetData: { ...state.budgetData, ...data },
  })),

  // Generated plan
  currentPlan: null,
  setCurrentPlan: (plan) => set({
    currentPlan: plan,
  }),

  // Customizations
  customizations: {},
  setCustomizations: (mods) => set((state) => ({
    customizations: { ...state.customizations, ...mods },
  })),
}));

// Projects store
export const useProjectsStore = create(
  persist(
    (set) => ({
      projects: [],
      setProjects: (projects) => set({ projects }),
      addProject: (project) =>
        set((state) => {
          const duplicate = state.projects.some(
            (p) =>
              p.id === project.id ||
              (p.afterImage && project.afterImage && p.afterImage === project.afterImage)
          );

          if (duplicate) {
            return {
              projects: state.projects.map((p) =>
                p.id === project.id ||
                (p.afterImage && project.afterImage && p.afterImage === project.afterImage)
                  ? { ...p, ...project }
                  : p
              )
            };
          }

          return {
            projects: [project, ...state.projects]
          };
        }),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          )
        })),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id)
        }))
    }),
    {
      name: 'spacecraft-projects-store',
      partialize: (state) => ({ projects: state.projects })
    }
  )
);

// UI Store
export const useUIStore = create((set) => ({
  loading: false,
  setLoading: (loading) => set({ loading }),
  
  notification: null,
  setNotification: (notification) => set({ notification }),
  
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
