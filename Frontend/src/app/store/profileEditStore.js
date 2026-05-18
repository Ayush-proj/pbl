import { create } from 'zustand';

export const useProfileEditStore = create((set, get) => ({
    isEditing: false,
    editingRole: null,
    
    startEditing: (role) => set({ isEditing: true, editingRole: role }),
    stopEditing: () => set({ isEditing: false, editingRole: null }),
    toggleEditing: (role) => {
        const { isEditing, editingRole } = get();
        if (isEditing && editingRole === role) {
            set({ isEditing: false, editingRole: null });
        } else {
            set({ isEditing: true, editingRole: role });
        }
    },
}));