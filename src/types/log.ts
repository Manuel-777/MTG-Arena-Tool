// Log.BI types
type LogParams =
  | EmotesUsedReport
  | UserDeviceSpecs
  | GameStart
  | GameStop
  | Connected
  | SceneChange;

export interface LogInfo {
  jsonrpc: string;
  method: string;
  params: LogParams;
  id: string;
}

interface LogInfoParams {
  messageName: string;
  humanContext: string;
  transactionId: string;
}

interface Emote {
  emoteName: string;
  emoteMessage: string;
  emoteCount: number;
}

interface EmotesUsedReport extends LogInfoParams {
  messageName: "DuelScene.EmotesUsedReport";
  payloadObject: {
    matchId: string;
    emotes: Emote[];
    sessionId: string;
    playerId: string;
  };
}

interface Resolution {
  width: number;
  height: number;
  validForWindow: boolean;
  validForFullscreen: boolean;
}

interface UserDeviceSpecs extends LogInfoParams {
  messageName: "Client.UserDeviceSpecs";
  payloadObject: {
    graphicsDeviceName: string;
    graphicsDeviceType: string;
    graphicsDeviceVendor: string;
    graphicsDeviceVersion: string;
    graphicsMemorySize: number;
    graphicsMultiThreaded: boolean;
    graphicsShaderLevel: number;
    deviceUniqueIdentifier: string;
    deviceModel: string;
    deviceType: string;
    operatingSystem: string;
    operatingSystemFamily: string;
    processorCount: number;
    processorFrequency: number;
    processorType: string;
    systemMemorySize: number;
    maxTextureSize: number;
    isWindowed: boolean;
    gameResolution: {
      width: number;
      height: number;
    };
    monitorResolution: {
      width: number;
      height: number;
    };
    monitorSupportedResolutions: Resolution[];
    clientSessionId: string;
    sessionId: string;
    playerId: string;
  };
}

interface GameStart extends LogInfoParams {
  messageName: "DuelScene.GameStart";
  payloadObject: {
    playerId: string;
    seatId: number;
    teamId: number;
    gameNumber: number;
    matchId: string;
    eventId: string;
    sessionId: string;
  };
}

interface Connected extends LogInfoParams {
  messageName: "Client.Connected";
  payloadObject: {
    playerId: string;
    screenName: string;
    clientVersion: string;
    clientSessionId: string;
    settings: {
      gameplay: {
        disableEmotes: boolean;
        evergreenKeywordReminders: boolean;
        autoTap: boolean;
        autoOrderTriggeredAbilities: boolean;
        autoChooseReplacementEffects: boolean;
        showPhaseLadder: boolean;
        allPlayModesToggle: boolean;
      };
      graphics: {
        quality: number;
        vSync: number;
        targetFrameRate: number;
        motionBlur: number;
        ambientOcclusion: number;
      };
      audio: {
        master: number;
        music: number;
        effects: number;
        voice: number;
        ambience: number;
        playInBackground: boolean;
      };
      language: {
        language: string;
      };
    };
    sessionId: string;
  };
}

interface GameStop extends LogInfoParams {
  messageName: "DuelScene.GameStop";
  payloadObject: {
    playerId: string;
    seatId: number;
    teamId: number;
    gameNumber: number;
    matchId: string;
    eventId: string;
    startingTeamId: number;
    winningTeamId: number;
    winningType: string;
    winningReason: string;
    mulliganedHands: [{ grpId: number; name: string }[]];
    turnCount: number;
    turnCountInFullControl: number;
    secondsCount: number;
    secondsCountInFullControl: number;
    ropeShownCount: number;
    ropeExpiredCount: number;
    click_bp_pet_count: number;
    change_bp_pet_color_count: number;
    click_opponents_bp_pet_count: number;
    sessionId: string;
  };
}

interface SceneChange extends LogInfoParams {
  messageName: "Client.SceneChange";
  payloadObject: {
    fromSceneName: string;
    toSceneName: string;
    timestamp: string;
    duration: string;
    initiator: string;
    context: string;
    sessionId: string;
    playerId: string;
  };
}

export interface InternalActionLog {
  grpId: number;
  str: string;
  seat: number;
  time: string;
}
