import {
  Cartesian3,
  Color,
  Credit,
  DynamicAtmosphereLightingType,
  ImageryLayer,
  Math as CesiumMath,
  SkyBox,
  SunLight,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  UrlTemplateImageryProvider,
  Viewer,
  WebMercatorTilingScheme,
} from "cesium";

export const CESIUM_BASE_URL = "/cesium";
export const TARGET_FRAME_RATE = 30;
export const TELEMETRY_UPDATE_INTERVAL_MS = 500;
export const AUTO_ROTATE_INTERVAL_MS = 1000 / TARGET_FRAME_RATE;
export const IDLE_RESUME_DELAY_MS = 4_500;
export const AUTO_ROTATE_RADIANS_PER_SECOND = CesiumMath.toRadians(0.28);
export const AIRCRAFT_REFRESH_INTERVAL_MS = 20_000;
export const SATELLITE_UPDATE_INTERVAL_MS = 8_000;
export const MAX_RENDERED_AIRCRAFT = 150;
export const MAX_RENDERED_SATELLITES = 50;
export const AIRCRAFT_LABEL_HEIGHT_THRESHOLD = 1_250_000;
export const SATELLITE_LABEL_HEIGHT_THRESHOLD = 2_200_000;
export const SATELLITE_TRAIL_ENTITY_ID = "satellite:selected-trail";

export function createMapboxImageryProvider(token: string): UrlTemplateImageryProvider {
  return new UrlTemplateImageryProvider({
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(
      token,
    )}`,
    credit: new Credit("Mapbox Satellite Streets"),
    maximumLevel: 22,
    tilingScheme: new WebMercatorTilingScheme(),
  });
}

export function configureViewer(container: HTMLDivElement): Viewer {
  const viewer = new Viewer(container, {
    animation: false,
    baseLayer: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    vrButton: false,
    skyBox: SkyBox.createEarthSkyBox(),
    shouldAnimate: true,
    targetFrameRate: TARGET_FRAME_RATE,
    useBrowserRecommendedResolution: false,
  });

  viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
  viewer.cesiumWidget.creditContainer.remove();
  viewer.scene.requestRenderMode = true;
  viewer.scene.maximumRenderTimeChange = Number.POSITIVE_INFINITY;
  viewer.scene.backgroundColor = Color.fromCssColorString("#02040a");
  viewer.scene.highDynamicRange = true;
  viewer.scene.sunBloom = true;
  viewer.scene.light = new SunLight({
    color: Color.WHITE,
    intensity: 3.2,
  });

  viewer.scene.atmosphere.dynamicLighting = DynamicAtmosphereLightingType.SUNLIGHT;
  viewer.scene.atmosphere.lightIntensity = 14.0;
  viewer.scene.atmosphere.saturationShift = -0.08;
  viewer.scene.atmosphere.brightnessShift = -0.08;

  const { globe } = viewer.scene;
  globe.baseColor = Color.fromCssColorString("#030812");
  globe.enableLighting = true;
  globe.dynamicAtmosphereLighting = true;
  globe.dynamicAtmosphereLightingFromSun = true;
  globe.showGroundAtmosphere = true;
  globe.atmosphereLightIntensity = 18.0;
  globe.atmosphereSaturationShift = -0.04;
  globe.atmosphereBrightnessShift = -0.08;
  globe.lambertDiffuseMultiplier = 0.82;
  globe.lightingFadeOutDistance = 8_000_000;
  globe.lightingFadeInDistance = 28_000_000;
  globe.nightFadeOutDistance = 1_500_000;
  globe.nightFadeInDistance = 18_000_000;
  globe.maximumScreenSpaceError = 2.0;
  globe.tileCacheSize = 512;
  globe.preloadAncestors = true;
  globe.preloadSiblings = true;

  const skyAtmosphere = viewer.scene.skyAtmosphere;
  if (skyAtmosphere) {
    skyAtmosphere.show = true;
    skyAtmosphere.perFragmentAtmosphere = true;
    skyAtmosphere.atmosphereLightIntensity = 55.0;
    skyAtmosphere.saturationShift = -0.05;
    skyAtmosphere.brightnessShift = -0.04;
  }

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(-48.5, 42.5, 11_800_000),
    orientation: {
      heading: CesiumMath.toRadians(318),
      pitch: CesiumMath.toRadians(-58),
      roll: 0,
    },
  });

  return viewer;
}

export function createMapboxLayer(token: string, show: boolean): ImageryLayer {
  return new ImageryLayer(createMapboxImageryProvider(token), {
    brightness: 0.86,
    contrast: 1.18,
    saturation: 0.92,
    gamma: 0.94,
    dayAlpha: 1.0,
    nightAlpha: 0.22,
    minificationFilter: TextureMinificationFilter.LINEAR,
    magnificationFilter: TextureMagnificationFilter.LINEAR,
    maximumAnisotropy: 16,
    show,
  });
}

export function approximateZoomLevel(cameraHeight: number): number {
  const earthCircumferenceMeters = 40_075_016.686;
  const viewportHeight = Math.max(window.innerHeight, 1);
  const metersPerPixel = Math.max(cameraHeight, 1) / viewportHeight;
  const rawZoom = Math.log2(earthCircumferenceMeters / (256 * metersPerPixel));

  return Math.max(0, Math.min(22, Math.round(rawZoom * 10) / 10));
}
