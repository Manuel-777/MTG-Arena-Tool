export interface MatchCreatedEvent {
    controllerFabricUri:            string;
    matchEndpointHost:              string;
    matchEndpointPort:              number;
    opponentScreenName:             string;
    opponentIsWotc:                 boolean;
    matchId:                        string;
    opponentRankingClass:           string;
    opponentRankingTier:            number;
    opponentMythicPercentile:       number;
    opponentMythicLeaderboardPlace: number;
    eventId:                        string;
    opponentAvatarSelection:        string;
    opponentPetSelection:           string;
    opponentPetModSelections:       string[];
    avatarSelection:                string;
    petSelection:                   string;
    petModSelections:               string[];
    battlefield:                    string;
    opponentCommanderGrpIds:        Array<number>;
    commanderGrpIds:                Array<number>;
}