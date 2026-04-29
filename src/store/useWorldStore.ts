import { create } from "zustand";

export type LayerId = "mapboxSatellite" | "aircraft" | "satellites" | "gdelt" | "terrain" | "hud";

const DEFAULT_CAMERA_HEIGHT_METERS = 14_500_000;

export type SelectedEntity = {
  id: string;
  name: string;
  kind: "aircraft" | "satellite" | "terrain" | "gdelt" | "unknown";
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

type FeedChannelStatus = {
  online: boolean;
  count: number;
  latencyMs: number | null;
  updatedAt: string | null;
};

type FeedStatus = {
  aircraft: FeedChannelStatus;
  satellites: FeedChannelStatus;
  gdelt: FeedChannelStatus;
};

type WorldState = {
  activeLayers: Record<LayerId, boolean>;
  selectedEntity: SelectedEntity;
  panels: {
    left: boolean;
    right: boolean;
  };
  globe: GlobeSettings;
  feeds: FeedStatus;
  toggleLayer: (layer: LayerId) => void;
  setLayerActive: (layer: LayerId, active: boolean) => void;
  setSelectedEntity: (entity: SelectedEntity) => void;
  setPanelOpen: (panel: keyof WorldState["panels"], open: boolean) => void;
  updateGlobeSettings: (settings: Partial<GlobeSettings>) => void;
  updateFeedStatus: (feed: keyof FeedStatus, status: Partial<FeedChannelStatus>) => void;
};

export const useWorldStore = create<WorldState>((set) => ({
  activeLayers: {
    mapboxSatellite: true,
    aircraft: true,
    satellites: true,
    gdelt: false,
    terrain: false,
    hud: true,
  },
  selectedEntity: null,
  panels: {
    left: true,
    right: true,
  },
  globe: {
    cameraHeightMeters: DEFAULT_CAMERA_HEIGHT_METERS,
    zoomLevel: 1,
    coordinates: null,
  },
  feeds: {
    aircraft: {
      online: false,
      count: 0,
      latencyMs: null,
      updatedAt: null,
    },
    satellites: {
      online: false,
      count: 0,
      latencyMs: null,
      updatedAt: null,
    },
    gdelt: {
      online: false,
      count: 0,
      latencyMs: null,
      updatedAt: null,
    },
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
    set((state) => {
      const nextGlobe = {
        ...state.globe,
        ...settings,
      };

      if (
        nextGlobe.cameraHeightMeters === state.globe.cameraHeightMeters &&
        nextGlobe.zoomLevel === state.globe.zoomLevel &&
        nextGlobe.coordinates === state.globe.coordinates
      ) {
        return state;
      }

      return { globe: nextGlobe };
    }),
  updateFeedStatus: (feed, status) =>
    set((state) => {
      const nextFeed = {
        ...state.feeds[feed],
        ...status,
      };

      if (
        nextFeed.online === state.feeds[feed].online &&
        nextFeed.count === state.feeds[feed].count &&
        nextFeed.latencyMs === state.feeds[feed].latencyMs &&
        nextFeed.updatedAt === state.feeds[feed].updatedAt
      ) {
        return state;
      }

      return {
        feeds: {
          ...state.feeds,
          [feed]: nextFeed,
        },
      };
    }),
}));
