import { create } from "zustand";

export type LayerId = "mapboxSatellite" | "aircraft" | "satellites" | "terrain" | "hud";

export type SelectedEntity = {
  id: string;
  name: string;
  kind: "aircraft" | "satellite" | "terrain" | "unknown";
  metadata?: Record<string, string | number | boolean | null>;
} | null;

type Coordinates = {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
};

type GlobeSettings = {
  cameraHeightMeters: number;
  zoomLevel: number;
  coordinates: Coordinates | null;
};

type WorldState = {
  activeLayers: Record<LayerId, boolean>;
  selectedEntity: SelectedEntity;
  panels: {
    left: boolean;
    right: boolean;
  };
  globe: GlobeSettings;
  toggleLayer: (layer: LayerId) => void;
  setLayerActive: (layer: LayerId, active: boolean) => void;
  setSelectedEntity: (entity: SelectedEntity) => void;
  setPanelOpen: (panel: keyof WorldState["panels"], open: boolean) => void;
  updateGlobeSettings: (settings: Partial<GlobeSettings>) => void;
};

export const useWorldStore = create<WorldState>((set) => ({
  activeLayers: {
    mapboxSatellite: true,
    aircraft: true,
    satellites: true,
    terrain: false,
    hud: true,
  },
  selectedEntity: null,
  panels: {
    left: true,
    right: true,
  },
  globe: {
    cameraHeightMeters: 18_500_000,
    zoomLevel: 1,
    coordinates: null,
  },
  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [layer]: !state.activeLayers[layer],
      },
    })),
  setLayerActive: (layer, active) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [layer]: active,
      },
    })),
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  setPanelOpen: (panel, open) =>
    set((state) => ({
      panels: {
        ...state.panels,
        [panel]: open,
      },
    })),
  updateGlobeSettings: (settings) =>
    set((state) => ({
      globe: {
        ...state.globe,
        ...settings,
      },
    })),
}));
