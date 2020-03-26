import { createSlice } from "@reduxjs/toolkit";
import { LOGIN_AUTH } from "../../shared/constants";

const loginSlice = createSlice({
  name: "login",
  initialState: {
    canLogin: true,
    loginForm: {
      email: "",
      pass: "",
      rememberme: false
    },
    loginState: LOGIN_AUTH
  },
  reducers: {
    setLoginState: (state, action): void => {
      state.loginState = action.payload;
    },
    setLoginPassword: (state, action): void => {
      state.loginForm.pass = action.payload;
    },
    setLoginEmail: (state, action): void => {
      state.loginForm.email = action.payload;
    },
    setLoginRemember: (state, action): void => {
      state.loginForm.rememberme = action.payload;
    },
    setLoginForm: (state, action): void => {
      state.loginForm = action.payload;
    },
    setCanLogin: (state, action): void => {
      state.canLogin = action.payload;
    }
  }
});

export default loginSlice;
