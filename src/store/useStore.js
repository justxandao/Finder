import { create } from 'zustand';

const regionConfigs = {
  kanto: {
    limitX: 5000,
    limitY: 7000,
    bounds: [[2200, 2500], [7500, 7500]],
    center: [3793, 4098],
    defaultFloor: 7
  },
  johto: {
    limitX: 4075,
    limitY: 31478,
    bounds: [[29300, 1000], [32000, 4600]],
    center: [30667, 2832],
    defaultFloor: 6
  }
};

const useStore = create((set) => ({
  // Auth Session
  session: null,
  setSession: (session) => set({ session }),

  // Region & Map
  currentRegion: 'kanto',
  curFloor: regionConfigs.kanto.defaultFloor,
  regionConfigs,
  
  setRegion: (region) => set((state) => ({ 
    currentRegion: region,
    curFloor: regionConfigs[region].defaultFloor
  })),
  setFloor: (floor) => set({ curFloor: floor }),

  // Radar / Search
  infos: [],
  lastPastedPoint: null,
  curDist: { min: 0, max: 30 },
  curDir: 0,
  
  setInfos: (infos) => set({ infos }),
  setLastPastedPoint: (point) => set({ lastPastedPoint: point }),
  setCurDist: (dist) => set({ curDist: dist }),
  setCurDir: (dir) => set({ curDir: dir }),

  // Settings
  showMapLocations: localStorage.getItem('finderShowLocations') !== 'false',
  labelScopeSetting: localStorage.getItem('finder_setting_label_scope') || 'both',
  labelsOpacitySetting: parseInt(localStorage.getItem('finder_setting_labels_opacity') || '78', 10),
  showCoordsSetting: localStorage.getItem('finder_setting_show_coords') !== 'false',
  showSpawnsSetting: localStorage.getItem('finder_setting_show_spawns') !== 'false',
  isHomeToggleActive: localStorage.getItem('finderHomeToggle') === 'true',
  homePoints: JSON.parse(localStorage.getItem('finderHomePoints')) || { kanto: null, johto: null },

  toggleSetting: (key, value) => set((state) => {
    localStorage.setItem(key, value);
    return { [key]: value };
  }),

  // Registration Filter
  finderLevel: localStorage.getItem('finder_level') || 'E',
  setFinderLevel: (level) => set(() => {
    localStorage.setItem('finder_level', level);
    return { finderLevel: level };
  }),
  
  dungeonType: 'Normal',
  setDungeonType: (type) => set({ dungeonType: type }),

  // Sidebar / UI State
  isSidebarOpen: true,
  isPlacesDrawerOpen: false,
  isSettingsDrawerOpen: false,
  isBiDashboardOpen: false,
  isRegisterModalOpen: false,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setPlacesDrawer: (open) => set({ isPlacesDrawerOpen: open }),
  setSettingsDrawer: (open) => set({ isSettingsDrawerOpen: open }),
  setBiDashboard: (open) => set({ isBiDashboardOpen: open }),
  setRegisterModal: (open) => set({ isRegisterModalOpen: open }),

  // Data
  allLocations: { Kanto: [], Johto: [], "Orange Archipelago": [] },
  allSpawnMarks: { kanto: [], johto: [] },
  
  setLocations: (locs) => set({ allLocations: locs }),
  setSpawns: (spawns) => set({ allSpawnMarks: spawns }),
}));

export default useStore;
