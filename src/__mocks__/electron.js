/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-env jest */

function getPrimaryDisplayMock() {
  return { bounds: { width: 1920, height: 1080, x: 0, y: 0 } };
}

function getAllDisplaysMock() {
  return [
    {
      bounds: { width: 1920, height: 1080, x: -1920, y: 0 },
      size: { width: 1920, height: 1080 },
    },
    {
      bounds: { width: 1920, height: 1080, x: 0, y: 0 },
      size: { width: 1920, height: 1080 },
    },
  ];
}

module.exports = {
  require: jest.fn(),
  match: jest.fn(),
  app: {
    getPath: () => "src\\assets\\resources",
  },
  remote: {
    app: {
      getVersion: () => "1.0.0",
      getPath: jest.fn(),
    },
    screen: {
      getPrimaryDisplay: getPrimaryDisplayMock,
      getAllDisplays: getAllDisplaysMock,
    },
  },
  screen: {
    getPrimaryDisplay: getPrimaryDisplayMock,
    getAllDisplays: getAllDisplaysMock,
  },
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
  },
  dialog: jest.fn(),
};
