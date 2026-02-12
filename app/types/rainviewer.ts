export interface RainViewerFrame {
  time: number;
  path: string;
}

export interface RainViewerMapData {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RainViewerFrame[];
    nowcast: RainViewerFrame[];
  };
}
