import { createSlice } from "@reduxjs/toolkit";

const rendererSlice = createSlice({
  name: "renderer",
  initialState: {
    archivedCache: {} as Record<string, boolean>,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    backgroundGrpId: 0,
    backgroundImage: "default",
    loading: false,
    noLog: false,
    offline: false,
    patreon: {
      patreon: false,
      patreonTier: -1
    },
    popup: {
      text: "",
      time: 0,
      duration: 0
    },
    shareDialog: {
      open: false,
      url: "",
      type: "",
      data: {},
      id: ""
    },
    subNav: {
      type: -1,
      id: "",
      data: null
    },
    topArtist: "Bedevil by Seb McKinnon",
    topNav: 0,
    updateState: ""
  },
  reducers: {
    setBackgroundColor: (state, action): void => {
      state.backgroundColor = action.payload;
    },
    setBackgroundGrpId: (state, action): void => {
      state.backgroundGrpId = action.payload;
    },
    setBackgroundImage: (state, action): void => {
      state.backgroundImage = action.payload;
    },
    setLoading: (state, action): void => {
      state.loading = action.payload;
    },
    setNoLog: (state, action): void => {
      state.noLog = action.payload;
    },
    setOffline: (state, action): void => {
      state.offline = action.payload;
    },
    setPatreon: (state, action): void => {
      state.patreon = action.payload;
    },
    setPopup: (state, action): void => {
      state.popup = action.payload;
    },
    setShareDialog: (state, action): void => {
      state.shareDialog = action.payload;
      state.shareDialog.open = true;
    },
    setShareDialogOpen: (state, action): void => {
      state.shareDialog.open = action.payload;
    },
    setShareDialogUrl: (state, action): void => {
      state.shareDialog.url = action.payload;
    },
    setSubNav: (state, action): void => {
      state.subNav = action.payload;
    },
    setTopArtist: (state, action): void => {
      state.topArtist = action.payload;
    },
    setTopNav: (state, action): void => {
      state.topNav = action.payload;
    },
    setUpdateState: (state, action): void => {
      state.updateState = action.payload;
    },
    setArchived: (state, action): void => {
      const { id, archived } = action.payload;
      if (!id) return;
      // update local cache (avoids round trip)
      state.archivedCache[id] = !!archived;
    }
  }
});

export default rendererSlice;
