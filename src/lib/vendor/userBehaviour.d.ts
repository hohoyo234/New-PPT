// Types for the vendored TA3/web-user-behaviour library (userBehaviour.js).

export interface UserBehaviourConfig {
  userInfo?: boolean;
  clicks?: boolean;
  mouseMovement?: boolean;
  mouseMovementInterval?: number;
  mouseScroll?: boolean;
  timeCount?: boolean;
  clearAfterProcess?: boolean;
  processTime?: number | false;
  windowResize?: boolean;
  visibilitychange?: boolean;
  keyboardActivity?: boolean;
  pageNavigation?: boolean;
  formInteractions?: boolean;
  touchEvents?: boolean;
  audioVideoInteraction?: boolean;
  customEventRegistration?: boolean;
  processData?: (results: UserBehaviourResults) => void;
}

export interface UserBehaviourResults {
  userInfo?: {
    windowSize: [number, number];
    appCodeName: string;
    appName: string;
    vendor: string;
    platform: string;
    userAgent: string;
  };
  time: { startTime: number; currentTime: number; stopTime: number };
  clicks: { clickCount: number; clickDetails: Array<[number, number, string, number]> };
  mouseMovements: Array<[number, number, number]>;
  mouseScroll: Array<[number, number, number]>;
  keyboardActivities: Array<[string, number]>;
  navigationHistory: Array<[string, number]>;
  formInteractions: Array<[string, number]>;
  touchEvents: Array<[string, number, number, number]>;
  mediaInteractions: Array<[string, string, number]>;
  windowSizes: Array<[number, number, number]>;
  visibilitychanges: Array<[string, number]>;
}

export interface UserBehaviour {
  showConfig(): UserBehaviourConfig;
  config(ob: UserBehaviourConfig): void;
  start(): void;
  stop(): void;
  showResult(): UserBehaviourResults;
  processResults(): void;
  registerCustomEvent(eventName: string, callback: (e: Event) => void): void;
}

declare const userBehaviour: UserBehaviour;
export default userBehaviour;
