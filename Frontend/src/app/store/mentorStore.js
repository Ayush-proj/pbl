import { create } from 'zustand';

export const useMentorStore = create((set, get) => ({
    mentorsCache: {},
    
    setMentor: (mentorId, data) => set(state => ({
        mentorsCache: {
            ...state.mentorsCache,
            [mentorId]: {
                ...state.mentorsCache[mentorId],
                ...data,
                lastUpdated: Date.now()
            }
        }
    })),
    
    getMentor: (mentorId) => get().mentorsCache[mentorId] || null,
    
    clearMentor: (mentorId) => set(state => {
        const { [mentorId]: _, ...rest } = state.mentorsCache;
        return { mentorsCache: rest };
    })
}));